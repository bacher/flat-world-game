import { neverCall } from '@/utils/typeUtils';

import {
  BASE_WEIGHT_PER_PEOPLE_DAY,
  CITY_BUFFER_DAYS,
  CITY_POPULATION_STATISTICS_LENGTH,
  EXCLUSIVE_WORK_DAYS,
  INPUT_BUFFER_DAYS,
  OUTPUT_BUFFER_DAYS,
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
} from './types';
import {
  addCarrierPath,
  addResource,
  addResources,
  completeConstruction,
  createEmptyLastTickCityReport,
  getCarrierPathStructures,
  getConstructionMaximumAddingLimit,
  getResourceCount,
  getStructureIterationStorageInfo,
  grabResource,
  grabResourcesStrict,
  grabResourceStrict,
  multiplyResourceStorage,
  removeAllCarrierPathsTo,
} from './gameState';
import {
  foodNutritionlValue,
  houseCapacities,
  isFoodResourceType,
  isHouseResourceType,
  ResourceType,
} from './resources';
import { facilitiesIterationInfo } from './facilities';
import { facilitiesConstructionInfo } from './facilityConstruction';
import {
  getCarrierPathDistance,
  isExactFacility,
  isExactFacilityType,
  isSamePath,
} from './helpers';
import { Booster, boosterByResourceType, boosters } from './boosters';
import { growPhase } from './tick/growPhase';
import { researchPhase } from './tick/researchPhase';

const enum JobType {
  WORKER = 'WORKER',
  CARRIER = 'CARRIER',
}

type BaseWork = {
  needWorkDays: number;
  exclusiveWorkDays: number;
  restWorkDays: number;
  actualWorkDays: number;
};

type FacilityWorkNeed = {
  jobType: JobType.WORKER;
  facility: Facility | Construction;
  needWorkDays: number;
};

type CarrierWorkNeed = {
  jobType: JobType.CARRIER;
  carrierPath: CarrierPath;
  needWorkDays: number;
};

type FacilityWorkNeed2 = FacilityWorkNeed & {
  exclusiveWorkDays: number;
  restWorkDays: number;
};

type CarrierWorkNeed2 = CarrierWorkNeed & {
  exclusiveWorkDays: number;
  restWorkDays: number;
};

type FacilityWork = BaseWork & {
  jobType: JobType.WORKER;
  facility: Facility | Construction;
};

type CarrierWork = BaseWork & {
  jobType: JobType.CARRIER;
  carrierPath: CarrierPath;
};

type DailyWork = FacilityWork | CarrierWork;
type DailyWorkNeed = FacilityWorkNeed | CarrierWorkNeed;
type DailyWorkNeed2 = FacilityWorkNeed2 | CarrierWorkNeed2;

type WorkDaysSummary = {
  exclusiveWorkDays: number;
  restWorkDays: number;
};

