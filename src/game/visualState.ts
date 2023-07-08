import {
  CellPosition,
  CellRect,
  ExactFacilityType,
  FacilityType,
  PointTuple,
  City,
  GameState,
  Structure,
  Size,
  Point,
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
import { DEFAULT_FONT } from '@/gameRender/canvasUtils';

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

    const distance = calculateDistanceSquare(expeditionStart, cell);

    return (
      distance >= MIN_EXPEDITION_DISTANCE_SQUARE &&
      distance <= MAX_EXPEDITION_DISTANCE_SQUARE
    );
  }

  return true;
}
