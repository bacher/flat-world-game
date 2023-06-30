import {
  CellId,
  City,
  Construction,
  FacilitiesByCityId,
  Facility,
  GameState,
  StructuresByCellId,
  addCity,
  addPathTo,
} from './gameState';
import { gameStateStorage, gamesListStorage } from './persist';
import { ResearchId, researches } from './research';
import { CarrierPath, ExactFacilityType } from './types';

function getNewGame({ gameId }: { gameId: string }) {
  const gameState: GameState = {
    gameId,
    cities: [],
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
    cities,
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
    cities,
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

export function saveGame(gameState: GameState): void {
  const snapshot = getGameStateSnapshot(gameState);
  gameStateStorage.set(snapshot.gameId, snapshot);

  const gamesList = gamesListStorage.get();

  if (gamesList) {
    const gameMeta = gamesList.games.find(
      (game) => game.gameId === gameState.gameId,
    );
    if (gameMeta) {
      gameMeta.snapshotCreatedAt = Date.now();
      gamesList.games.sort((a, b) => a.snapshotCreatedAt - b.snapshotCreatedAt);
      gamesListStorage.set(gamesList);
      return;
    }
  }

  console.error('No game meta found');
}
