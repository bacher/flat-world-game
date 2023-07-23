import { addToMapSet } from '@/utils/helpers';

import {
  DEFAULT_CHUNK_SIZE,
  DEFAULT_IGNORE_DEPOSIT_RADIUS,
  DEFAULT_MAX_CHUNK_DEPOSITS,
  DEFAULT_MAX_DEPOSIT_RADIUS,
} from '@/game/consts';
import {
  CarrierPath,
  CarrierPathType,
  CellId,
  City,
  FacilitiesByCityId,
  FacilityLikeType,
  GameSave,
  GameState,
  GameStateSnapshot,
  ProductVariantId,
  ResearchId,
  StructuresByCellId,
  UiState,
  WorldParams,
} from './types';
import { addCity, addPathTo } from './gameState';
import { gamesListStorage, gameStateStorage } from './persist';
import { researches } from './research';
import { newCellPosition } from './helpers';
import { mulberry32 } from './pseudoRandom';

function getNewGame({ gameId }: { gameId: string }) {
  const gameSeed = Math.floor(Math.random() * 4294967296);

  const gameState: GameState = {
    gameId,
    gameSeed,
    tickNumber: 0,
    worldParams: {
      chunkSize: DEFAULT_CHUNK_SIZE,
      maxChunkDeposits: DEFAULT_MAX_CHUNK_DEPOSITS,
      maxDepositRadius: DEFAULT_MAX_DEPOSIT_RADIUS,
      ignoreDepositsInCenterRadius: DEFAULT_IGNORE_DEPOSIT_RADIUS,
    },
    cities: new Map(),
    facilitiesByCityId: new Map(),
    carrierPathsFromCellId: new Map(),
    carrierPathsToCellId: new Map(),
    structuresByCellId: new Map(),
    alreadyCityNames: new Set(),
    completedResearches: new Set(),
    inProgressResearches: new Map(),
    currentResearchId: undefined,
    unlockedFacilities: new Set(),
    unlockedProductionVariants: new Map(),
    pseudoRandom: mulberry32(gameSeed),
    depositsMapCache: new Map(),
  };

  addCity(gameState, {
    position: newCellPosition({ i: 0, j: 0 }),
  });

  return gameState;
}

export function getNewGameSave({ gameId }: { gameId: string }): GameSave {
  return {
    gameState: getGameStateSnapshot(getNewGame({ gameId })),
    uiState: {
      center: { i: 0, j: 0 },
      zoom: 1,
    },
  };
}

function getGameStateSnapshot(gameState: GameState): GameStateSnapshot {
  const {
    gameId,
    gameSeed,
    tickNumber,
    //worldParams,
    cities,
    facilitiesByCityId,
    completedResearches,
    currentResearchId,
    inProgressResearches,
  } = gameState;

  const citiesNormalized = [...cities.values()].map((city) => ({
    ...city,
    carrierPaths: city.carrierPaths.filter(
      (carrierPath) => carrierPath.pathType !== CarrierPathType.AUTOMATIC,
    ),
  }));

  const worldParams: WorldParams = {
    chunkSize: 100,
    ignoreDepositsInCenterRadius: 10,
    maxDepositRadius: DEFAULT_MAX_DEPOSIT_RADIUS,
    maxChunkDeposits: 10,
  };

  return {
    gameId,
    gameSeed,
    tickNumber,
    worldParams,
    cities: citiesNormalized,
    facilities: [...facilitiesByCityId.values()].flat(),
    completedResearches: [...completedResearches.values()],
    currentResearchId,
    inProgressResearches: [...inProgressResearches.entries()],
  };
}

function getGameStateBySnapshot(
  gameStateSnapshot: GameStateSnapshot,
): GameState {
  const {
    gameId,
    gameSeed,
    tickNumber,
    worldParams,
    cities: dehydratedCities,
    completedResearches,
    currentResearchId,
    inProgressResearches,
    facilities,
  } = gameStateSnapshot;

  const cities: City[] = dehydratedCities.map((city) => ({
    ...city,
    isNeedUpdateAutomaticPaths: true,
  }));

  const structuresByCellId: StructuresByCellId = new Map();
  for (const city of cities) {
    structuresByCellId.set(city.position.cellId, city);
  }

  const { carrierPathsFromCellId, carrierPathsToCellId } =
    extractCarrierPaths(cities);

  const facilitiesByCityId: FacilitiesByCityId = new Map(
    cities.map((city) => [city.cityId, []]),
  );

  for (const facility of facilities) {
    structuresByCellId.set(facility.position.cellId, facility);
    facilitiesByCityId.get(facility.assignedCityId)!.push(facility);
  }

  return {
    gameId,
    gameSeed,
    tickNumber,
    worldParams,
    cities: new Map(cities.map((city) => [city.cityId, city])),
    completedResearches: new Set(completedResearches),
    currentResearchId,
    inProgressResearches: new Map(inProgressResearches),
    alreadyCityNames: new Set(cities.map((city) => city.name)),
    carrierPathsFromCellId,
    carrierPathsToCellId,
    facilitiesByCityId,
    structuresByCellId,
    ...collectUnlockedFacilities(completedResearches),
    pseudoRandom: mulberry32(gameSeed + tickNumber),
    depositsMapCache: new Map(),
  };
}

