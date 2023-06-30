import sample from 'lodash/sample';

import type { Branded } from '../utils/typeUtils';

import { generateNewCityName } from './cityNameGenerator';
import {
  CarrierPath,
  CellPath,
  CellPosition,
  ExactFacilityType,
  FacilityType,
  StorageItem,
  WorkingPath,
} from './types';
import { ResourceType } from './resources';
import {
  facilitiesConstructionInfo,
  facilitiesIterationInfo,
} from './facilities';
import { ResearchId, researches } from './research';

const BASE_PEOPLE_DAY_PER_CELL = 0.02;
const BASE_HORSE_DAY_PER_CELL = 0.02;
const BASE_WEIGHT_PER_PEOPLE_DAY = 2.5;
const BASE_WEIGHT_PER_HORSE_DAY = 3.5;
const BASE_PEOPLE_WORK_MODIFIER = 1;
const BASE_HORSE_WORK_MODIFIER = 0.5;
const RESEARCH_POINTS_PER_FREE_PERSON = 3;
const RESEARCH_POINTS_PER_WORKER = RESEARCH_POINTS_PER_FREE_PERSON / 2;
const HORSES_PER_WORKER = 0.1;
const BUFFER_DAYS = 2;
const MINIMAL_CITY_PEOPLE = 3;
const PEOPLE_FOOD_PER_DAY = 0.2;
export const MIN_EXPEDITION_DISTANCE_SQUARE = 8 ** 2;
export const MAX_EXPEDITION_DISTANCE_SQUARE = 20 ** 2;

export type FacilitiesByCityId = Map<CityId, (Construction | Facility)[]>;
export type StructuresByCellId = Map<CellId, Structure>;

export type GameState = {
  gameId: string;
  cities: City[];
  facilitiesByCityId: FacilitiesByCityId;
  structuresByCellId: StructuresByCellId;
  carrierPathsFromCellId: Map<CellId, CarrierPath[]>;
  carrierPathsToCellId: Map<CellId, CarrierPath[]>;
  alreadyCityNames: Set<string>;
  completedResearches: Set<ResearchId>;
  inProgressResearches: Map<ResearchId, { points: number }>;
  currentResearchId: ResearchId | undefined;
  unlockedFacilities: Set<ExactFacilityType>;
};

export type CityId = Branded<number, 'cityId'>;

type StructureBase = {
  position: CellPosition;
  cellId: CellId;
  input: StorageItem[];
  output: StorageItem[];
};

export type City = StructureBase & {
  cityId: CityId;
  type: FacilityType.CITY;
  name: string;
  population: number;
  carrierPaths: CarrierPath[];
  peopleDayPerCell: number;
  weightPerPeopleDay: number;
  peopleWorkModifier: number;
  totalAssignedWorkersCount: number;
  lastTickNeedPopulation: number;
  lastTickWorkingPaths: WorkingPath[];
};

export type Construction = StructureBase & {
  type: FacilityType.CONSTRUCTION;
  assignedCityId: CityId;
  buildingFacilityType: ExactFacilityType;
  assignedWorkersCount: number;
  inProcess: number;
  iterationsComplete: number;
};

export type Facility = StructureBase & {
  type: ExactFacilityType;
  assignedCityId: CityId;
  assignedWorkersCount: number;
  inProcess: number;
  productionVariant: number;
};

export type Structure = City | Construction | Facility;

export function addCityCarrierPaths(
  gameState: GameState,
  city: City,
  carrierPaths: CarrierPath[],
): void {
  for (const carrierPath of carrierPaths) {
    city.carrierPaths.push(carrierPath);

    addPathTo(
      gameState.carrierPathsFromCellId,
      carrierPath,
      carrierPath.path.from,
    );
    addPathTo(gameState.carrierPathsToCellId, carrierPath, carrierPath.path.to);
  }
}

export function addPathTo(
  carrierPaths: Map<CellId, CarrierPath[]>,
  carrierPath: CarrierPath,
  pos: CellPosition,
): void {
  const cellId = convertCellToCellId(pos);
  let alreadyPaths = carrierPaths.get(cellId);

  if (!alreadyPaths) {
    alreadyPaths = [];
    carrierPaths.set(cellId, alreadyPaths);
  }

  alreadyPaths.push(carrierPath);
}

