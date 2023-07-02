import {
  CellPosition,
  CellRect,
  ExactFacilityType,
  FacilityType,
  Point,
  City,
  GameState,
  Structure,
} from './types';
import {
  MAX_EXPEDITION_DISTANCE_SQUARE,
  MIN_EXPEDITION_DISTANCE_SQUARE,
} from './consts';
import { newCellPosition } from './helpers';
import { tick } from './gameStateTick';
import { ResourceType } from './resources';

export type VisualState = {
  gameState: GameState;
  ctx: CanvasRenderingContext2D;
  canvasSize: Point;
  canvasHalfSize: Point;
  cellSize: Point;
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
} & (
  | {
      facilityType: ExactFacilityType;
    }
  | {
      facilityType: FacilityType.CITY;
      expeditionFromCity: City;
    }
);

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

  const halfWidth = Math.floor(canvasWidth / 2);
  const halfHeight = Math.floor(canvasHeight / 2);

  const cellSize: Point = [50, 50];

  const visualState: VisualState = {
    gameState,
    ctx,
    canvasSize: [canvasWidth, canvasHeight],
    canvasHalfSize: [halfWidth, halfHeight],
    cellSize,
    offset: [0, 0],
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
  const [canvasWidth, canvasHeight] = visualState.canvasSize;
  const [halfWidth, halfHeight] = visualState.canvasHalfSize;
  const [cellWidth, cellHeight] = visualState.cellSize;
  const [baseOffsetX, baseOffsetY] = visualState.offset;

  const offsetX = baseOffsetX + halfWidth - cellWidth / 2;
  const offsetY = baseOffsetY + halfHeight - cellHeight / 2;

  visualState.viewportBounds = {
    start: {
      i: Math.floor(-offsetX / cellWidth),
      j: Math.floor(-offsetY / cellHeight),
    },
    end: {
      i: Math.ceil((canvasWidth - offsetX) / cellWidth),
      j: Math.ceil((canvasHeight - offsetY) / cellHeight),
    },
  };
}

export function lookupGridByPoint(
  visualState: VisualState,
  point: Point,
): CellPosition | undefined {
  const [canvasWidth, canvasHeight] = visualState.canvasSize;
  const [offsetX, offsetY] = visualState.offset;

  const [x, y] = point;

  if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) {
    return undefined;
  }

  const halfWidth = Math.floor(canvasWidth / 2);
  const halfHeight = Math.floor(canvasHeight / 2);

  const [cellWidth, cellHeight] = visualState.cellSize;

  const canvasX = x - offsetX - halfWidth + cellWidth / 2;
  const canvasY = y - offsetY - halfHeight + cellHeight / 2;

  return newCellPosition({
    i: Math.floor(canvasX / cellWidth),
    j: Math.floor(canvasY / cellHeight),
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

export function visualStateMove(visualState: VisualState, point: Point): void {
  updateVisualStateOffset(visualState, [
    visualState.offset[0] + point[0],
    visualState.offset[1] + point[1],
  ]);
}

export function visualStateMoveToCell(
  visualState: VisualState,
  cell: CellPosition,
): void {
  const [cellWidth, cellHeight] = visualState.cellSize;

  updateVisualStateOffset(visualState, [
    -cell.i * cellWidth,
    -cell.j * cellHeight,
  ]);
}

function updateVisualStateOffset(visualState: VisualState, point: Point): void {
  visualState.offset[0] = point[0];
  visualState.offset[1] = point[1];

  actualizeViewportBounds(visualState);
  visualState.onUpdate();
}

export function isSamePoints(
  p1: Point | undefined,
  p2: Point | undefined,
): boolean {
  if (!p1 && !p2) {
    return true;
  }

  if (!p1 || !p2) {
    return false;
  }

  return p1[0] === p2[0] && p1[1] === p2[1];
}

export function isSameCellPoints(
  p1: CellPosition | undefined,
  p2: CellPosition | undefined,
): boolean {
  if (!p1 && !p2) {
    return true;
  }

  if (!p1 || !p2) {
    return false;
  }

  return p1.cellId === p2.cellId;
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
  if (visualState.gameState.structuresByCellId.has(cell.cellId)) {
    return false;
  }

  if (
    visualState.interactiveAction &&
    visualState.interactiveAction.actionType ===
      InteractiveActionType.CONSTRUCTION_PLANNING &&
    visualState.interactiveAction.facilityType === FacilityType.CITY
  ) {
    const expeditionStart =
      visualState.interactiveAction.expeditionFromCity.position;

    const distance = cellDistanceSquare(expeditionStart, cell);

    return (
      distance >= MIN_EXPEDITION_DISTANCE_SQUARE &&
      distance <= MAX_EXPEDITION_DISTANCE_SQUARE
    );
  }

  return true;
}

function cellDistanceSquare(pos1: CellPosition, pos2: CellPosition): number {
  return (pos1.i - pos2.i) ** 2 + (pos1.j - pos2.j) ** 2;
}