export function tick(gameState: GameState): void {
  gameState.tickNumber += 1;

  console.group(`Tick ${gameState.tickNumber}`);

  for (const city of gameState.cities.values()) {
    city.cityReport.lastTick = createEmptyLastTickCityReport();

    const facilities = gameState.facilitiesByCityId.get(city.cityId)!;

    // TODO: Actualize only when something changed in city
    for (const facility of facilities) {
      if (facility.type === FacilityType.CONSTRUCTION) {
        addConstructionInputPaths(gameState, city, facility);
      }
    }

    const dailyWorksNeed: DailyWorkNeed[] = [];

    for (const facility of facilities) {
      if (!facility.isPaused) {
        const needWorkDays =
          facility.type === FacilityType.CONSTRUCTION
            ? getConstructionBaseWorkDays(facility)
            : getFacilityBaseWorkDays(facility);

        if (needWorkDays) {
          dailyWorksNeed.push({
            jobType: JobType.WORKER,
            facility,
            needWorkDays,
          });
        }
      }
    }

    for (const carrierPath of city.carrierPaths) {
      if (isCarrierPathAllowed(gameState, carrierPath)) {
        const needWorkDays = getCarrierPathBaseWorkDays(gameState, carrierPath);

        if (needWorkDays) {
          dailyWorksNeed.push({
            jobType: JobType.CARRIER,
            carrierPath,
            needWorkDays,
          });
        }
      }
    }

    const dailyWorks2: DailyWorkNeed2[] = dailyWorksNeed.map(
      (work): DailyWorkNeed2 => {
        return {
          ...work,
          exclusiveWorkDays: Math.min(work.needWorkDays, EXCLUSIVE_WORK_DAYS),
          restWorkDays: Math.max(0, work.needWorkDays - EXCLUSIVE_WORK_DAYS),
        };
      },
    );

    const workDaySummaries: Record<JobType, WorkDaysSummary> = {
      [JobType.WORKER]: createEmptyWorkDaysSummary(),
      [JobType.CARRIER]: createEmptyWorkDaysSummary(),
    };

    for (const { jobType, exclusiveWorkDays, restWorkDays } of dailyWorks2) {
      const summary = workDaySummaries[jobType];
      summary.exclusiveWorkDays += exclusiveWorkDays;
      summary.restWorkDays += restWorkDays;
    }

    const { workRatio, totalNeedPeopleCount } = applyCityModifiers(city, {
      needWorkersWorkDays: workDaySummaries[JobType.WORKER],
      needCarriersWorkDays: workDaySummaries[JobType.CARRIER],
    });

    const dailyWorks: DailyWork[] = dailyWorks2.map(
      (work): DailyWork => ({
        ...work,
        actualWorkDays: work.exclusiveWorkDays + work.restWorkDays * workRatio,
      }),
    );

    updateCityNeedPopulation(gameState, city, totalNeedPeopleCount);

    for (const work of dailyWorks) {
      const { actualWorkDays } = work;

      switch (work.jobType) {
        case JobType.WORKER: {
          const { facility } = work;
          if (facility.type === FacilityType.CONSTRUCTION) {
            doConstructionWork(gameState, facility, actualWorkDays);
          } else {
            doFacilityWork(facility, actualWorkDays);
          }
          break;
        }
        case JobType.CARRIER: {
          const { carrierPath } = work;
          doCarryWork(gameState, carrierPath, actualWorkDays);
          break;
        }
        default:
          throw neverCall(work);
      }
    }

    fillInCityWorkReport(city, dailyWorks);
  }

  researchPhase(gameState);

  growPhase(gameState);

  console.groupEnd();
}

function updateCityNeedPopulation(
  gameState: GameState,
  city: City,
  totalNeed: number,
): void {
  const need = Math.ceil(totalNeed);
  city.cityReport.population.lastTick = need;
  city.cityReport.population.needStatistics[
    gameState.tickNumber % CITY_POPULATION_STATISTICS_LENGTH
  ] = need;
}

function createEmptyWorkDaysSummary(): WorkDaysSummary {
  return {
    restWorkDays: 0,
    exclusiveWorkDays: 0,
  };
}

