import sample from 'lodash/sample';

import type { Branded } from '../utils/types';

import { generateNewCityName } from './cityNameGenerator';
import {
  CarrierPath,
  CellPath,
  CellPosition,
  ExactFacilityType,
  FacilityType,
  ResourceType,
  StorageItem,
  WorkingPath,
} from './types';
import {
  FacilityIterationInfo,
  facilitiesIterationInfo,
} from './facilitiesIterationInfo';

const PEOPLE_DAY_PER_CELL = 0.02;
const WEIGHT_PER_PEOPLE_DAY = 2.5;
const BUFFER_DAYS = 2;
const MINIMAL_CITY_PEOPLE = 3;
const PEOPLE_FOOD_PER_DAY = 0.2;

export type GameState = {
  cities: City[];
  facilitiesByCityId: Map<CityId, (Construction | Facility)[]>;
  structuresByCellId: Map<CellId, Structure>;
  carrierPathsFromCellId: Map<CellId, CarrierPath[]>;
  carrierPathsToCellId: Map<CellId, CarrierPath[]>;
  alreadyCityNames: Set<string>;
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
  workingPaths: WorkingPath[];
};

export type Construction = StructureBase & {
  type: FacilityType.BUILDING;
  buildingFacilityType: ExactFacilityType;
  buildingStage: number;
  buildingTime: number;
  assignedWorkersCount: number;
};

export type Facility = (StructureBase & {
  assignedWorkersCount: number;
}) &
  (
    | {
        type: FacilityType.LAMBERT;
        inProcess: number;
      }
    | {
        type: FacilityType.CHOP_WOOD;
        inProcess: number;
      }
    | {
        type: FacilityType.GATHERING;
        inProcess: number;
      }
  );

export type Structure = City | Construction | Facility;

export function startGame(): GameState {
  const initialGameState: GameState = {
    cities: [],
    facilitiesByCityId: new Map(),
    carrierPathsFromCellId: new Map(),
    carrierPathsToCellId: new Map(),
    structuresByCellId: new Map(),
    alreadyCityNames: new Set<string>(),
  };

  const initialCity = addCity(initialGameState, {
    position: [0, 0],
  });

  addConstructionStructure(
    initialGameState,
    { facilityType: FacilityType.LAMBERT, position: [-2, -3] },
    initialCity,
  );

  addFacility(
    initialGameState,
    {
      facilityType: FacilityType.CHOP_WOOD,
      position: [3, -3],
    },
    initialCity,
  );

  addFacility(
    initialGameState,
    {
      facilityType: FacilityType.GATHERING,
      position: [-3, 2],
    },
    initialCity,
  );

  addCityCarrierPaths(initialGameState, initialCity, [
    {
      path: { from: [-2, -3], to: [3, -3] },
      resourceType: ResourceType.LOG,
      people: 3,
    },
    {
      path: { from: [-3, 2], to: [0, 0] },
      resourceType: ResourceType.FOOD,
      people: 3,
    },
  ]);

  return initialGameState;
}

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

