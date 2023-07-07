import { addToMapSet } from '@/utils/helpers';

import {
  OUTPUT_BUFFER_DAYS,
  INPUT_BUFFER_DAYS,
  MINIMAL_CITY_PEOPLE,
  BASE_WEIGHT_PER_PEOPLE_DAY,
  CITY_BUFFER_DAYS,
  RESEARCH_WORK_PERSON_MODIFICATOR,
} from './consts';
import {
  CarrierPath,
  CarrierPathType,
  City,
  Construction,
  Facility,
  FacilityType,
  GameState,
  StorageItem,
  CarrierPathReport,
  FacilityWorkReport,
  ExactFacilityType,
  ResearchId,
} from './types';
import {
  addCarrierPath,
  addResource,
  addResources,
  completeConstruction,
  createEmptyCityReport,
  getCarrierPathStructures,
  // actualizeCityTotalAssignedWorkersCount,
  // addIterationOutput,
  getIterationsUntilConstructionComplete,
  getMaximumAddingLimit,
  // getIterationsUntilOverDone,
  // getMaximumAddingLimit,
  // getMaximumIterationsByResources,
  // getStructureIterationStorageInfo,
  // removeIterationInput,
  getResourceCount,
  getStructureIterationStorageInfo,
  grabResource,
  grabResourceStrict,
  grabResourcesStrict,
  multiplyResourceStorage,
  removeAllCarrierPathsTo,
} from './gameState';
import { researches } from './research';
import { ResourceType } from './resources';
import {
  facilitiesConstructionInfo,
  facilitiesIterationInfo,
} from './facilities';
import { isSamePath, isExactFacility, getCarrierPathDistance } from './helpers';
import { Booster, boosters, cityResourcesInput } from './boosters';

// type TickTemporalStorage = {};

type FacilityWork = {
  facility: Facility | Construction;
  workDays: number;
};

type CarrierWork = {
  carrierPath: CarrierPath;
  workDays: number;
};

export function tick(gameState: GameState): void {
  // const temp: TickTemporalStorage = {};

  gameState.tickNumber += 1;

  console.groupCollapsed(`Tick ${gameState.tickNumber}`);

  for (const city of gameState.cities.values()) {
    city.lastTickReport = createEmptyCityReport();

    const facilities = gameState.facilitiesByCityId.get(city.cityId)!;

    // TODO: Actualize only when something changed in city
    for (const facility of facilities) {
      if (facility.type === FacilityType.CONSTRUCTION) {
        addConstructionInputPaths(gameState, city, facility);
      }
    }

    let totalWorkersWorkDays = 0;
    let totalCarriersWorkDays = 0;

    const facilitiesWork: FacilityWork[] = [];

    const currentCarrierPaths: CarrierWork[] = [];

    for (const facility of facilities) {
      if (!facility.isPaused) {
        const workDays = getFacilityBaseWorkDays(facility);

        if (workDays) {
          totalWorkersWorkDays += workDays;
          facilitiesWork.push({ facility, workDays });
          console.log('Work', facility.type, workDays);
        }
      }
    }

    for (const carrierPath of city.carrierPaths) {
      if (isCarrierPathAllowed(gameState, carrierPath)) {
        const workDays = getCarrierPathBaseWorkDays(gameState, carrierPath);

        if (workDays) {
          totalCarriersWorkDays += workDays;
          currentCarrierPaths.push({ carrierPath, workDays });
          console.log('Carry', carrierPath.resourceType, workDays);
        }
      }
    }

    const { workRatio, totalPeopleCount } = applyCityModifiers(city, {
      needWorkerWorkHours: totalWorkersWorkDays,
      needCarrierWorkHours: totalCarriersWorkDays,
    });

    city.lastTickReport.needPopulation = Math.ceil(totalPeopleCount);

    console.log('workRatio:', workRatio);

    for (const { facility, workDays } of facilitiesWork) {
      const actualWorkDays = workDays * workRatio;

      doFacilityWork(gameState, facility, actualWorkDays);
    }

    for (const { carrierPath, workDays } of currentCarrierPaths) {
      const actualWorkDays = workDays * workRatio;

      doCarryWork(gameState, carrierPath, actualWorkDays);
    }

    fillInCityWorkReport(city, facilitiesWork, currentCarrierPaths, workRatio);
  }

  researchPhase(gameState);

  growPhase(gameState);

  console.groupEnd();
}