type JobObject =
  | { type: 'facility'; facility: Facility | Construction; distance: number }
  | {
      type: 'carrier';
      carrierPath: CarrierPath;
      fromFacility: Structure;
      toFacility: Structure;
      commingDistance: number;
      moveDistance: number;
    };

// [temp, current, maximum, facility]
type PlannedJob = [number, number, number, JobObject];

export function tick(gameState: GameState): void {
  // PLANING PHASE

  const grabbedHorsesPerCity = new Map<CityId, number>();

  for (const city of gameState.cities) {
    actualizeCityTotalAssignedWorkersCount(gameState, city);
    calculateCityModificators(grabbedHorsesPerCity, city);
  }

  const planPerCity = new Map<CityId, { jobs: PlannedJob[] }>();

  let researchPoints = 0;

  for (const city of gameState.cities) {
    const facilities = gameState.facilitiesByCityId.get(city.cityId)!;

    let jobs: PlannedJob[] = [];
    let needPeople = 0;
    let maxRatio = -Infinity;

    function registerJob(
      item: JobObject,
      people: number,
      maxPeople: number,
    ): void {
      const nextRatio = (people - 1) / maxPeople;
      jobs.push([nextRatio, people, maxPeople, item]);
      needPeople += people;

      if (nextRatio > maxRatio) {
        maxRatio = nextRatio;
      }
    }

    for (const facility of facilities) {
      const distance = calculateDistance(city.position, facility.position);

      const iterationInfo = getStructureIterationStorageInfo(facility);

      if (iterationInfo) {
        const iterationPeopleDays =
          iterationInfo.iterationPeopleDays / city.peopleWorkModifier;

        let needPeople = 0;

        if (facility.inProcess > 0) {
          needPeople += (1 - facility.inProcess) * iterationPeopleDays;
        }

        const resourcesForIterations =
          getMaximumIterationsByResources(facility);

        let iterationsUntilOverDone;

        if (facility.type === FacilityType.CONSTRUCTION) {
          iterationsUntilOverDone =
            getIterationsUntilConstructionComplete(facility);
        } else {
          iterationsUntilOverDone = getIterationsUntilOverDone(facility, city);
        }

        needPeople +=
          Math.min(
            resourcesForIterations,
            Math.max(
              0,
              iterationsUntilOverDone + (facility.inProcess > 0 ? -1 : 0),
            ),
          ) * iterationPeopleDays;

        if (needPeople > 0) {
          const max = facility.assignedWorkersCount;

          const onePersonWork = 1 - distance * 0.05;
          const people = Math.min(max, Math.ceil(needPeople / onePersonWork));

          registerJob({ type: 'facility', facility, distance }, people, max);
        }
      }
    }

    for (const carrierPath of city.carrierPaths) {
      const { from: fromFacility, to: toFacility } = getPathFacilities(
        city,
        facilities,
        carrierPath.path,
      );

      if (!fromFacility || !toFacility) {
        console.error('No facility found!');
        continue;
      }

      const fromCount = getCountOf(
        fromFacility.output,
        carrierPath.resourceType,
      );

      if (fromCount === 0) {
        continue;
      }

      // TODO: Calculate how many people we need based on input and needed output

      const toCount = getCountOf(toFacility.input, carrierPath.resourceType);

      let maxInput = 0;

      if (toFacility.type === FacilityType.CITY) {
        maxInput = toFacility.population * 2;
      } else {
        if (toFacility.type === FacilityType.CONSTRUCTION) {
          const constructInfo =
            facilitiesConstructionInfo[toFacility.buildingFacilityType];

          const resourceIterationInfo = constructInfo.input.find(
            (input) => input.resourceType === carrierPath.resourceType,
          )!;

          if (!resourceIterationInfo) {
            debugger;
          }

          maxInput =
            resourceIterationInfo.quantity *
            (toFacility.assignedWorkersCount /
              constructInfo.iterationPeopleDays /
              city.peopleWorkModifier) *
            constructInfo.iterations;
        } else {
          const toFacilityIterationInfo =
            getStructureIterationStorageInfo(toFacility);

          const resourceIterationInfo = toFacilityIterationInfo.input.find(
            (input) => input.resourceType === carrierPath.resourceType,
          )!;

          maxInput =
            resourceIterationInfo.quantity *
            (toFacility.assignedWorkersCount /
              toFacilityIterationInfo.iterationPeopleDays /
              city.peopleWorkModifier) *
            BUFFER_DAYS;
        }

        if (toCount >= maxInput) {
          continue;
        }
      }

      const commingDistance =
        calculateDistance(city.position, fromFacility.position) +
        calculateDistance(toFacility.position, city.position);

      const moveDistance = calculateDistance(
        fromFacility.position,
        toFacility.position,
      );

      const needToMove = maxInput - toCount;

      const remains = 1 - commingDistance * city.peopleDayPerCell;

      const needPeople = Math.ceil(
        ((needToMove / city.weightPerPeopleDay) * moveDistance) / remains,
      );

      registerJob(
        {
          type: 'carrier',
          carrierPath,
          fromFacility,
          toFacility,
          commingDistance,
          moveDistance,
        },
        Math.min(needPeople, carrierPath.people),
        carrierPath.people,
      );
    }

    city.lastTickNeedPopulation = needPeople;

    while (city.population < needPeople) {
      const cutJobs = jobs.filter((job) => job[0] === maxRatio);

      const cutJob = sample(cutJobs)!;
      cutJob[1] -= 1;
      cutJob[0] = (cutJob[1] - 1) / cutJob[2];
      needPeople -= 1;

      if (cutJobs.length === 1) {
        maxRatio = -Infinity;
        for (const job of jobs) {
          if (job[0] > maxRatio) {
            maxRatio = job[0];
          }
        }
      }
    }

    jobs = jobs.filter((job) => job[1] > 0);

    planPerCity.set(city.cityId, { jobs });
  }

  // Return unused horses

  for (const city of gameState.cities) {
    const { jobs } = planPerCity.get(city.cityId)!;
    const grabbedHorses = grabbedHorsesPerCity.get(city.cityId)!;

    const actualTotalWorkersCount = jobs.reduce((acc, job) => acc + job[1], 0);

    const usedHorses = actualTotalWorkersCount * HORSES_PER_WORKER;

    const unusedHorses = grabbedHorses - usedHorses;

    if (unusedHorses > 0) {
      addResource(city.input, {
        resourceType: ResourceType.HORSE,
        quantity: unusedHorses,
      });
    }

    researchPoints +=
      (city.population - actualTotalWorkersCount) *
        RESEARCH_POINTS_PER_FREE_PERSON +
      actualTotalWorkersCount * RESEARCH_POINTS_PER_WORKER;
  }

  // Carriers get items

  const currentlyMovingProducts: {
    fromFacility: Structure;
    toFacility: Structure;
    resource: StorageItem;
  }[] = [];

  for (const city of gameState.cities) {
    const { jobs } = planPerCity.get(city.cityId)!;

    for (const [, people, , jobObject] of jobs) {
      if (jobObject.type === 'carrier') {
        const {
          carrierPath,
          fromFacility,
          toFacility,
          commingDistance,
          moveDistance,
        } = jobObject;

        const remains = 1 - commingDistance * city.peopleDayPerCell;

        const power = remains * people;

        let movedWeight = (power / moveDistance) * city.weightPerPeopleDay;
        movedWeight = Math.floor(movedWeight * 10) / 10;

        const grabbedItem = grabResource(fromFacility.output, {
          resourceType: carrierPath.resourceType,
          quantity: movedWeight,
        });

        currentlyMovingProducts.push({
          fromFacility,
          toFacility,
          resource: grabbedItem,
        });
      }
    }
  }

  // Facilities make products

  for (const city of gameState.cities) {
    const { jobs } = planPerCity.get(city.cityId)!;

    for (const [, people, , jobObject] of jobs) {
      if (jobObject.type === 'facility') {
        const { facility, distance } = jobObject;
        const peopleAfterWalk = people * (1 - distance * 0.05);

        const iteration = getStructureIterationStorageInfo(facility);

        let peopleIterationsRemains =
          peopleAfterWalk /
          iteration.iterationPeopleDays /
          city.peopleWorkModifier;
        let overallDone = 0;

        if (facility.inProcess > 0) {
          const iterationLeft = 1 - facility.inProcess;

          if (peopleIterationsRemains < iterationLeft) {
            facility.inProcess += peopleIterationsRemains;
            continue;
          }

          peopleIterationsRemains -= iterationLeft;
          facility.inProcess = 0;
          overallDone += 1;
        }

        const resourceForIterations = getMaximumIterationsByResources(facility);

        let iterationsUntilOverDone;

        if (facility.type === FacilityType.CONSTRUCTION) {
          iterationsUntilOverDone =
            getIterationsUntilConstructionComplete(facility);
        } else {
          iterationsUntilOverDone = getIterationsUntilOverDone(facility, city);
        }

        const finalIterationsUntilOverDone = Math.max(
          0,
          iterationsUntilOverDone - overallDone,
        );

        const resourceIterations = Math.min(
          finalIterationsUntilOverDone,
          resourceForIterations,
          Math.ceil(peopleIterationsRemains),
        );

        if (resourceIterations > 0) {
          removeIterationInput(facility, resourceIterations);
        }

        if (peopleIterationsRemains >= resourceIterations) {
          overallDone += resourceIterations;
        } else {
          const doneNewIterations = Math.floor(peopleIterationsRemains);
          overallDone += doneNewIterations;
          facility.inProcess = peopleIterationsRemains % 1;
        }

        if (facility.type === FacilityType.CONSTRUCTION) {
          facility.iterationsComplete += overallDone;

          const constructionInfo =
            facilitiesConstructionInfo[facility.buildingFacilityType];

          if (facility.iterationsComplete >= constructionInfo.iterations) {
            completeConstruction(gameState, facility);
          }
        } else {
          if (overallDone > 0) {
            addIterationOutput(facility, overallDone);
          }
        }
      }
    }
  }

  // Carriers have brought items

  for (const {
    fromFacility,
    toFacility,
    resource,
  } of currentlyMovingProducts) {
    if (toFacility.type === FacilityType.CONSTRUCTION) {
      const addingLimit = getMaximumAddingLimit(
        toFacility,
        resource.resourceType,
      );

      if (resource.quantity > addingLimit) {
        if (addingLimit > 0) {
          addResource(toFacility.input, {
            quantity: addingLimit,
            resourceType: resource.resourceType,
          });
        }

        addResource(fromFacility.output, {
          quantity: resource.quantity - addingLimit,
          resourceType: resource.resourceType,
        });
      } else {
        addResource(toFacility.input, resource);
      }
    } else {
      addResource(toFacility.input, resource);
    }
  }

  // Apply cities' working paths

  for (const city of gameState.cities) {
    const { jobs } = planPerCity.get(city.cityId)!;

    city.lastTickWorkingPaths = [];

    for (const job of jobs) {
      let workingPath: WorkingPath;

      switch (job[3].type) {
        case 'facility': {
          const facility = job[3].facility;
          workingPath = {
            path: { from: city.position, to: facility.position },
            workers: job[1],
            carriers: 0,
          };
          break;
        }
        case 'carrier': {
          const { from, to } = job[3].carrierPath.path;
          workingPath = {
            path: { from, to },
            workers: 0,
            carriers: job[1],
          };
          break;
        }
      }

      const alreadyPath = city.lastTickWorkingPaths.find((path) =>
        isSamePath(path.path, workingPath.path),
      );

      if (alreadyPath) {
        alreadyPath.workers += workingPath.workers;
        alreadyPath.carriers += workingPath.carriers;
      } else {
        city.lastTickWorkingPaths.push(workingPath);
      }
    }
  }

  // Population grow phase

  for (const city of gameState.cities) {
    const roundedPopulation = Math.floor(city.population);
    const needFood = roundedPopulation * PEOPLE_FOOD_PER_DAY;

    const grabbedFood = grabResource(city.input, {
      resourceType: ResourceType.FOOD,
      quantity: needFood,
    });

    if (grabbedFood.quantity === needFood) {
      if (getCountOf(city.input, ResourceType.FOOD) > 0) {
        city.population *= 1.01;
      }
    } else {
      if (city.population > MINIMAL_CITY_PEOPLE) {
        const shortage = (needFood - grabbedFood.quantity) / needFood;
        const poorPeople = shortage * city.population;
        city.population -= poorPeople / 10;

        if (city.population < MINIMAL_CITY_PEOPLE) {
          city.population = MINIMAL_CITY_PEOPLE;
        }
      }
    }
  }

  // Research progress

  if (gameState.currentResearchId) {
    let currentPoints = gameState.inProgressResearches.get(
      gameState.currentResearchId,
    );

    if (!currentPoints) {
      currentPoints = {
        points: 0,
      };

      gameState.inProgressResearches.set(
        gameState.currentResearchId,
        currentPoints,
      );
    }

    currentPoints.points += researchPoints;
    const researchInfo = researches[gameState.currentResearchId];

    if (currentPoints.points >= researchInfo.points) {
      gameState.completedResearches.add(gameState.currentResearchId);
      gameState.inProgressResearches.delete(gameState.currentResearchId);
      gameState.currentResearchId = undefined;

      for (const facilityType of researchInfo.unlockFacilities) {
        gameState.unlockedFacilities.add(facilityType);
      }
    }
  }
}

