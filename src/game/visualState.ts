import { DEFAULT_FONT } from '@/gameRender/canvasUtils';

import {
  CellPosition,
  CellRect,
  CompleteFacilityType,
  FacilityType,
  GameState,
  Point,
  Size,
  Structure,
  UiState,
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
  zoom: number;
  viewportBounds: CellRect;
  pointerPosition: Point | undefined;
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

const DEFAULT_CELL_SIZE = 90;

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
    cellSize: { width: DEFAULT_CELL_SIZE, height: DEFAULT_CELL_SIZE },
    offset: { x: 0, y: 0 },
    zoom: 1,
    viewportBounds: {
      start: { i: 0, j: 0 },
      end: { i: 0, j: 0 },
    },
    pointerPosition: undefined,
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
  point: Point,
): CellPosition | undefined {
  const { canvasSize, canvasHalfSize, offset } = visualState;
  const { x, y } = point;

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
  point: Point,
): Structure | undefined {
  const cell = lookupGridByPoint(visualState, point);

  if (!cell) {
    return undefined;
  }

  return visualState.gameState.structuresByCellId.get(cell.cellId);
}

export function visualStateOnMouseMove(
  visualState: VisualState,
  point: Point | undefined,
): void {
  visualState.pointerPosition = point;
  actualizeHoverCell(visualState);
}

function actualizeHoverCell(visualState: VisualState): void {
  const { pointerPosition } = visualState;

  if (!pointerPosition) {
    if (visualState.hoverCell) {
      visualState.hoverCell = undefined;
      visualState.onUpdate();
    }
    return;
  }

  const cell = lookupGridByPoint(visualState, pointerPosition);

  if (!isSameCellPoints(visualState.hoverCell, cell)) {
    visualState.hoverCell = cell;
    visualState.onUpdate();
  }
}

export function visualStateMove(visualState: VisualState, point: Point): void {
  visualStateUpdateOffset(visualState, {
    x: visualState.offset.x + point.x,
    y: visualState.offset.y + point.y,
  });
}

export function visualStateMoveToCell(
  visualState: VisualState,
  cell: CellPosition,
): void {
  const { cellSize } = visualState;

  visualStateUpdateOffset(visualState, {
    x: -cell.i * cellSize.width,
    y: -cell.j * cellSize.height,
  });
}

function updateOffset(visualState: VisualState, point: Point): void {
  visualState.offset.x = point.x;
  visualState.offset.y = point.y;
}

function visualStateUpdateOffset(visualState: VisualState, point: Point): void {
  updateOffset(visualState, point);

  actualizeViewportBounds(visualState);
  actualizeHoverCell(visualState);
  visualState.onUpdate();
}

export function visualStateApplyUiState(
  visualState: VisualState,
  uiState: UiState,
): void {
  updateOffset(visualState, uiState.lookAt);
  updateZoom(visualState, uiState.zoom);

  actualizeViewportBounds(visualState);
  actualizeHoverCell(visualState);
  visualState.onUpdate();
}

export function visualStateGetUiState(visualState: VisualState): UiState {
  return {
    lookAt: visualState.offset,
    zoom: visualState.zoom,
  };
}

export function updateZoom(visualState: VisualState, zoom: number): void {
  //  const prevZoom = visualState.zoom;

  visualState.zoom = zoom;

  visualState.cellSize.width = DEFAULT_CELL_SIZE * zoom;
  visualState.cellSize.height = DEFAULT_CELL_SIZE * zoom;

  //  const p = visualState.pointerPosition;
  //
  //  if (p) {
  //    const s = visualState.canvasHalfSize;
  //    const px = p.x - s.width;
  //    const py = p.y - s.height;
  //
  //    const inv = (zoom - prevZoom) / prevZoom;
  //    visualState.offset.x += (px * inv) / visualState.cellSize.width;
  //    visualState.offset.y += (py * inv) / visualState.cellSize.height;
  //  }
}

export function visualStateUpdateZoom(
  visualState: VisualState,
  zoom: number,
): void {
  updateZoom(visualState, zoom);

  actualizeViewportBounds(visualState);
  actualizeHoverCell(visualState);
  visualState.onUpdate();
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