function extractCarrierPaths(cities: City[]): {
  carrierPathsFromCellId: Map<CellId, CarrierPath[]>;
  carrierPathsToCellId: Map<CellId, CarrierPath[]>;
} {
  const carrierPathsFromCellId = new Map<CellId, CarrierPath[]>();
  const carrierPathsToCellId = new Map<CellId, CarrierPath[]>();

  for (const city of cities) {
    for (const carrierPath of city.carrierPaths) {
      addPathTo(carrierPathsFromCellId, carrierPath, carrierPath.path.from);
      addPathTo(carrierPathsToCellId, carrierPath, carrierPath.path.to);
    }
  }

  return {
    carrierPathsFromCellId,
    carrierPathsToCellId,
  };
}

function collectUnlockedFacilities(completedResearches: ResearchId[]): {
  unlockedFacilities: Set<FacilityLikeType>;
  unlockedProductionVariants: Map<FacilityLikeType, Set<ProductVariantId>>;
} {
  const unlockedFacilities = new Set<FacilityLikeType>();
  const unlockedProductionVariants = new Map<
    FacilityLikeType,
    Set<ProductVariantId>
  >();

  for (const researchId of completedResearches) {
    const researchInfo = researches[researchId];

    for (const facilityType of researchInfo.unlockFacilities) {
      unlockedFacilities.add(facilityType);
    }

    if (researchInfo.unlockProductionVariants) {
      for (const [facilityType, productVariants] of Object.entries(
        researchInfo.unlockProductionVariants,
      )) {
        addToMapSet(unlockedProductionVariants, facilityType, productVariants);
      }
    }
  }

  return {
    unlockedFacilities,
    unlockedProductionVariants,
  };
}

function getFullSnapshotName(gameId: string, saveName: string | undefined) {
  return saveName ? `${gameId}|${saveName.toLowerCase()}` : gameId;
}

export function saveGame(
  gameState: GameState,
  uiState: UiState,
  saveName: string | undefined,
): void {
  const gameStateSnapshot = getGameStateSnapshot(gameState);
  const fullSaveName = getFullSnapshotName(gameState.gameId, saveName);

  gameStateStorage.set(fullSaveName, {
    gameState: gameStateSnapshot,
    uiState,
  });

  const gamesList = gamesListStorage.get();

  if (gamesList) {
    const gameMeta = gamesList.games.find(
      (game) => game.gameId === gameState.gameId,
    );
    if (gameMeta) {
      const snapshotAt = Date.now();

      gameMeta.lastSnapshotCreatedAt = snapshotAt;

      if (saveName) {
        gameMeta.snapshotCreatedAt = undefined;
        gameMeta.saves.push({
          saveName,
          snapshotCreatedAt: snapshotAt,
        });
      } else {
        gameMeta.snapshotCreatedAt = snapshotAt;
      }

      gamesListStorage.set(gamesList);

      if (saveName) {
        gameStateStorage.clear(gameState.gameId);
      }
      return;
    }
  }

  console.error('No game meta found');
}

export function loadGame(
  gameId: string,
  saveName: string | undefined,
): { gameState: GameState; uiState: UiState } {
  let actualSaveName: string | undefined = saveName;

  if (!actualSaveName) {
    const gamesList = gamesListStorage.get();

    if (!gamesList) {
      throw new Error();
    }

    const game = gamesList.games.find((game) => game.gameId === gameId);

    if (!game) {
      throw new Error();
    }

    if (!game.snapshotCreatedAt) {
      if (!game.saves.length) {
        throw new Error();
      }

      game.saves.sort(
        (save1, save2) => save2.snapshotCreatedAt - save1.snapshotCreatedAt,
      );
      actualSaveName = game.saves[0].saveName;
    }
  }

  const fullSaveName = getFullSnapshotName(gameId, actualSaveName);

  const gameSave = gameStateStorage.get(fullSaveName);

  if (!gameSave) {
    throw new Error('No game state found');
  }

  let uiState: UiState;
  if (gameSave.uiState && gameSave.uiState.center?.i !== undefined) {
    uiState = gameSave.uiState;
  } else {
    uiState = { center: { i: 0, j: 0 }, zoom: 1 };
  }

  return {
    // TODO: Remove default values lately
    gameState: getGameStateBySnapshot(gameSave.gameState ?? gameSave),
    uiState,
  };
}