function actualizeCityTotalAssignedWorkersCount(
  gameState: GameState,
  city: City,
): void {
  const carriers = city.carrierPaths.reduce(
    (acc, path) => acc + path.people,
    0,
  );

  const workers =
    gameState.facilitiesByCityId
      .get(city.cityId)
      ?.reduce((acc, facility) => acc + facility.assignedWorkersCount, 0) ?? 0;

  city.totalAssignedWorkersCount = Math.min(
    city.population,
    carriers + workers,
  );
}

function calculateCityModificators(
  grabbedHorsesPerCity: Map<CityId, number>,
  city: City,
): void {
  const horsesNeeded = city.totalAssignedWorkersCount * HORSES_PER_WORKER;

  const grabbedHorses = grabResource(city.input, {
    resourceType: ResourceType.HORSE,
    quantity: horsesNeeded,
  });

  const horseRatio = Math.min(1, grabbedHorses.quantity / horsesNeeded);

  city.peopleWorkModifier =
    BASE_PEOPLE_WORK_MODIFIER + horseRatio * BASE_HORSE_WORK_MODIFIER;
  city.peopleDayPerCell =
    BASE_PEOPLE_DAY_PER_CELL + horseRatio * BASE_HORSE_DAY_PER_CELL;
  city.weightPerPeopleDay =
    BASE_WEIGHT_PER_PEOPLE_DAY + horseRatio * BASE_WEIGHT_PER_HORSE_DAY;

  grabbedHorsesPerCity.set(city.cityId, grabbedHorses.quantity);
}

