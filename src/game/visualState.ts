import { renderGameToCanvas } from '../gameRender/render';
import {
  City,
  GameState,
  Structure,
  convertCellToCellId,
  tick,
} from './gameState';
import {
  CellPosition,
  CellRect,
  ExactFacilityType,
  FacilityType,
  Point,
} from './types';
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
    viewportBounds: { start: [0, 0], end: [0, 0] },
    hoverCell: undefined,
    interactiveAction: undefined,
    onUpdate: () => {
      renderGameToCanvas(visualState);
      onUpdate();
    },
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
    start: [
      Math.floor(-offsetX / cellWidth),
      Math.floor(-offsetY / cellHeight),
    ],
    end: [
      Math.ceil((canvasWidth - offsetX) / cellWidth),
      Math.ceil((canvasHeight - offsetY) / cellHeight),
    ],
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

  return [Math.floor(canvasX / cellWidth), Math.floor(canvasY / cellHeight)];
}

export function lookupFacilityByPoint(
  visualState: VisualState,
  point: Point,
): Structure | undefined {
  const cell = lookupGridByPoint(visualState, point);

  if (!cell) {
    return undefined;
  }

  const cellId = convertCellToCellId(cell);

  return visualState.gameState.structuresByCellId.get(cellId);
}

export function visualStateOnMouseMove(
  visualState: VisualState,
  point: Point | undefined,
): void {
  if (!point) {
    visualState.hoverCell = undefined;
    renderGameToCanvas(visualState);
    return;
  }

  const cell = lookupGridByPoint(visualState, point);

  if (!isPointsSame(visualState.hoverCell, cell)) {
    visualState.hoverCell = cell;
    renderGameToCanvas(visualState);
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
    cell[0] * cellWidth,
    cell[1] * cellHeight,
  ]);
}

function updateVisualStateOffset(visualState: VisualState, point: Point): void {
  visualState.offset[0] = point[0];
  visualState.offset[1] = point[1];

  actualizeViewportBounds(visualState);

  renderGameToCanvas(visualState);
}

export function isPointsSame(
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

const MAX_EXPEDITION_DISTANCE_SQUARE = 7 ** 2;

export function isAllowToConstructAtPosition(
  visualState: VisualState,
  cell: CellPosition,
): boolean {
  const cellId = convertCellToCellId(cell);

  if (visualState.gameState.structuresByCellId.has(cellId)) {
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
    return (
      cellDistanceSquare(expeditionStart, cell) < MAX_EXPEDITION_DISTANCE_SQUARE
    );
  }

  return true;
}

function cellDistanceSquare(pos1: CellPosition, pos2: CellPosition): number {
  return (pos1[0] - pos2[0]) ** 2 + (pos1[1] - pos2[1]) ** 2;
}