function fillInCityWorkReport(city: City, dailyWorks: DailyWork[]): void {
  const report = createEmptyLastTickCityReport();

  for (const work of dailyWorks) {
    const { actualWorkDays } = work;

    switch (work.jobType) {
      case JobType.WORKER: {
        const { facility } = work;
        report.facilityWorkerReports.push({
          facility,
          workers: actualWorkDays,
        });
        break;
      }
      case JobType.CARRIER: {
        const { carrierPath } = work;
        const { from, to } = carrierPath.path;

        const alreadyPath = report.carrierPathReports.find((path) =>
          isSamePath(path.path, carrierPath.path),
        );

        if (alreadyPath) {
          alreadyPath.carriers += actualWorkDays;
        } else {
          report.carrierPathReports.push({
            path: { from, to },
            carriers: actualWorkDays,
          });
        }
        break;
      }
      default:
        throw neverCall(work);
    }
  }

  city.cityReport.lastTick = report;
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

function getFacilityBaseWorkDays(facility: Facility): number {
  const maximumPeopleAtWork = getMaximumPeopleAtWork(facility);
  const iterationInfo = getStructureIterationStorageInfo(facility);

  const endCurrentIteration =
    facility.inProcess > 0 ? 1 - facility.inProcess : 0;

  const maxInputIterations =
    getAssuredByResourcesIterationsCount(facility) + endCurrentIteration;

  if (maxInputIterations === 0) {
    return 0;
  }

  const maxOutputIterationsRaw = getIterationsCountUntilCap(facility);

  const maxOutputIterations = Math.max(
    0,
    maxOutputIterationsRaw - facility.inProcess,
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

function getConstructionBaseWorkDays(construction: Construction): number {
  const constructionInfo =
    facilitiesConstructionInfo[construction.buildingFacilityType];

  if (
    construction.inProcess === 0 &&
    getIterationsCountByStorage(construction.input, constructionInfo.input) < 1
  ) {
    return 0;
  }

  const remainsWorkDays =
    (1 - construction.inProcess) * constructionInfo.iterationPeopleDays;

  return Math.min(constructionInfo.maximumPeopleAtWork, remainsWorkDays);
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

  return Math.max(1.5, peopleDaysUntilCap / oneIterationWorkDays);
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

  let needCount = 0;

  if (to.type === FacilityType.CITY) {
    const booster = boosterByResourceType[carrierPath.resourceType];

    if (booster) {
      const { resourceType, modifier } = getCityResourceSubstitute(
        carrierPath.resourceType,
      );
      const alreadyCount = getResourceCount(to.input, resourceType);
      const cap = to.population * booster.perWorker * CITY_BUFFER_DAYS;

      needCount = (cap - alreadyCount) / modifier;
    }
  } else {
    const alreadyCount = getResourceCount(to.input, carrierPath.resourceType);
    const maximumPeopleAtWork = getMaximumPeopleAtWork(to);

    const iterationInfo = getStructureIterationStorageInfo(to);

    const iterationWorkDays =
      iterationInfo.iterationPeopleDays / maximumPeopleAtWork;

    // TODO: Check construction!
    const maximumIterations = Math.max(
      1.5,
      INPUT_BUFFER_DAYS / iterationWorkDays,
    );

    const iterationResourceCount = getResourceCount(
      iterationInfo.input,
      carrierPath.resourceType,
    );

    const capResourceCount = maximumIterations * iterationResourceCount;

    needCount = capResourceCount - alreadyCount;
  }

  if (needCount <= 0) {
    return 0;
  }

  const moveCount = Math.min(outputCount, needCount);

  return (moveCount * distance) / BASE_WEIGHT_PER_PEOPLE_DAY;
}

function getCityResourceSubstitute(resourceType: ResourceType): {
  resourceType: ResourceType;
  modifier: number;
} {
  if (isFoodResourceType(resourceType)) {
    return {
      resourceType: ResourceType.FOOD,
      modifier: foodNutritionlValue[resourceType],
    };
  }

  if (isHouseResourceType(resourceType)) {
    return {
      resourceType: ResourceType.HOUSING,
      modifier: houseCapacities[resourceType],
    };
  }

  return {
    resourceType,
    modifier: 1,
  };
}

function doFacilityWork(facility: Facility, workDays: number): void {
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
    addIterationsResources(facility, doneIterations);
  }
}

function doConstructionWork(
  gameState: GameState,
  construction: Construction,
  workDays: number,
): void {
  // LOGIC:
  // Assuming that all resources for construction is already carried,
  // so we're not checking resouces here.

  const constructionInfo =
    facilitiesConstructionInfo[construction.buildingFacilityType];

  construction.inProcess += workDays / constructionInfo.iterationPeopleDays;

  checkConstructionComplete(gameState, construction);
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
    const maximumCount = getConstructionMaximumAddingLimit(
      to,
      carrierPath.resourceType,
    );
    moveQuantity = Math.min(moveQuantity, maximumCount);
  }

  const movingResource: StorageItem = {
    resourceType: carrierPath.resourceType,
    quantity: moveQuantity,
  };

  const grabbedItem = grabResource(from.output, movingResource);

  // TODO: Check correctness
  if (grabbedItem.quantity !== movingResource.quantity) {
    // Could be when we have 2 or more paths from one facility
    console.warn('Carring quantity reduction');
  }

  if (to.type === FacilityType.CITY) {
    const { resourceType, modifier } = getCityResourceSubstitute(
      grabbedItem.resourceType,
    );

    addResource(to.input, {
      resourceType: resourceType,
      quantity: grabbedItem.quantity * modifier,
    });
  } else {
    addResource(to.input, grabbedItem);
  }
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
    needWorkersWorkDays,
    needCarriersWorkDays,
  }: {
    needWorkersWorkDays: WorkDaysSummary;
    needCarriersWorkDays: WorkDaysSummary;
  },
): { workRatio: number; totalNeedPeopleCount: number } {
  const workerWorkHours = applyCityModifier(city, {
    workDaysSummary: needWorkersWorkDays,
    booster: boosters.worker,
  });

  const carrierWorkHours = applyCityModifier(city, {
    workDaysSummary: needCarriersWorkDays,
    booster: boosters.carrier,
  });

  const exclusiveWorkDays =
    workerWorkHours.exclusiveWorkDays + carrierWorkHours.exclusiveWorkDays;
  const totalRestWorkDays =
    workerWorkHours.restWorkDays + carrierWorkHours.restWorkDays;
  const totalWorkDays = exclusiveWorkDays + totalRestWorkDays;

  const restPopulation = city.population - exclusiveWorkDays;

  let workRatio;

  if (restPopulation < 0) {
    console.warn('Over-exclusive work');
    workRatio = 0;
  } else {
    workRatio = Math.min(1, restPopulation / totalRestWorkDays);
  }

  return {
    workRatio,
    totalNeedPeopleCount: totalWorkDays,
  };
}

