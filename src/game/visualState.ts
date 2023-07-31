import { DEFAULT_FONT } from '@/gameRender/canvasUtils';

import {
  CellCoordinates,
  CellPosition,
  CellRect,
  ChunkId,
  CompleteFacilityType,
  FacilityType,
  GameState,
  Point,
  Size,
  ViewportState,
} from './types';
import {
  CITY_ACTUAL_BORDER_RADIUS,
  INTERACTION_MIN_SCALE,
  MAX_EXPEDITION_DISTANCE_SQUARE,
  MIN_EXPEDITION_DISTANCE_SQUARE,
} from './consts';
import {
  calculateDistanceSquare,
  convertCellToCellId,
  extendArea,
  isSameCellPoints,
  makeEmptyRect,
  newCellPosition,
} from './helpers';
import { tick } from './gameStateTick';
import { ResourceType } from './resources';
import {
  facilitiesConstructionInfo,
  workAreaMap,
} from './facilityConstruction';
import { getChunkByCell, isCellInsideCityBorder } from '@/game/gameState';

export const DEFAULT_CELL_SIZE = 90;

export type VisualState = {
  gameState: GameState;
  ctx: CanvasRenderingContext2D;
  canvas: {
    size: Size;
    halfSize: Size;
    pixelRatio: number;
    isActive: boolean;
  };
  cellSize: Size;
  offset: Point;
  viewportCenter: CellCoordinates;
  scale: number;
  viewportBounds: CellRect;
  viewportBoundsForCities: CellRect;
  viewportChunksIds: Set<ChunkId>;
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

export type CanvasParams = {
  width: number;
  height: number;
  pixelRatio: number;
};

export function createVisualState(
  gameState: GameState,
  ctx: CanvasRenderingContext2D,
  canvasParams: CanvasParams,
  onUpdate: () => void,
): VisualState {
  ctx.font = DEFAULT_FONT;

  const visualState: VisualState = {
    gameState,
    ctx,
    canvas: {
      size: { width: 0, height: 0 },
      halfSize: { width: 0, height: 0 },
      pixelRatio: 1,
      isActive: false,
    },
    cellSize: { width: DEFAULT_CELL_SIZE, height: DEFAULT_CELL_SIZE },
    offset: { x: 0, y: 0 },
    viewportCenter: { i: 0, j: 0 },
    scale: 1,
    viewportBounds: makeEmptyRect(),
    viewportBoundsForCities: makeEmptyRect(),
    viewportChunksIds: new Set(),
    pointerScreenPosition: undefined,
    hoverCell: undefined,
    interactiveAction: undefined,
    onUpdate,
  };

  visualStateOnResize(visualState, canvasParams);
  actualizeViewportBounds(visualState);

  return visualState;
}

export function visualStateOnResize(
  visualState: VisualState,
  canvasParams: CanvasParams,
): void {
  const { width, height, pixelRatio } = canvasParams;
  const { canvas, ctx } = visualState;

  ctx.font = DEFAULT_FONT;

  canvas.size.width = width;
  canvas.size.height = height;
  canvas.halfSize.width = Math.floor(width / 2);
  canvas.halfSize.height = Math.floor(height / 2);
  canvas.pixelRatio = pixelRatio;

  actualizeViewportBounds(visualState);
}

function actualizeViewportBounds(visualState: VisualState): void {
  const { cellSize, canvas, viewportCenter, gameState } = visualState;

  const cellsHorizontaly = canvas.halfSize.width / cellSize.width;
  const cellsVerticaly = canvas.halfSize.height / cellSize.height;

  const start = {
    i: Math.floor(viewportCenter.i + 0.5 - cellsHorizontaly),
    j: Math.floor(viewportCenter.j + 0.5 - cellsVerticaly),
  };

  const end = {
    i: Math.ceil(viewportCenter.i - 0.5 + cellsHorizontaly),
    j: Math.ceil(viewportCenter.j - 0.5 + cellsVerticaly),
  };

  visualState.viewportBounds = {
    start,
    end,
  };

  visualState.viewportBoundsForCities = extendArea(
    visualState.viewportBounds,
    CITY_ACTUAL_BORDER_RADIUS,
  );

  const { worldParams } = gameState;

  const topLeftChunk = getChunkByCell(worldParams, start);
  const bottomRightChunk = getChunkByCell(worldParams, end);

  visualState.viewportChunksIds.clear();

  for (
    let j = topLeftChunk.j;
    j <= bottomRightChunk.j;
    j += worldParams.chunkSize
  ) {
    for (
      let i = topLeftChunk.i;
      i <= bottomRightChunk.i;
      i += worldParams.chunkSize
    ) {
      visualState.viewportChunksIds.add(
        convertCellToCellId({ i, j }) as number as ChunkId,
      );
    }
  }
}

export function lookupGridByPoint(
  visualState: VisualState,
  point: Point,
): CellPosition | undefined {
  const { canvas, offset } = visualState;
  const { x, y } = point;

  if (x < 0 || x >= canvas.size.width || y < 0 || y >= canvas.size.height) {
    return undefined;
  }

  const { cellSize } = visualState;

  const canvasX = x - offset.x - canvas.halfSize.width + cellSize.width / 2;
  const canvasY = y - offset.y - canvas.halfSize.height + cellSize.height / 2;

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

export function visualStateSetCanvasActive(
  visualState: VisualState,
  isActive: boolean,
): void {
  if (visualState.canvas.isActive !== isActive) {
    visualState.canvas.isActive = isActive;
    visualState.onUpdate();
  }
}

function actualizeHoverCell(visualState: VisualState): void {
  const { canvas, pointerScreenPosition, scale } = visualState;

  if (
    !pointerScreenPosition ||
    !canvas.isActive ||
    scale < INTERACTION_MIN_SCALE
  ) {
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
  updateScale(visualState, viewportState.scale);
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
    scale: visualState.scale,
  };
}

export function updateScale(visualState: VisualState, scale: number): void {
  const prevScale = visualState.scale;

  visualState.scale = scale;

  visualState.cellSize.width = DEFAULT_CELL_SIZE * scale;
  visualState.cellSize.height = DEFAULT_CELL_SIZE * scale;

  const cursor = visualState.pointerScreenPosition;

  if (cursor) {
    const { canvas, cellSize, viewportCenter } = visualState;

    const px = (cursor.x - canvas.halfSize.width) / cellSize.width;
    const py = (cursor.y - canvas.halfSize.height) / cellSize.height;

    const inv = (scale - prevScale) / prevScale;

    updateViewportCenter(visualState, {
      i: viewportCenter.i + px * inv,
      j: viewportCenter.j + py * inv,
    });
  }
}

export function visualStateUpdateScale(
  visualState: VisualState,
  scale: number,
): void {
  updateScale(visualState, scale);

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
          let isInsideSomeCity = false;

          for (const city of gameState.cities.values()) {
            if (isCellInsideCityBorder(city.position, cell)) {
              isInsideSomeCity = true;
              break;
            }
          }

          if (!isInsideSomeCity) {
            return false;
          }

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
