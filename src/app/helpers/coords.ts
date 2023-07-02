import type { CellPosition } from '@/game/types';

export function parseCoordinatesFromString(
  coordsString: string,
): CellPosition | undefined {
  const coordStringPair = coordsString.split(/\s*[,;:]\s*/);

  if (coordStringPair.length !== 2) {
    return;
  }

  const coords = [];

  for (const coordString of coordStringPair) {
    const num = Number.parseInt(coordString);
    if (Number.isNaN(num)) {
      return undefined;
    }

    coords.push(num);
  }

  return coords as CellPosition;
}
