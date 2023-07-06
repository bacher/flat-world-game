export const DEFAULT_FONT = `$10px sans-serif`;

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  { x, y }: { x: number; y: number },
  {
    align,
    baseline,
    color = 'black',
    lineWidth = 1,
    fontSize,
  }: {
    align: CanvasTextAlign;
    baseline: CanvasTextBaseline;
    color?: 'white' | 'black';
    fontSize?: number;
    lineWidth?: number;
  },
) {
  ctx.strokeStyle = color === 'black' ? 'white' : 'black';
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;

  if (lineWidth !== 1) {
    ctx.lineWidth = lineWidth;
  }

  if (fontSize) {
    ctx.font = `${fontSize}px sans-serif`;
  }

  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);

  if (lineWidth !== 1) {
    ctx.lineWidth = 1;
  }

  if (fontSize) {
    ctx.font = DEFAULT_FONT;
  }
}
