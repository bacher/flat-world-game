import { addToMapSet } from '@/utils/helpers';

import {
  CarrierPath,
  CarrierPathType,
  CellId,
  City,
  ExactFacilityType,
  FacilitiesByCityId,
  GameState,
  GameStateSnapshot,
  ProductVariantId,
  ResearchId,
  StructuresByCellId,
} from './types';
import { addCity, addPathTo } from './gameState';
import { gamesListStorage, gameStateStorage } from './persist';
import { researches } from './research';
import { newCellPosition } from './helpers';

function getNewGame({ gameId }: { gameId: string }) {
  const gameState: GameState = {
    tickNumber: 0,
    gameId,
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
  };

  addCity(gameState, {
    position: newCellPosition({ i: 0, j: 0 }),
  });

  return gameState;
}

export function getNewGameSnapshot({
  gameId,
}: {
  gameId: string;
}): GameStateSnapshot {
  return getGameStateSnapshot(getNewGame({ gameId }));
}

export function getGameStateSnapshot(gameState: GameState): GameStateSnapshot {
  const {
    gameId,
    tickNumber,
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

  return {
    gameId,
    tickNumber,
    cities: citiesNormalized,
    facilities: [...facilitiesByCityId.values()].flat(),
    completedResearches: [...completedResearches.values()],
    currentResearchId,
    inProgressResearches: [...inProgressResearches.entries()],
  };
}

export function getGameStateBySnapshot(
  gameStateSnapshot: GameStateSnapshot,
): GameState {
  const {
    gameId,
    tickNumber,
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
    tickNumber,
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
  unlockedFacilities: Set<ExactFacilityType>;
  unlockedProductionVariants: Map<ExactFacilityType, Set<ProductVariantId>>;
} {
  const unlockedFacilities = new Set<ExactFacilityType>();
  const unlockedProductionVariants = new Map<
    ExactFacilityType,
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
  saveName: string | undefined,
): void {
  const snapshot = getGameStateSnapshot(gameState);
  const fullSaveName = getFullSnapshotName(gameState.gameId, saveName);

  gameStateStorage.set(fullSaveName, snapshot);

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
): GameState {
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

  const snapshot = gameStateStorage.get(fullSaveName);

  if (!snapshot) {
    throw new Error('No game state found');
  }

  return getGameStateBySnapshot(snapshot);
}
