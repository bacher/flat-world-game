import { renderGameToCanvas } from '../gameRender/render';
import { GameState, tick } from './gameState';
import type { CellPosition, CellRect, Point } from './types';

export type VisualState = {
  gameState: GameState;
  ctx: CanvasRenderingContext2D;
  canvasSize: Point;
  canvasHalfSize: Point;
  cellSize: Point;
  viewportBounds: CellRect;
  hoverCell: CellPosition | undefined;
};

export function createVisualState(
  gameState: GameState,
  ctx: CanvasRenderingContext2D,
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
    viewportBounds: { start: [0, 0], end: [0, 0] },
    hoverCell: undefined,
  };

  actualizeViewportBounds(visualState);

  return visualState;
}

function actualizeViewportBounds(visualState: VisualState): void {
  const [canvasWidth, canvasHeight] = visualState.canvasSize;
  const [halfWidth, halfHeight] = visualState.canvasHalfSize;
  const [cellWidth, cellHeight] = visualState.cellSize;

  const offsetX = halfWidth - cellWidth / 2;
  const offsetY = halfHeight - cellHeight / 2;

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

  const [x, y] = point;

  if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) {
    return undefined;
  }

  const halfWidth = Math.floor(canvasWidth / 2);
  const halfHeight = Math.floor(canvasHeight / 2);

  const [cellWidth, cellHeight] = visualState.cellSize;

  const canvasX = x - halfWidth + cellWidth / 2;
  const canvasY = y - halfHeight + cellHeight / 2;

  return [Math.floor(canvasX / cellWidth), Math.floor(canvasY / cellHeight)];
}

export function visualStateOnMouseMove(
  visualState: VisualState,
  point: Point,
): void {
  const cell = lookupGridByPoint(visualState, point);

  if (!isPointsSame(visualState.hoverCell, cell)) {
    visualState.hoverCell = cell;
    renderGameToCanvas(visualState);
  }
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

export function startGameLoop(visualState: VisualState): () => void {
  let tickNumber = 0;

  const intervalId = window.setInterval(() => {
    tickNumber += 1;
    tick(visualState.gameState);
    renderGameToCanvas(visualState);

    // TODO: While developing
    if (tickNumber === 200) {
      console.log('Game stopped');
      window.clearInterval(intervalId);
    }
  }, 1000);

  return () => {
    window.clearInterval(intervalId);
  };
}