function calculateDistance(cell1: CellPosition, cell2: CellPosition): number {
  const x = cell1[0] - cell2[0];
  const y = cell1[1] - cell2[1];

  return Math.sqrt(x ** 2 + y ** 2);
}

function addResource(storage: StorageItem[], addItem: StorageItem): void {
  if (addItem.quantity === 0) {
    return;
  }

  const alreadyResource = storage.find(
    (item) => item.resourceType === addItem.resourceType,
  );

  if (alreadyResource) {
    alreadyResource.quantity += addItem.quantity;
  } else {
    storage.push(addItem);
  }
}

function grabResource(
  storage: StorageItem[],
  grabItem: StorageItem,
): StorageItem {
  const foundResource = storage.find(
    (item) => item.resourceType === grabItem.resourceType,
  );

  if (!foundResource) {
    return {
      resourceType: grabItem.resourceType,
      quantity: 0,
    };
  }

  if (foundResource.quantity <= grabItem.quantity) {
    const index = storage.indexOf(foundResource);
    storage.splice(index, 1);
    return {
      resourceType: grabItem.resourceType,
      quantity: foundResource.quantity,
    };
  }

  foundResource.quantity -= grabItem.quantity;
  return grabItem;
}

function getCountOf(
  storage: StorageItem[],
  resourceType: ResourceType,
): number {
  return (
    storage.find((item) => item.resourceType === resourceType)?.quantity ?? 0
  );
}

