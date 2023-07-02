import type { CellCoordinates } from '@/game/types';

export function parseCoordinatesFromString(
  coordsString: string,
): CellCoordinates | undefined {
  const coordStringPair = coordsString.split(/\s*[,;:]\s*/);

  if (coordStringPair.length !== 2) {
    return;
  }

  const i = Number.parseInt(coordStringPair[0]);
  const j = Number.parseInt(coordStringPair[1]);

  if (Number.isNaN(i) || Number.isNaN(j)) {
    return undefined;
  }

  return {
    i,
    j,
  };
}