function fillInCityWorkReport(
  city: City,
  facilitiesWork: FacilityWork[],
  carriersWork: CarrierWork[],
  workRatio: number,
): void {
  const carrierPathReports: CarrierPathReport[] = [];
  const facilityWorkerReports: FacilityWorkReport[] = [];

  for (const { facility, workDays } of facilitiesWork) {
    facilityWorkerReports.push({
      facility,
      workers: workDays * workRatio,
    });
  }

  for (const { carrierPath, workDays } of carriersWork) {
    const { from, to } = carrierPath.path;

    const alreadyPath = carrierPathReports.find((path) =>
      isSamePath(path.path, carrierPath.path),
    );

    const carriersCount = workDays * workRatio;

    if (alreadyPath) {
      alreadyPath.carriers += carriersCount;
    } else {
      carrierPathReports.push({
        path: { from, to },
        carriers: carriersCount,
      });
    }
  }

  city.lastTickReport.carrierPathReports = carrierPathReports;
  city.lastTickReport.facilityWorkerReports = facilityWorkerReports;
}

(window as any).completeAllConstruction = () => {
  const gs = (window as any).gameState;

  for (const facilities of gs.facilitiesByCityId.values()) {
    for (const facility of facilities) {
      if (facility.type === FacilityType.CONSTRUCTION) {
        completeConstruction(gs, facility);
      }
    }
  }
};

function getFacilityBaseWorkDays(facility: Facility | Construction): number {
  const maximumPeopleAtWork = getMaximumPeopleAtWork(facility);
  const iterationInfo = getStructureIterationStorageInfo(facility);

  const endCurrentIteration =
    facility.inProcess > 0 ? 1 - facility.inProcess : 0;

  const maxInputIterations =
    getAssuredByResourcesIterationsCount(facility) + endCurrentIteration;

  if (maxInputIterations === 0) {
    return 0;
  }

  const maxOutpuIterationsRaw =
    facility.type === FacilityType.CONSTRUCTION
      ? getIterationsUntilConstructionComplete(facility)
      : getIterationsCountUntilCap(facility);

  const maxOutputIterations = Math.max(
    0,
    maxOutpuIterationsRaw - facility.inProcess,
  );

  if (maxOutputIterations === 0) {
    return 0;
  }

  const maxIterations = maximumPeopleAtWork;

  const actualIterations = Math.min(
    maxInputIterations,
    maxOutputIterations,
    maxIterations,
  );

  return actualIterations * iterationInfo.iterationPeopleDays;
}

function getMaximumPeopleAtWork(structure: Facility | Construction): number {
  if (structure.type === FacilityType.CONSTRUCTION) {
    const info = facilitiesConstructionInfo[structure.buildingFacilityType];
    return info.maximumPeopleAtWork;
  }

  return facilitiesIterationInfo[structure.type].maximumPeopleAtWork;
}

function getAssuredByResourcesIterationsCount(
  facility: Facility | Construction,
): number {
  const iterationInfo = getStructureIterationStorageInfo(facility);
  return getIterationsCountByStorage(facility.input, iterationInfo.input);
}

function getIterationsCountByStorage(
  storage: StorageItem[],
  iteration: StorageItem[],
): number {
  let iterationsCount = Infinity;

  for (const { resourceType, quantity } of iteration) {
    const totalCount = getResourceCount(storage, resourceType);
    const itemIterationsCount = Math.floor(totalCount / quantity);

    if (itemIterationsCount < iterationsCount) {
      iterationsCount = itemIterationsCount;
    }
  }
  return iterationsCount;
}

function getIterationsCountUntilCap(facility: Facility): number {
  const info = facilitiesIterationInfo[facility.type];
  const iterationInfo = getStructureIterationStorageInfo(facility);

  const alreadyIterations = getMaxIterationsCountByStorage(
    facility.output,
    iterationInfo.output,
  );

  const oneIterationWorkDays =
    iterationInfo.iterationPeopleDays / info.maximumPeopleAtWork;

  const days = alreadyIterations * oneIterationWorkDays;

  if (days >= OUTPUT_BUFFER_DAYS) {
    return 0;
  }

  const peopleDaysUntilCap = OUTPUT_BUFFER_DAYS - days;

  return peopleDaysUntilCap / oneIterationWorkDays;
}

function getMaxIterationsCountByStorage(
  storage: StorageItem[],
  iteration: StorageItem[],
): number {
  let iterationsCount = 0;

  for (const { resourceType, quantity } of iteration) {
    const totalCount = getResourceCount(storage, resourceType);
    const itemIterationsCount = totalCount / quantity;

    if (itemIterationsCount > iterationsCount) {
      iterationsCount = itemIterationsCount;
    }
  }
  return iterationsCount;
}