function isSamePos(cell1: CellPosition, cell2: CellPosition): boolean {
  return cell1[0] === cell2[0] && cell1[1] === cell2[1];
}

function isSamePath(path1: CellPath, path2: CellPath): boolean {
  return (
    isExactSamePath(path1, path2) ||
    isExactSamePath(path1, { from: path2.to, to: path2.from })
  );
}

function isExactSamePath(path1: CellPath, path2: CellPath): boolean {
  return isSamePos(path1.from, path2.from) && isSamePos(path1.to, path2.to);
}

export function getStructureIterationStorageInfo(
  facility: Facility | Construction,
): {
  iterationPeopleDays: number;
  input: StorageItem[];
  output: StorageItem[];
} {
  if (facility.type === FacilityType.CONSTRUCTION) {
    const info = facilitiesConstructionInfo[facility.buildingFacilityType];
    return {
      iterationPeopleDays: info.iterationPeopleDays,
      input: info.input,
      output: [],
    };
  }

  const iterationInfo = facilitiesIterationInfo[facility.type];

  return iterationInfo.productionVariants[facility.productionVariant];
}

function getMaximumIterationsByResources(
  facility: Facility | Construction,
): number {
  let minIterations = Infinity;

  for (let resource of getStructureIterationStorageInfo(facility).input) {
    const iterations = Math.floor(
      getCountOf(facility.input, resource.resourceType) / resource.quantity,
    );

    if (iterations < minIterations) {
      minIterations = iterations;
    }
  }

  return minIterations;
}

