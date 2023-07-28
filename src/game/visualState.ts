import { DEFAULT_FONT } from '@/gameRender/canvasUtils';

import {
  CellCoordinates,
  CellPosition,
  CellRect,
  CompleteFacilityType,
  FacilityType,
  GameState,
  Point,
  Size,
  ViewportState,
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
  viewportCenter: CellCoordinates;
  zoom: number;
  viewportBounds: CellRect;
  pointerScreenPosition: Point | undefined;
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

export const DEFAULT_CELL_SIZE = 90;

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
    viewportCenter: { i: 0, j: 0 },
    zoom: 1,
    viewportBounds: {
      start: { i: 0, j: 0 },
      end: { i: 0, j: 0 },
    },
    pointerScreenPosition: undefined,
    hoverCell: undefined,
    interactiveAction: undefined,
    onUpdate,
  };

  actualizeViewportBounds(visualState);

  return visualState;
}

function actualizeViewportBounds(visualState: VisualState): void {
  const { cellSize, canvasHalfSize, viewportCenter } = visualState;

  const cellsHorizontaly = canvasHalfSize.width / cellSize.width;
  const cellsVerticaly = canvasHalfSize.height / cellSize.height;

  visualState.viewportBounds = {
    start: {
      i: Math.floor(viewportCenter.i + 0.5 - cellsHorizontaly),
      j: Math.floor(viewportCenter.j + 0.5 - cellsVerticaly),
    },
    end: {
      i: Math.ceil(viewportCenter.i - 0.5 + cellsHorizontaly),
      j: Math.ceil(viewportCenter.j - 0.5 + cellsVerticaly),
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

export function visualStateOnMouseMove(
  visualState: VisualState,
  point: Point | undefined,
): void {
  visualState.pointerScreenPosition = point;
  actualizeHoverCell(visualState);
}

function actualizeHoverCell(visualState: VisualState): void {
  const { pointerScreenPosition } = visualState;

  if (!pointerScreenPosition) {
    if (visualState.hoverCell) {
      visualState.hoverCell = undefined;
      visualState.onUpdate();
    }
    return;
  }

  const cell = lookupGridByPoint(visualState, pointerScreenPosition);

  if (!isSameCellPoints(visualState.hoverCell, cell)) {
    visualState.hoverCell = cell;
    visualState.onUpdate();
  }
}

export function visualStateMove(
  visualState: VisualState,
  pointerMovement: Point,
): void {
  const { viewportCenter, cellSize } = visualState;

  const di = -pointerMovement.x / cellSize.width;
  const dj = -pointerMovement.y / cellSize.height;

  visualStateUpdateViewportCenter(visualState, {
    i: viewportCenter.i + di,
    j: viewportCenter.j + dj,
  });
}

export function visualStateMoveToCell(
  visualState: VisualState,
  cell: CellPosition,
): void {
  visualStateUpdateViewportCenter(visualState, {
    i: cell.i,
    j: cell.j,
  });
}

function updateViewportCenter(
  visualState: VisualState,
  coordinates: CellCoordinates,
): void {
  visualState.viewportCenter.i = coordinates.i;
  visualState.viewportCenter.j = coordinates.j;

  // TODO: Remove
  visualState.offset.x = -coordinates.i * visualState.cellSize.width;
  visualState.offset.y = -coordinates.j * visualState.cellSize.height;
}

function visualStateUpdateViewportCenter(
  visualState: VisualState,
  point: CellCoordinates,
): void {
  updateViewportCenter(visualState, point);

  actualizeViewportBounds(visualState);
  actualizeHoverCell(visualState);
  visualState.onUpdate();
}

export function visualStateApplyViewportState(
  visualState: VisualState,
  viewportState: ViewportState,
): void {
  updateZoom(visualState, viewportState.zoom);
  updateViewportCenter(visualState, viewportState.center);

  actualizeViewportBounds(visualState);
  actualizeHoverCell(visualState);
  visualState.onUpdate();
}

export function visualStateGetViewportState(
  visualState: VisualState,
): ViewportState {
  return {
    center: visualState.viewportCenter,
    zoom: visualState.zoom,
  };
}

export function updateZoom(visualState: VisualState, zoom: number): void {
  const prevZoom = visualState.zoom;

  visualState.zoom = zoom;

  visualState.cellSize.width = DEFAULT_CELL_SIZE * zoom;
  visualState.cellSize.height = DEFAULT_CELL_SIZE * zoom;

  const cursor = visualState.pointerScreenPosition;

  if (cursor) {
    const { canvasHalfSize, cellSize, viewportCenter } = visualState;

    const px = (cursor.x - canvasHalfSize.width) / cellSize.width;
    const py = (cursor.y - canvasHalfSize.height) / cellSize.height;

    const inv = (zoom - prevZoom) / prevZoom;

    updateViewportCenter(visualState, {
      i: viewportCenter.i + px * inv,
      j: viewportCenter.j + py * inv,
    });
  }
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