function addPathTo(
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

const MAX_BUILDING_PEOPLE = 4;

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

  const planPerCity = new Map<CityId, { jobs: PlannedJob[] }>();

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

      if (facility.type === FacilityType.BUILDING) {
        registerJob(
          { type: 'facility', facility, distance },
          MAX_BUILDING_PEOPLE,
          MAX_BUILDING_PEOPLE,
        );
      } else {
        const iterationInfo = facilitiesIterationInfo[facility.type];

        if (iterationInfo) {
          let needPeople = 0;

          if (facility.inProcess > 0) {
            needPeople +=
              (1 - facility.inProcess) * iterationInfo.iterationPeopleDays;
          }

          const resourcesForIterations = getMaximumIterationsByResources(
            iterationInfo,
            facility,
          );

          const iterationsUntilOverDone = getIterationsUntilOverDone(
            iterationInfo,
            facility,
          );

          needPeople +=
            Math.min(
              resourcesForIterations,
              Math.max(
                0,
                iterationsUntilOverDone + (facility.inProcess > 0 ? -1 : 0),
              ),
            ) * iterationInfo.iterationPeopleDays;

          if (needPeople > 0) {
            const max = facility.assignedWorkersCount;

            const onePersonWork = 1 - distance * 0.05;
            const people = Math.min(max, Math.ceil(needPeople / onePersonWork));

            registerJob({ type: 'facility', facility, distance }, people, max);
          }
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
        const toIterationInfo = facilitiesIterationInfo[toFacility.type];

        const resourceIterationInfo = toIterationInfo.input.find(
          (input) => input.resourceType === carrierPath.resourceType,
        )!;

        maxInput =
          resourceIterationInfo.quantity *
          (toFacility.assignedWorkersCount /
            toIterationInfo.iterationPeopleDays) *
          BUFFER_DAYS;

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

      const remains = 1 - commingDistance * PEOPLE_DAY_PER_CELL;

      const needPeople = Math.ceil(
        ((needToMove / WEIGHT_PER_PEOPLE_DAY) * moveDistance) / remains,
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

  // Carriers get items

  const currentlyMovingProducts: {
    facility: Structure;
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

        const remains = 1 - commingDistance * PEOPLE_DAY_PER_CELL;

        const power = remains * people;

        let movedWeight = (power / moveDistance) * WEIGHT_PER_PEOPLE_DAY;
        movedWeight = Math.floor(movedWeight * 10) / 10;

        const grabbedItem = grabResource(fromFacility.output, {
          resourceType: carrierPath.resourceType,
          quantity: movedWeight,
        });

        currentlyMovingProducts.push({
          facility: toFacility,
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

        if (facility.type === FacilityType.BUILDING) {
          const progress = peopleAfterWalk / facility.buildingTime;
          facility.buildingStage += progress;

          if (facility.buildingStage >= 1) {
            completeConstruction(gameState, facility);
          }
        } else {
          const iterationInfo = facilitiesIterationInfo[facility.type];

          const wasInProcess = facility.inProcess > 0;

          facility.inProcess +=
            peopleAfterWalk / iterationInfo.iterationPeopleDays;

          let inprogressDone = 0;

          if (wasInProcess && facility.inProcess >= 1) {
            facility.inProcess -= 1;
            inprogressDone += 1;
          }

          const resourceForIterations = getMaximumIterationsByResources(
            iterationInfo,
            facility,
          );

          const peopleForIterations = Math.ceil(facility.inProcess);

          const iterationsUntilOverDone = Math.max(
            0,
            getIterationsUntilOverDone(iterationInfo, facility) -
              inprogressDone,
          );

          const resourceIterations = Math.min(
            iterationsUntilOverDone,
            resourceForIterations,
            peopleForIterations,
          );

          if (resourceIterations > 0) {
            removeIterationInput(iterationInfo, facility, resourceIterations);
          }

          let doneIterations = inprogressDone;

          if (resourceIterations === peopleForIterations) {
            doneIterations += Math.floor(facility.inProcess);
            facility.inProcess = facility.inProcess % 1;
          } else {
            doneIterations += resourceIterations;
            facility.inProcess = 0;
          }

          if (doneIterations > 0) {
            addIterationOutput(iterationInfo, facility, doneIterations);
          }
        }
      }
    }
  }

  // Carriers have brought items

  for (const { facility, resource } of currentlyMovingProducts) {
    addResource(facility.input, resource);
  }

  // Apply cities' working paths

  for (const city of gameState.cities) {
    const { jobs } = planPerCity.get(city.cityId)!;

    city.workingPaths = [];

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

      const alreadyPath = city.workingPaths.find((path) =>
        isSamePath(path.path, workingPath.path),
      );

      if (alreadyPath) {
        alreadyPath.workers += workingPath.workers;
        alreadyPath.carriers += workingPath.carriers;
      } else {
        city.workingPaths.push(workingPath);
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

function getMaximumIterationsByResources(
  iterationInfo: FacilityIterationInfo,
  facility: Facility,
): number {
  let minIterations = Infinity;

  for (let resource of iterationInfo.input) {
    const iterations = Math.floor(
      getCountOf(facility.input, resource.resourceType) / resource.quantity,
    );

    if (iterations < minIterations) {
      minIterations = iterations;
    }
  }

  return minIterations;
}

function getIterationsUntilOverDone(
  iterationInfo: FacilityIterationInfo,
  facility: Facility,
): number {
  let minIterations = Infinity;

  for (let resource of iterationInfo.output) {
    const maxPerDay =
      resource.quantity *
      (facility.assignedWorkersCount / iterationInfo.iterationPeopleDays);

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

function removeIterationInput(
  iterationInfo: FacilityIterationInfo,
  facility: Facility,
  iterationCount: number,
): void {
  for (const resource of iterationInfo.input) {
    const quantity = iterationCount * resource.quantity;

    const grabbedResource = grabResource(facility.input, {
      resourceType: ResourceType.LOG,
      quantity,
    });

    if (grabbedResource.quantity !== quantity) {
      throw new Error();
    }
  }
}

function addIterationOutput(
  iterationInfo: FacilityIterationInfo,
  facility: Facility,
  iterationCount: number,
): void {
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
    position: [0, 0],
    cellId: cellId,
    population: MINIMAL_CITY_PEOPLE,
    carrierPaths: [],
    workingPaths: [],
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
    type: FacilityType.BUILDING,
    position,
    cellId,
    buildingFacilityType: facilityType,
    buildingStage: 0,
    buildingTime: 4,
    assignedWorkersCount:
      facilitiesIterationInfo[FacilityType.BUILDING].maximumPeopleAtWork,
    input: [],
    output: [],
  };

  addCityFacility(gameState, city, buildingFacilility);
}

function addFacility(
  gameState: GameState,
  {
    facilityType,
    position,
  }: { facilityType: ExactFacilityType; position: CellPosition },
  city: City,
): void {
  const cellId = convertCellToCellId(position);

  const facility = {
    type: facilityType,
    position,
    cellId,
    assignedWorkersCount:
      facilitiesIterationInfo[facilityType].maximumPeopleAtWork,
    input: [],
    output: [],
    inProcess: 0,
  };

  addCityFacility(gameState, city, facility);
}

function completeConstruction(
  gameState: GameState,
  constuction: Construction,
): Facility {
  const facility = {
    type: constuction.buildingFacilityType,
    position: constuction.position,
    cellId: constuction.cellId,
    assignedWorkersCount:
      facilitiesIterationInfo[constuction.buildingFacilityType]
        .maximumPeopleAtWork,
    input: [],
    output: [],
    inProcess: 0,
  };

  for (const facilities of gameState.facilitiesByCityId.values()) {
    const index = facilities.indexOf(constuction);

    if (index !== -1) {
      facilities[index] = facility;
      break;
    }
  }

  gameState.structuresByCellId.set(facility.cellId, facility);

  return facility;
}