function getIterationsUntilOverDone(facility: Facility, city: City): number {
  let minIterations = Infinity;

  const info = getStructureIterationStorageInfo(facility);

  for (let resource of info.output) {
    const maxPerDay =
      resource.quantity *
      (facility.assignedWorkersCount /
        info.iterationPeopleDays /
        city.peopleWorkModifier);

    const iterations = Math.ceil(
      (maxPerDay * BUFFER_DAYS -
        getCountOf(facility.output, resource.resourceType)) /
        resource.quantity,
    );

    if (iterations < minIterations) {
      minIterations = iterations;
    }
  }

  return Math.max(0, minIterations);
}

function getIterationsUntilConstructionComplete(
  construction: Construction,
): number {
  const iterationInfo =
    facilitiesConstructionInfo[construction.buildingFacilityType];

  return Math.ceil(
    iterationInfo.iterations -
      construction.iterationsComplete -
      construction.inProcess,
  );
}

function removeIterationInput(
  facility: Facility | Construction,
  iterationCount: number,
): void {
  const info = getStructureIterationStorageInfo(facility);

  for (const resource of info.input) {
    const quantity = iterationCount * resource.quantity;

    const grabbedResource = grabResource(facility.input, {
      resourceType: resource.resourceType,
      quantity,
    });

    if (grabbedResource.quantity !== quantity) {
      throw new Error();
    }
  }
}

function addIterationOutput(facility: Facility, iterationCount: number): void {
  const iterationInfo = getStructureIterationStorageInfo(facility);

  for (const resource of iterationInfo.output) {
    addResource(facility.output, {
      resourceType: resource.resourceType,
      quantity: iterationCount * resource.quantity,
    });
  }
}

function getPathFacilities(
  city: City,
  facilities: (Facility | Construction)[],
  path: CellPath,
): { from: Structure | undefined; to: Structure | undefined } {
  return {
    from: getFacilityByPos(city, facilities, path.from),
    to: getFacilityByPos(city, facilities, path.to),
  };
}

function getFacilityByPos(
  city: City,
  facilities: (Facility | Construction)[],
  pos: CellPosition,
): Structure | undefined {
  if (isSamePos(city.position, pos)) {
    return city;
  }

  return facilities.find((facility) => isSamePos(facility.position, pos));
}

export type CellId = Branded<number, 'cellId'>;

const ROW_SIZE = 2 ** 26;
const ROW_HALF_SIZE = ROW_SIZE / 2;

export function convertCellToCellId(cell: CellPosition): CellId {
  const x = cell[0] + ROW_HALF_SIZE;
  const y = cell[1] + ROW_HALF_SIZE;

  return (y * ROW_SIZE + x) as CellId;
}

export function addCity(
  gameState: GameState,
  { position }: { position: CellPosition },
): City {
  const cellId = convertCellToCellId(position);

  const city: City = {
    cityId: cellId as unknown as CityId,
    type: FacilityType.CITY,
    name: generateNewCityName(gameState.alreadyCityNames, true),
    position,
    cellId: cellId,
    population: MINIMAL_CITY_PEOPLE,
    carrierPaths: [],
    totalAssignedWorkersCount: 0,
    peopleDayPerCell: BASE_PEOPLE_DAY_PER_CELL,
    weightPerPeopleDay: BASE_WEIGHT_PER_PEOPLE_DAY,
    peopleWorkModifier: BASE_PEOPLE_WORK_MODIFIER,
    lastTickNeedPopulation: 0,
    lastTickWorkingPaths: [],
    input: [],
    output: [],
  };

  gameState.cities.push(city);
  gameState.facilitiesByCityId.set(city.cityId, []);
  gameState.structuresByCellId.set(cellId, city);

  return city;
}

function addCityFacility(
  gameState: GameState,
  city: City,
  facility: Facility | Construction,
): void {
  const facilities = gameState.facilitiesByCityId.get(city.cityId)!;

  facilities.push(facility);

  gameState.structuresByCellId.set(facility.cellId, facility);
}