function applyCityModifier(
  city: City,
  {
    workDaysSummary: { restWorkDays, exclusiveWorkDays },
    booster: { resourceTypes, perWorker, boost },
  }: {
    workDaysSummary: WorkDaysSummary;
    booster: Booster;
  },
): WorkDaysSummary {
  // TODO: Try to use all resource types
  const resourceType = resourceTypes[0];

  const haveResourceCount = getResourceCount(city.input, resourceType);
  const totalBoost = 1 + boost;

  const totalWorkDays = exclusiveWorkDays + restWorkDays;

  const needResourceCount = (totalWorkDays / totalBoost) * perWorker;

  let usedResourceCount: number;
  let actualBoost;

  if (haveResourceCount >= needResourceCount) {
    actualBoost = 1 / totalBoost;
    usedResourceCount = needResourceCount;
  } else {
    const ratio = haveResourceCount / needResourceCount;
    actualBoost = 1 - ratio + ratio / totalBoost;
    usedResourceCount = haveResourceCount;
  }

  grabResourceStrict(city.input, {
    resourceType,
    quantity: usedResourceCount,
  });

  return {
    restWorkDays: totalWorkDays * actualBoost,
    exclusiveWorkDays: exclusiveWorkDays * actualBoost,
  };
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
    if (isExactFacilityType(facility.type)) {
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
  if (construction.inProcess >= 1) {
    completeConstruction(gameState, construction);
  }
}

function isCarrierPathAllowed(
  gameState: GameState,
  carrierPath: CarrierPath,
): boolean {
  const to = gameState.structuresByCellId.get(carrierPath.path.to.cellId)!;

  if (isExactFacility(to) && to.isPaused) {
    return false;
  }

  const expectedPathType =
    to.type === FacilityType.CONSTRUCTION
      ? CarrierPathType.CONSTRUCTION
      : CarrierPathType.FACILITY;

  return expectedPathType === carrierPath.pathType;
}
