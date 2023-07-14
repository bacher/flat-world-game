import { DEFAULT_FONT } from '@/gameRender/canvasUtils';

import {
  CellPosition,
  CellRect,
  CompleteFacilityType,
  FacilityType,
  GameState,
  Point,
  PointTuple,
  Size,
  Structure,
} from './types';
import {
  MAX_EXPEDITION_DISTANCE_SQUARE,
  MIN_EXPEDITION_DISTANCE_SQUARE,
} from './consts';
import {
  calculateDistanceSquare,
  isSameCellPoints,
  newCellPosition,
} from './helpers';
import { tick } from './gameStateTick';
import { ResourceType } from './resources';
import {
  facilitiesConstructionInfo,
  workAreaMap,
} from './facilityConstruction';

export type VisualState = {
  gameState: GameState;
  ctx: CanvasRenderingContext2D;
  canvasSize: Size;
  canvasHalfSize: Size;
  cellSize: Size;
  offset: Point;
  viewportBounds: CellRect;
  hoverCell: CellPosition | undefined;
  interactiveAction: InteractiveAction | undefined;
  onUpdate: () => void;
};

export enum InteractiveActionType {
  CONSTRUCTION_PLANNING,
  CARRIER_PATH_PLANNING,
}

export type InteractiveAction =
  | InteractActionConstructionPlanning
  | InteractActionCarrierPlanning;

export type InteractActionConstructionPlanning = {
  actionType: InteractiveActionType.CONSTRUCTION_PLANNING;
  facilityType: CompleteFacilityType;
};

export type InteractActionCarrierPlanning = {
  actionType: InteractiveActionType.CARRIER_PATH_PLANNING;
  direction: 'from' | 'to';
  cell: CellPosition;
  resourceType: ResourceType;
};

export function createVisualState(
  gameState: GameState,
  ctx: CanvasRenderingContext2D,
  onUpdate: () => void,
): VisualState {
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;

  ctx.font = DEFAULT_FONT;

  const halfWidth = Math.floor(canvasWidth / 2);
  const halfHeight = Math.floor(canvasHeight / 2);

  const visualState: VisualState = {
    gameState,
    ctx,
    canvasSize: { width: canvasWidth, height: canvasHeight },
    canvasHalfSize: { width: halfWidth, height: halfHeight },
    cellSize: { width: 90, height: 90 },
    offset: { x: 0, y: 0 },
    viewportBounds: {
      start: { i: 0, j: 0 },
      end: { i: 0, j: 0 },
    },
    hoverCell: undefined,
    interactiveAction: undefined,
    onUpdate,
  };

  actualizeViewportBounds(visualState);

  return visualState;
}

function actualizeViewportBounds(visualState: VisualState): void {
  const { cellSize, canvasSize, canvasHalfSize, offset } = visualState;

  const offsetX = offset.x + canvasHalfSize.width - cellSize.width / 2;
  const offsetY = offset.y + canvasHalfSize.height - cellSize.height / 2;

  visualState.viewportBounds = {
    start: {
      i: Math.floor(-offsetX / cellSize.width),
      j: Math.floor(-offsetY / cellSize.height),
    },
    end: {
      i: Math.ceil((canvasSize.width - offsetX) / cellSize.width),
      j: Math.ceil((canvasSize.height - offsetY) / cellSize.height),
    },
  };
}

export function lookupGridByPoint(
  visualState: VisualState,
  point: PointTuple,
): CellPosition | undefined {
  const { canvasSize, canvasHalfSize, offset } = visualState;

  const [x, y] = point;

  if (x < 0 || x >= canvasSize.width || y < 0 || y >= canvasSize.height) {
    return undefined;
  }

  const { cellSize } = visualState;

  const canvasX = x - offset.x - canvasHalfSize.width + cellSize.width / 2;
  const canvasY = y - offset.y - canvasHalfSize.height + cellSize.height / 2;

  return newCellPosition({
    i: Math.floor(canvasX / cellSize.width),
    j: Math.floor(canvasY / cellSize.height),
  });
}

export function lookupFacilityByPoint(
  visualState: VisualState,
  point: PointTuple,
): Structure | undefined {
  const cell = lookupGridByPoint(visualState, point);

  if (!cell) {
    return undefined;
  }

  return visualState.gameState.structuresByCellId.get(cell.cellId);
}

export function visualStateOnMouseMove(
  visualState: VisualState,
  point: PointTuple | undefined,
): void {
  if (!point) {
    visualState.hoverCell = undefined;
    visualState.onUpdate();
    return;
  }

  const cell = lookupGridByPoint(visualState, point);

  if (!isSameCellPoints(visualState.hoverCell, cell)) {
    visualState.hoverCell = cell;
    visualState.onUpdate();
  }
}

