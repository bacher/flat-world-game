import {
  OUTPUT_BUFFER_DAYS,
  INPUT_BUFFER_DAYS,
  MINIMAL_CITY_PEOPLE,
  PEOPLE_FOOD_PER_DAY,
  RESEARCH_POINTS_PER_PERSON,
  BASE_WEIGHT_PER_PEOPLE_DAY,
  CITY_BUFFER_DAYS,
  HORSES_PER_WORKER,
  BASE_HORSE_WORK_MODIFIER,
} from './consts';
import {
  CarrierPath,
  City,
  Construction,
  Facility,
  FacilityType,
  GameState,
  StorageItem,
  WorkingPath,
} from './types';
import {
  addCarrierPath,
  addResource,
  addResources,
  completeConstruction,
  getCarrierPathStructures,
  // actualizeCityTotalAssignedWorkersCount,
  // addIterationOutput,
  // completeConstruction,
  getIterationsUntilConstructionComplete,
  getMaximumAddingLimit,
  // getIterationsUntilOverDone,
  // getMaximumAddingLimit,
  // getMaximumIterationsByResources,
  // getPathFacilities,
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
import { isSamePath, isExactFacility } from './helpers';

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

  console.log('===');

  for (const city of gameState.cities.values()) {
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
      const workDays = getCarrierPathBaseWorkDays(gameState, carrierPath);

      if (workDays) {
        totalCarriersWorkDays += workDays;
        currentCarrierPaths.push({ carrierPath, workDays });
        console.log('Carry', carrierPath.resourceType, workDays);
      }
    }

    const { workRatio, totalPeopleCount } = applyCityModifiers(city, {
      needWorkerWorkHours: totalWorkersWorkDays,
      needCarrierWorkHours: totalCarriersWorkDays,
    });

    city.lastTickNeedPopulation = Math.ceil(totalPeopleCount);

    console.log('workRatio:', workRatio);

    for (const { facility, workDays } of facilitiesWork) {
      const actualWorkDays = workDays * workRatio;

      doFacilityWork(gameState, facility, actualWorkDays);
    }

    for (const { carrierPath, workDays } of currentCarrierPaths) {
      const actualWorkDays = workDays * workRatio;

      doCarryWork(gameState, carrierPath, actualWorkDays);
    }

    fillInCityWorkingPaths(
      city,
      facilitiesWork,
      currentCarrierPaths,
      workRatio,
    );
  }

  researchPhase(gameState);

  growPhase(gameState);
}

function fillInCityWorkingPaths(
  city: City,
  facilitiesWork: FacilityWork[],
  carriersWork: CarrierWork[],
  workRatio: number,
): void {
  const cityWorkingPaths: WorkingPath[] = [];

  function addWorkingPath(workingPath: WorkingPath) {
    const alreadyPath = cityWorkingPaths.find((path) =>
      isSamePath(path.path, workingPath.path),
    );

    if (alreadyPath) {
      alreadyPath.workers += workingPath.workers;
      alreadyPath.carriers += workingPath.carriers;
    } else {
      cityWorkingPaths.push(workingPath);
    }
  }

  for (const { facility, workDays } of facilitiesWork) {
    addWorkingPath({
      path: { from: city.position, to: facility.position },
      workers: workDays * workRatio,
      carriers: 0,
    });
  }

  for (const { carrierPath, workDays } of carriersWork) {
    const { from, to } = carrierPath.path;
    addWorkingPath({
      path: { from, to },
      workers: 0,
      carriers: workDays * workRatio,
    });
  }

  city.lastTickWorkingPaths = cityWorkingPaths;
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

  const alreadyCount = getResourceCount(to.input, carrierPath.resourceType);

  let needCount = 0;

  if (to.type === FacilityType.CITY) {
    switch (carrierPath.resourceType) {
      case ResourceType.FOOD: {
        const cap = to.population * PEOPLE_FOOD_PER_DAY * CITY_BUFFER_DAYS;
        needCount = cap - alreadyCount;
        break;
      }
      case ResourceType.HORSE:
        const cap = to.population * HORSES_PER_WORKER * CITY_BUFFER_DAYS;
        needCount = cap - alreadyCount;
        break;
      default:
      // Do nothing
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

  // TODO:
  return moveCount / BASE_WEIGHT_PER_PEOPLE_DAY;
}

function growPhase(gameState: GameState): void {
  for (const city of gameState.cities.values()) {
    const roundedPopulation = Math.floor(city.population);
    const needFood = roundedPopulation * PEOPLE_FOOD_PER_DAY;

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
  let researchPoints = 0;

  for (const city of gameState.cities.values()) {
    researchPoints += city.population * RESEARCH_POINTS_PER_PERSON;
  }

  if (gameState.currentResearchId && researchPoints > 0) {
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

  // TODO: formula
  let moveQuantity = workDays * BASE_WEIGHT_PER_PEOPLE_DAY;

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
  const haveHorsesCount = getResourceCount(city.input, ResourceType.HORSE);

  const needHorsesCount =
    (needCarrierWorkHours / (1 + BASE_HORSE_WORK_MODIFIER)) * HORSES_PER_WORKER;

  let actualWorkerWorkHours = needWorkerWorkHours;
  let actualCarrierWorkHours;
  let usedHorsesCount = 0;

  if (haveHorsesCount >= needHorsesCount) {
    actualCarrierWorkHours =
      needCarrierWorkHours / (1 + BASE_HORSE_WORK_MODIFIER);
    usedHorsesCount = needHorsesCount;
  } else {
    const ratio = haveHorsesCount / needHorsesCount;
    actualCarrierWorkHours =
      needCarrierWorkHours * (1 - ratio) +
      (needCarrierWorkHours * ratio) / (1 + BASE_HORSE_WORK_MODIFIER);
    usedHorsesCount = haveHorsesCount;
  }

  grabResourceStrict(city.input, {
    resourceType: ResourceType.HORSE,
    quantity: usedHorsesCount,
  });

  return {
    workRatio: Math.min(
      1,
      city.population / (actualWorkerWorkHours + actualCarrierWorkHours),
    ),
    totalPeopleCount: actualWorkerWorkHours + actualCarrierWorkHours,
  };
}

function addConstructionInputPaths(
  gameState: GameState,
  city: City,
  construction: Construction,
): void {
  removeAllCarrierPathsTo(gameState, construction.position.cellId);

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
