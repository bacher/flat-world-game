import {
  BASE_WEIGHT_PER_PEOPLE_DAY,
  CITY_BUFFER_DAYS,
  EXCLUSIVE_WORK_DAYS,
  INPUT_BUFFER_DAYS,
  OUTPUT_BUFFER_DAYS,
} from '@/game/consts';
import {
  CarrierPath,
  CarrierPathType,
  City,
  Construction,
  Facility,
  FacilityType,
  GameState,
  StorageItem,
  WorkDaysSummary,
} from '@/game/types';
import { facilitiesConstructionInfo } from '@/game/facilityConstruction';
import {
  getCarrierPathStructures,
  getCityResourceSubstitute,
  getResourceCount,
  getStructureIterationStorageInfo,
} from '@/game/gameState';
import { facilitiesIterationInfo } from '@/game/facilities';
import { getCarrierPathDistance, isExactFacility } from '@/game/helpers';
import { boosterByResourceType } from '@/game/boosters';

import { applyCityModifiers } from './cityBoosters';

export const enum JobType {
  WORKER = 'WORKER',
  CARRIER = 'CARRIER',
}

type FacilityWork = {
  jobType: JobType.WORKER;
  facility: Facility | Construction;
};

type CarrierWork = {
  jobType: JobType.CARRIER;
  carrierPath: CarrierPath;
};

type DailyTask = FacilityWork | CarrierWork;

type DailyWorkBase = {
  task: DailyTask;
  needWorkDays: number;
};

type DailyWorkNeed = DailyWorkBase & {
  exclusiveWorkDays: number;
  restWorkDays: number;
};

export type DailyWork = DailyWorkNeed & {
  actualWorkDays: number;
};

type CityTickWorkPlan = {
  totalNeedPeopleCount: number;
  dailyWorks: DailyWork[];
};

export function planCityTickWork(
  gameState: GameState,
  city: City,
): CityTickWorkPlan {
  const facilities = gameState.facilitiesByCityId.get(city.cityId)!;
  const dailyWorksBase: DailyWorkBase[] = [];

  for (const facility of facilities) {
    if (!facility.isPaused) {
      const needWorkDays =
        facility.type === FacilityType.CONSTRUCTION
          ? getConstructionBaseWorkDays(facility)
          : getFacilityBaseWorkDays(facility);

      if (needWorkDays) {
        dailyWorksBase.push({
          task: {
            jobType: JobType.WORKER,
            facility,
          },
          needWorkDays,
        });
      }
    }
  }

  for (const carrierPath of city.carrierPaths) {
    if (isCarrierPathAllowed(gameState, carrierPath)) {
      const needWorkDays = getCarrierPathBaseWorkDays(gameState, carrierPath);

      if (needWorkDays) {
        dailyWorksBase.push({
          task: {
            jobType: JobType.CARRIER,
            carrierPath,
          },
          needWorkDays,
        });
      }
    }
  }

  const dailyWorksNeed: DailyWorkNeed[] = dailyWorksBase.map(
    (work): DailyWorkNeed => ({
      ...work,
      exclusiveWorkDays: Math.min(work.needWorkDays, EXCLUSIVE_WORK_DAYS),
      restWorkDays: Math.max(0, work.needWorkDays - EXCLUSIVE_WORK_DAYS),
    }),
  );

  const workDaySummaries: Record<JobType, WorkDaysSummary> = {
    [JobType.WORKER]: createEmptyWorkDaysSummary(),
    [JobType.CARRIER]: createEmptyWorkDaysSummary(),
  };

  for (const { task, exclusiveWorkDays, restWorkDays } of dailyWorksNeed) {
    const summary = workDaySummaries[task.jobType];
    summary.exclusiveWorkDays += exclusiveWorkDays;
    summary.restWorkDays += restWorkDays;
  }

  const { workRatio, totalNeedPeopleCount } = applyCityModifiers(city, {
    needWorkersWorkDays: workDaySummaries[JobType.WORKER],
    needCarriersWorkDays: workDaySummaries[JobType.CARRIER],
  });

  const dailyWorks: DailyWork[] = dailyWorksNeed.map(
    (work): DailyWork => ({
      ...work,
      actualWorkDays: work.exclusiveWorkDays + work.restWorkDays * workRatio,
    }),
  );

  return {
    totalNeedPeopleCount,
    dailyWorks,
  };
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

function createEmptyWorkDaysSummary(): WorkDaysSummary {
  return {
    restWorkDays: 0,
    exclusiveWorkDays: 0,
  };
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

function getMaximumPeopleAtWork(structure: Facility | Construction): number {
  if (structure.type === FacilityType.CONSTRUCTION) {
    const info = facilitiesConstructionInfo[structure.buildingFacilityType];
    return info.maximumPeopleAtWork;
  }

  return facilitiesIterationInfo[structure.type].maximumPeopleAtWork;
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