export function visualStateMove(
  visualState: VisualState,
  point: PointTuple,
): void {
  updateVisualStateOffset(visualState, [
    visualState.offset.x + point[0],
    visualState.offset.y + point[1],
  ]);
}

export function visualStateMoveToCell(
  visualState: VisualState,
  cell: CellPosition,
): void {
  const { cellSize } = visualState;

  updateVisualStateOffset(visualState, [
    -cell.i * cellSize.width,
    -cell.j * cellSize.height,
  ]);
}

function updateVisualStateOffset(
  visualState: VisualState,
  point: PointTuple,
): void {
  visualState.offset.x = point[0];
  visualState.offset.y = point[1];

  actualizeViewportBounds(visualState);
  visualState.onUpdate();
}

export function isSamePoints(
  p1: PointTuple | undefined,
  p2: PointTuple | undefined,
): boolean {
  if (!p1 && !p2) {
    return true;
  }

  if (!p1 || !p2) {
    return false;
  }

  return p1[0] === p2[0] && p1[1] === p2[1];
}

export function startGameLoop(
  visualState: VisualState,
  onTick: () => void,
): () => void {
  const intervalId = window.setInterval(() => {
    tick(visualState.gameState);
    onTick();
  }, 1000);

  return () => {
    window.clearInterval(intervalId);
  };
}

export function isAllowToConstructAtPosition(
  visualState: VisualState,
  cell: CellPosition,
): boolean {
  const { gameState, interactiveAction } = visualState;

  if (gameState.structuresByCellId.has(cell.cellId)) {
    return false;
  }

  if (interactiveAction) {
    switch (interactiveAction.actionType) {
      case InteractiveActionType.CONSTRUCTION_PLANNING: {
        if (interactiveAction.facilityType === FacilityType.CITY) {
          let inExpeditionDistance = false;

          for (const city of gameState.cities.values()) {
            const distance = calculateDistanceSquare(city.position, cell);

            if (distance < MIN_EXPEDITION_DISTANCE_SQUARE) {
              return false;
            }

            if (distance <= MAX_EXPEDITION_DISTANCE_SQUARE) {
              inExpeditionDistance = true;
            }
          }

          return inExpeditionDistance;
        } else {
          const constructionInfo =
            facilitiesConstructionInfo[interactiveAction.facilityType];

          if (constructionInfo.workArea) {
            const workAreaInfo =
              workAreaMap[constructionInfo.workArea.areaType];

            const found = findAroundInRadius(
              cell,
              workAreaInfo.maximumRadius * 2,
              (iterCell) => {
                const structure = gameState.structuresByCellId.get(
                  iterCell.cellId,
                );

                if (!structure || structure.type === FacilityType.CITY) {
                  return undefined;
                }

                const effectiveFacilityType =
                  structure.type === FacilityType.CONSTRUCTION
                    ? structure.buildingFacilityType
                    : structure.type;

                if (
                  structure &&
                  workAreaInfo.facilities.has(effectiveFacilityType)
                ) {
                  const currentConstructionInfo =
                    facilitiesConstructionInfo[effectiveFacilityType];

                  if (
                    isWorkAreasCollides(
                      cell,
                      constructionInfo.workArea!.radius,
                      structure.position,
                      currentConstructionInfo.workArea!.radius,
                    )
                  ) {
                    return true;
                  }
                }
                return undefined;
              },
            );

            if (found) {
              return false;
            }
          }

          return true;
        }
      }
    }
  }

  return false;
}

function isWorkAreasCollides(
  cell1: CellPosition,
  radius1: number,
  cell2: CellPosition,
  radius2: number,
): boolean {
  const di = Math.abs(cell1.i - cell2.i);
  const dj = Math.abs(cell1.j - cell2.j);

  const r = radius1 + radius2 + 1;

  return di < r && dj < r;
}

function findAroundInRadius<T>(
  originCell: CellPosition,
  radius: number,
  callback: (cell: CellPosition) => T | undefined,
): T | undefined {
  for (let i = -radius; i <= radius; i += 1) {
    for (let j = -radius; j <= radius; j += 1) {
      if (!(i === 0 && j === 0)) {
        const iterCell = newCellPosition({
          i: originCell.i + i,
          j: originCell.j + j,
        });

        const found = callback(iterCell);

        if (found) {
          return found;
        }
      }
    }
  }

  return undefined;
}