export function addConstructionStructure(
  gameState: GameState,
  {
    facilityType,
    position,
  }: { facilityType: ExactFacilityType; position: CellPosition },
  city: City,
): void {
  const cellId = convertCellToCellId(position);

  const buildingFacilility: Construction = {
    type: FacilityType.CONSTRUCTION,
    assignedCityId: city.cityId,
    position,
    cellId,
    buildingFacilityType: facilityType,
    assignedWorkersCount:
      facilitiesConstructionInfo[facilityType].maximumPeopleAtWork,
    input: [],
    output: [],
    inProcess: 0,
    iterationsComplete: 0,
  };

  addCityFacility(gameState, city, buildingFacilility);
}

function completeConstruction(
  gameState: GameState,
  construction: Construction,
): Facility {
  const facility: Facility = {
    type: construction.buildingFacilityType,
    assignedCityId: construction.assignedCityId,
    position: construction.position,
    cellId: construction.cellId,
    assignedWorkersCount:
      facilitiesIterationInfo[construction.buildingFacilityType]
        .maximumPeopleAtWork,
    productionVariant: 0,
    input: [],
    output: [],
    inProcess: 0,
  };

  removeAllCarrierPathsTo(gameState, facility.cellId);
  replaceCunstructionByFacility(gameState, construction, facility);

  return facility;
}

function replaceCunstructionByFacility(
  gameState: GameState,
  construction: Construction,
  facility: Facility,
): void {
  const facilities = gameState.facilitiesByCityId.get(facility.assignedCityId)!;
  const index = facilities.indexOf(construction);
  if (index === -1) {
    throw new Error('No construction found');
  }

  facilities[index] = facility;
  gameState.structuresByCellId.set(facility.cellId, facility);
}

function removeAllCarrierPathsTo(gameState: GameState, cellId: CellId): void {
  const paths = gameState.carrierPathsToCellId.get(cellId);

  if (paths) {
    for (const path of paths) {
      const fromPaths = gameState.carrierPathsFromCellId.get(
        convertCellToCellId(path.path.from),
      );

      if (fromPaths) {
        removeArrayItem(fromPaths, path);
      }
    }

    for (const city of gameState.cities) {
      for (const path of paths) {
        removeArrayItem(city.carrierPaths, path);
      }
    }

    gameState.carrierPathsToCellId.delete(cellId);
  }
}

function removeArrayItem<T>(array: T[], item: T): void {
  const index = array.indexOf(item);
  if (index !== -1) {
    array.splice(index, 1);
  }
}

function getMaximumAddingLimit(
  facility: Construction,
  resourceType: ResourceType,
): number {
  const constructionInfo =
    facilitiesConstructionInfo[facility.buildingFacilityType];

  const iterationInput = constructionInfo.input.find(
    (resource) => resource.resourceType === resourceType,
  );

  if (!iterationInput) {
    return 0;
  }

  const alreadyQuantity =
    facility.input.find((resource) => resource.resourceType === resourceType)
      ?.quantity ?? 0;

  const restIterations =
    constructionInfo.iterations -
    (facility.iterationsComplete + (facility.inProcess > 0 ? 1 : 0));

  if (restIterations <= 0) {
    return 0;
  }

  return Math.max(
    0,
    iterationInput.quantity * restIterations - alreadyQuantity,
  );
}

export function getNearestCity(gameState: GameState, cell: CellPosition): City {
  let nearestCity: City | undefined;
  let nearestCityDistance = Infinity;

  for (const city of gameState.cities.values()) {
    const distance = calculateDistance(city.position, cell);

    if (
      distance < nearestCityDistance ||
      (nearestCity &&
        distance === nearestCityDistance &&
        nearestCity.population < city.population)
    ) {
      nearestCity = city;
      nearestCityDistance = distance;
    }
  }

  if (!nearestCity) {
    throw new Error('Invariant');
  }

  return nearestCity;
}

export function getFacilityBindedCity(
  gameState: GameState,
  facility: Structure,
): City {
  if (facility.type === FacilityType.CITY) {
    return facility;
  }

  facility.position;
  for (const [cityId, facilities] of gameState.facilitiesByCityId) {
    if (facilities.includes(facility)) {
      return gameState.cities.find((city) => city.cityId === cityId)!;
    }
  }

  throw new Error('No binded city');
}
