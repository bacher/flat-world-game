import type { CellCoordinates, CellId, CellPath, CellPosition } from './types';

const ROW_SIZE = 2 ** 26;
const ROW_HALF_SIZE = ROW_SIZE / 2;

export function convertCellToCellId(cell: CellCoordinates): CellId {
  const x = cell.i + ROW_HALF_SIZE;
  const y = cell.j + ROW_HALF_SIZE;

  return (y * ROW_SIZE + x) as CellId;
}

export function newCellPosition(pos: { i: number; j: number }): CellPosition {
  const point = {
    i: pos.i,
    j: pos.j,
    cellId: convertCellToCellId(pos),
  };

  // TODO:
  // Object.defineProperty(point, 'cellId', { enumerable: false });

  return point;
}

export function calculateDistance(
  cell1: CellPosition,
  cell2: CellPosition,
): number {
  const x = cell1.i - cell2.i;
  const y = cell1.j - cell2.j;

  return Math.sqrt(x ** 2 + y ** 2);
}

export function isSamePos(cell1: CellPosition, cell2: CellPosition): boolean {
  return cell1.i === cell2.i && cell1.j === cell2.j;
}

export function isSamePath(path1: CellPath, path2: CellPath): boolean {
  return (
    isExactSamePath(path1, path2) ||
    isExactSamePath(path1, { from: path2.to, to: path2.from })
  );
}

export function isExactSamePath(path1: CellPath, path2: CellPath): boolean {
  return isSamePos(path1.from, path2.from) && isSamePos(path1.to, path2.to);
}
