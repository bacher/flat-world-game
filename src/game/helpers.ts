import {
  CarrierPath,
  CellCoordinates,
  CellId,
  CellPath,
  CellPosition,
  CellRect,
  ExactFacilityType,
  FacilityType,
} from './types';

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

export function getCarrierPathDistance(carrierPath: CarrierPath): number {
  return calculateDistance(carrierPath.path.from, carrierPath.path.to);
}

export function calculateDistanceSquare(
  pos1: CellPosition,
  pos2: CellPosition,
): number {
  return (pos1.i - pos2.i) ** 2 + (pos1.j - pos2.j) ** 2;
}

export function calculateDistance(
  cell1: CellPosition,
  cell2: CellPosition,
): number {
  return Math.sqrt(calculateDistanceSquare(cell1, cell2));
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

export function isExactFacility(type: FacilityType): type is ExactFacilityType {
  return type !== FacilityType.CITY && type !== FacilityType.CONSTRUCTION;
}

export function extendArea(area: CellRect, radius: number): CellRect {
  return {
    start: {
      i: area.start.i - radius,
      j: area.start.j - radius,
    },
    end: {
      i: area.end.i - radius,
      j: area.end.j - radius,
    },
  };
}
