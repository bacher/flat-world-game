import {
  CellId,
  City,
  Construction,
  FacilitiesByCityId,
  Facility,
  GameState,
  StructuresByCellId,
  CarrierPath,
  ExactFacilityType,
} from './types';
import { addCity, addPathTo } from './gameState';
import { gameStateStorage, gamesListStorage } from './persist';
import { ResearchId, researches } from './research';

function getNewGame({ gameId }: { gameId: string }) {
  const gameState: GameState = {
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
  };

  addCity(gameState, {
    position: [0, 0],
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

export type GameStateSnapshot = {
  gameId: string;
  cities: City[];
  facilities: (Facility | Construction)[];
  completedResearches: ResearchId[];
  currentResearchId: ResearchId | undefined;
  inProgressResearches: [ResearchId, { points: number }][];
};

export function getGameStateSnapshot(gameState: GameState): GameStateSnapshot {
  const {
    gameId,
    cities,
    facilitiesByCityId,
    completedResearches,
    currentResearchId,
    inProgressResearches,
  } = gameState;

  return {
    gameId,
    cities: [...cities.values()],
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
    cities,
    completedResearches,
    currentResearchId,
    inProgressResearches,
    facilities,
  } = gameStateSnapshot;

  const structuresByCellId: StructuresByCellId = new Map();
  for (const city of cities) {
    structuresByCellId.set(city.cellId, city);
  }

  const { carrierPathsFromCellId, carrierPathsToCellId } =
    extractCarrierPaths(cities);

  const facilitiesByCityId: FacilitiesByCityId = new Map(
    cities.map((city) => [city.cityId, []]),
  );

  for (const facility of facilities) {
    structuresByCellId.set(facility.cellId, facility);
    facilitiesByCityId.get(facility.assignedCityId)!.push(facility);
  }

  return {
    gameId,
    cities: new Map(cities.map((city) => [city.cityId, city])),
    completedResearches: new Set(completedResearches),
    currentResearchId,
    inProgressResearches: new Map(inProgressResearches),
    alreadyCityNames: new Set(cities.map((city) => city.name)),
    carrierPathsFromCellId,
    carrierPathsToCellId,
    facilitiesByCityId,
    structuresByCellId,
    unlockedFacilities: collectUnlockedFacilities(completedResearches),
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

function collectUnlockedFacilities(
  completedResearches: ResearchId[],
): Set<ExactFacilityType> {
  const facilities = new Set<ExactFacilityType>();

  for (const researchId of completedResearches) {
    const researchInfo = researches[researchId];

    for (const facilityType of researchInfo.unlockFacilities) {
      facilities.add(facilityType);
    }
  }

  return facilities;
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