function getCarrierPathBaseWorkDays(
  gameState: GameState,
  carrierPath: CarrierPath,
): number {
  // TODO:
  //   paths doesn't know about others
  //   could be over move or over grab

  const { to, from } = getCarrierPathStructures(gameState, carrierPath);

  if (to.type !== FacilityType.CITY && to.isPaused) {
    return 0;
  }

  const outputCount = getResourceCount(from.output, carrierPath.resourceType);

  if (outputCount === 0) {
    return 0;
  }

  // TODO: Precalculate
  const distance = getCarrierPathDistance(carrierPath);

  const alreadyCount = getResourceCount(to.input, carrierPath.resourceType);

  let needCount = 0;

  if (to.type === FacilityType.CITY) {
    if (cityResourcesInput.includes(carrierPath.resourceType)) {
      const booster = Object.values(boosters).find(
        ({ resourceType }) => resourceType === carrierPath.resourceType,
      );

      if (booster) {
        const cap =
          to.population * boosters.population.perWorker * CITY_BUFFER_DAYS;
        needCount = cap - alreadyCount;
      }
    }
  } else {
    const maximumPeopleAtWork = getMaximumPeopleAtWork(to);

    const iterationInfo = getStructureIterationStorageInfo(to);

    const iterationWorkDays =
      iterationInfo.iterationPeopleDays / maximumPeopleAtWork;

    const maximumIterations = INPUT_BUFFER_DAYS / iterationWorkDays;

    const iterationResourceCount = getResourceCount(
      iterationInfo.input,
      carrierPath.resourceType,
    );

    const capResourceCount = maximumIterations * iterationResourceCount;

    const needResourceCount = capResourceCount - alreadyCount;

    needCount = needResourceCount;
  }

  if (needCount <= 0) {
    return 0;
  }

  const moveCount = Math.min(outputCount, needCount);

  return (moveCount * distance) / BASE_WEIGHT_PER_PEOPLE_DAY;
}

