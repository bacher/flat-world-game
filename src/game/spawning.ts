import {
  CellCoordinates,
  CellPosition,
  CellRect,
  CellShape,
  ChunkIdentity,
  DepositInfo,
  GameState,
} from './types';
import { mulberry32 } from './pseudoRandom';
import {
  extendArea,
  isRectsCollade,
  newCellPosition,
  newChunkIdentity,
} from './helpers';
import { DepositType } from './depositType';

const depositTypes = [
  DepositType.STONE,
  DepositType.COAL,
  DepositType.IRON,
  DepositType.OIL,
];

export function getChunkDeposits(gameState: GameState, chunk: ChunkIdentity) {
  const cached = gameState.depositsMapCache.get(chunk.chunkId);
  if (cached) {
    return cached;
  }

  const top = newChunkIdentity({ i: chunk.i, j: chunk.j - 1 });
  const topLeft = newChunkIdentity({ i: chunk.i - 1, j: chunk.j - 1 });
  const left = newChunkIdentity({ i: chunk.i - 1, j: chunk.j });

  const topDeposits = getChunkDepositsByPlan(gameState, top);
  const topLeftDeposits = getChunkDepositsByPlan(gameState, topLeft);
  const leftDeposits = getChunkDepositsByPlan(gameState, left);

  const current = getChunkDepositsByPlan(gameState, chunk);

  const deposits = current.filter((deposit, index) => {
    const extendedArea = extendArea(deposit.boundingRect, 3);

    return (
      !isColladeWithDeposits(extendedArea, current, index + 1) &&
      !isColladeWithDeposits(extendedArea, topDeposits) &&
      !isColladeWithDeposits(extendedArea, topLeftDeposits) &&
      !isColladeWithDeposits(extendedArea, leftDeposits)
    );
  });

  gameState.depositsMapCache.set(chunk.chunkId, deposits);

  return deposits;
}

function isColladeWithDeposits(
  area: CellRect,
  deposits: DepositInfo[],
  startFrom = 0,
): boolean {
  for (let i = startFrom; i < deposits.length; i += 1) {
    const deposit = deposits[i];
    if (isRectsCollade(area, deposit.boundingRect)) {
      return true;
    }
  }
  return false;
}

function getChunkDepositsByPlan(
  gameState: GameState,
  chunk: ChunkIdentity,
): DepositInfo[] {
  const cached = gameState.depositsMapCache.get(chunk.chunkId);
  if (cached) {
    return cached;
  }

  const { gameSeed, worldParams } = gameState;
  const deposits: DepositInfo[] = [];
  const random = mulberry32(gameSeed + chunk.chunkId);
  const depositsCount = Math.floor(random() * worldParams.maxChunkDeposits);

  for (let i = 0; i < depositsCount; i++) {
    const cell = {
      i: chunk.i + Math.floor(random() * worldParams.chunkSize),
      j: chunk.j + Math.floor(random() * worldParams.chunkSize),
    };

    if (
      cell.i ** 2 + cell.j ** 2 >=
      worldParams.ignoreDepositsInCenterRadius ** 2
    ) {
      const depositType =
        depositTypes[Math.floor(random() * depositTypes.length)];
      const radius = random() * worldParams.maxDepositRadius;

      const shape = generateShape(random, cell, radius);

      deposits.push({
        shape,
        boundingRect: getBoundingRect(shape.cells),
        depositType: depositType,
      });
    }
  }

  return deposits;
}

function generateShape(
  random: () => number,
  pos: CellCoordinates,
  radius: number,
): CellShape {
  const r2 = radius ** 2;

  const cells: CellPosition[] = [];
  const upperRadius = Math.ceil(radius);
  const endingRadius2 = (radius - 1) ** 2;

  for (let i = -upperRadius; i <= upperRadius; i += 1) {
    for (let j = -upperRadius; j <= upperRadius; j += 1) {
      const distance = i ** 2 + j ** 2;
      if (distance <= r2) {
        if (distance <= endingRadius2 || random() < 0.5) {
          cells.push(
            newCellPosition({
              i: pos.i + i,
              j: pos.j + j,
            }),
          );
        }
      }
    }
  }

  return {
    cells,
  };
}

function getBoundingRect(positions: CellPosition[]): CellRect {
  const first = positions[0];

  const bound: CellRect = {
    start: { ...first },
    end: { ...first },
  };

  for (let i = 1; i < positions.length; i++) {
    const point = positions[i];

    if (point.i < bound.start.i) {
      bound.start.i = point.i;
    }
    if (point.j < bound.start.j) {
      bound.start.j = point.j;
    }
    if (point.i > bound.end.i) {
      bound.end.i = point.i;
    }
    if (point.j > bound.end.j) {
      bound.end.j = point.j;
    }
  }

  return bound;
}
