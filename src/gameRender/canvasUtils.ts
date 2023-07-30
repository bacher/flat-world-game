import type { Size } from '@/game/types';

export const DEFAULT_FONT = `11px sans-serif`;

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  { x, y }: { x: number; y: number },
  {
    align,
    baseline,
    color = 'black',
    shadowThickness = 1,
    fontSize,
  }: {
    align: CanvasTextAlign;
    baseline: CanvasTextBaseline;
    color?: 'white' | 'black';
    fontSize?: number;
    shadowThickness?: number;
  },
) {
  ctx.strokeStyle = color === 'black' ? 'white' : 'black';
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.lineJoin = 'round';

  if (shadowThickness !== 1) {
    ctx.lineWidth = shadowThickness;
  }

  if (fontSize) {
    ctx.font = `${fontSize}px sans-serif`;
  }

  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);

  ctx.lineJoin = 'miter';

  if (shadowThickness !== 1) {
    ctx.lineWidth = 1;
  }

  if (fontSize) {
    ctx.font = DEFAULT_FONT;
  }
}

export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  canvasSize: Size,
): void {
  ctx.rect(0, 0, canvasSize.width, canvasSize.height);
  ctx.fillStyle = 'white';
  ctx.fill();
}