function growPhase(gameState: GameState): void {
  for (const city of gameState.cities.values()) {
    const roundedPopulation = Math.floor(city.population);
    const needFood = roundedPopulation * boosters.population.perWorker;

    const grabbedFood = grabResource(city.input, {
      resourceType: ResourceType.FOOD,
      quantity: needFood,
    });

    if (grabbedFood.quantity === needFood) {
      if (getResourceCount(city.input, ResourceType.FOOD) > 0) {
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

function researchPhase(gameState: GameState): void {
  if (!gameState.currentResearchId) {
    return;
  }

  let researchPoints = 0;

  for (const city of gameState.cities.values()) {
    const freePeople = Math.max(
      0,
      city.population - city.lastTickReport.needPopulation,
    );

    const researchWorkDays =
      freePeople +
      (city.population - freePeople) * RESEARCH_WORK_PERSON_MODIFICATOR;

    const needBoosters = researchWorkDays * boosters.research.perWorker;

    const { quantity: grabbedBoosters } = grabResource(city.input, {
      resourceType: boosters.research.resourceType,
      quantity: needBoosters,
    });

    researchPoints +=
      researchWorkDays *
      (1 + boosters.research.boost * (grabbedBoosters / needBoosters));
  }

  if (researchPoints > 0) {
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
      completeResearch(gameState, researchInfo.researchId);
      gameState.currentResearchId = undefined;
    }
  }
}

function completeResearch(gameState: GameState, researchId: ResearchId): void {
  const researchInfo = researches[researchId];

  gameState.completedResearches.add(researchId);
  gameState.inProgressResearches.delete(researchId);

  for (const facilityType of researchInfo.unlockFacilities) {
    gameState.unlockedFacilities.add(facilityType);
  }

  if (researchInfo.unlockProductionVariants) {
    for (const [facilityType, productVariants] of Object.entries(
      researchInfo.unlockProductionVariants,
    )) {
      addToMapSet(
        gameState.unlockedProductionVariants,
        facilityType as ExactFacilityType,
        productVariants,
      );
    }
  }
}

function doFacilityWork(
  gameState: GameState,
  facility: Facility | Construction,
  workDays: number,
): void {
  const iterationInfo = getStructureIterationStorageInfo(facility);

  const doIterations = workDays / iterationInfo.iterationPeopleDays;

  const wasInProcess = facility.inProcess > 0;

  const updatedIterations = facility.inProcess + doIterations;

  const resourcesIterations =
    Math.ceil(updatedIterations) + (wasInProcess ? -1 : 0);

  if (resourcesIterations > 0) {
    grabIterationsResources(facility, resourcesIterations);
  }

  facility.inProcess = updatedIterations % 1;

  const doneIterations = Math.floor(updatedIterations);
  if (doneIterations > 0) {
    if (facility.type === FacilityType.CONSTRUCTION) {
      facility.iterationsComplete += doneIterations;
      checkConstructionComplete(gameState, facility);
    } else {
      addIterationsResources(facility, doneIterations);
    }
  }
}

function doCarryWork(
  gameState: GameState,
  carrierPath: CarrierPath,
  workDays: number,
): void {
  const { to, from } = getCarrierPathStructures(gameState, carrierPath);

  const distance = getCarrierPathDistance(carrierPath);
  let moveQuantity = (workDays * BASE_WEIGHT_PER_PEOPLE_DAY) / distance;

  if (to.type === FacilityType.CONSTRUCTION) {
    const maximumCount = getMaximumAddingLimit(to, carrierPath.resourceType);
    moveQuantity = Math.min(moveQuantity, maximumCount);
  }

  const movingResource: StorageItem = {
    resourceType: carrierPath.resourceType,
    quantity: moveQuantity,
  };

  const grabbedItem = grabResource(from.output, movingResource);

  // TODO: Check correctness
  if (grabbedItem.quantity !== movingResource.quantity) {
    console.warn('Carring quantity reduction');
  }

  addResource(to.input, grabbedItem);
}

function grabIterationsResources(
  facility: Facility | Construction,
  iterationsCount: number,
): void {
  const iterationInfo = getStructureIterationStorageInfo(facility);

  const grabResources = multiplyResourceStorage(
    iterationInfo.input,
    iterationsCount,
  );

  grabResourcesStrict(facility.input, grabResources);
}

function addIterationsResources(
  facility: Facility,
  iterationsCount: number,
): void {
  const iterationInfo = getStructureIterationStorageInfo(facility);

  const totalOutputResources = multiplyResourceStorage(
    iterationInfo.output,
    iterationsCount,
  );

  addResources(facility.output, totalOutputResources);
}

function applyCityModifiers(
  city: City,
  {
    needWorkerWorkHours,
    needCarrierWorkHours,
  }: { needWorkerWorkHours: number; needCarrierWorkHours: number },
): { workRatio: number; totalPeopleCount: number } {
  const workerWorkHours = applyCityModifier(city, {
    workDays: needWorkerWorkHours,
    booster: boosters.worker,
  });

  const carrierWorkHours = applyCityModifier(city, {
    workDays: needCarrierWorkHours,
    booster: boosters.carrier,
  });

  const totalWorkHours = workerWorkHours + carrierWorkHours;

  return {
    workRatio: Math.min(1, city.population / totalWorkHours),
    totalPeopleCount: totalWorkHours,
  };
}

function applyCityModifier(
  city: City,
  {
    workDays,
    booster: { resourceType, perWorker, boost },
  }: {
    workDays: number;
    booster: Booster;
  },
): number {
  const haveResourceCount = getResourceCount(city.input, resourceType);
  const totalBoost = 1 + boost;

  const needResourceCount = (workDays / totalBoost) * perWorker;

  let actualWorkDays;
  let usedResourceCount = 0;

  if (haveResourceCount >= needResourceCount) {
    actualWorkDays = workDays / totalBoost;
    usedResourceCount = needResourceCount;
  } else {
    const ratio = haveResourceCount / needResourceCount;
    actualWorkDays = workDays * (1 - ratio) + (workDays * ratio) / totalBoost;
    usedResourceCount = haveResourceCount;
  }

  grabResourceStrict(city.input, {
    resourceType,
    quantity: usedResourceCount,
  });

  return actualWorkDays;
}

function addConstructionInputPaths(
  gameState: GameState,
  city: City,
  construction: Construction,
): void {
  removeAllCarrierPathsTo(
    gameState,
    construction.position.cellId,
    CarrierPathType.CONSTRUCTION,
  );

  const constructionIterationInfo =
    getStructureIterationStorageInfo(construction);

  const facilities = gameState.facilitiesByCityId.get(city.cityId)!;

  for (const facility of facilities) {
    if (isExactFacility(facility.type)) {
      const iterationInfo = getStructureIterationStorageInfo(facility);

      for (const { resourceType } of constructionIterationInfo.input) {
        for (const {
          resourceType: facilityResourceType,
        } of iterationInfo.output) {
          if (resourceType === facilityResourceType) {
            addCarrierPath(gameState, {
              assignedCityId: city.cityId,
              people: 1,
              resourceType,
              pathType: CarrierPathType.CONSTRUCTION,
              path: {
                from: facility.position,
                to: construction.position,
              },
            });
          }
        }
      }
    }
  }
}

function checkConstructionComplete(
  gameState: GameState,
  construction: Construction,
): void {
  const constructionInfo =
    facilitiesConstructionInfo[construction.buildingFacilityType];

  if (construction.iterationsComplete >= constructionInfo.iterations) {
    completeConstruction(gameState, construction);
  }
}

function isCarrierPathAllowed(
  gameState: GameState,
  carrierPath: CarrierPath,
): boolean {
  const to = gameState.structuresByCellId.get(carrierPath.path.to.cellId)!;

  const expectedPathType =
    to.type === FacilityType.CONSTRUCTION
      ? CarrierPathType.CONSTRUCTION
      : CarrierPathType.FACILITY;

  return expectedPathType === carrierPath.pathType;
}
