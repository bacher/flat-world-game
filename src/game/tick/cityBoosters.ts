import { City, WorkDaysSummary } from '@/game/types';
import { getResourceCount, grabResourceStrict } from '@/game/gameState';
import { Booster, boosters } from '@/game/boosters';

export type Ratios = {
  exclusive: number;
  privileged: number;
  rest: number;
};

export function applyCityModifiers(
  city: City,
  {
    needWorkersWorkDays,
    needCarriersWorkDays,
  }: {
    needWorkersWorkDays: WorkDaysSummary;
    needCarriersWorkDays: WorkDaysSummary;
  },
): {
  ratios: Ratios;
  totalNeedPeopleCount: number;
} {
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
  const privilegedWorkDays =
    workerWorkHours.privilegedWorkDays + carrierWorkHours.privilegedWorkDays;
  const restWorkDays =
    workerWorkHours.restWorkDays + carrierWorkHours.restWorkDays;

  const totalNeedPeopleCount =
    exclusiveWorkDays + privilegedWorkDays + restWorkDays;

  const ratios: Ratios = {
    exclusive: 0,
    privileged: 0,
    rest: 0,
  };

  if (city.population - exclusiveWorkDays - privilegedWorkDays > 0) {
    ratios.exclusive = 1;
    ratios.privileged = 1;
    const restPopulation =
      city.population - exclusiveWorkDays - privilegedWorkDays;
    ratios.rest = Math.min(1, restPopulation / restWorkDays);
  } else if (city.population - exclusiveWorkDays > 0) {
    const restPopulation = city.population - exclusiveWorkDays;
    ratios.exclusive = 1;
    ratios.privileged = Math.min(1, restPopulation / privilegedWorkDays);
    ratios.rest = 0;
  } else {
    ratios.exclusive = Math.min(1, city.population / exclusiveWorkDays);
    ratios.privileged = 0;
    ratios.rest = 0;
  }

  return {
    ratios,
    totalNeedPeopleCount,
  };
}

function applyCityModifier(
  city: City,
  {
    workDaysSummary: { exclusiveWorkDays, privilegedWorkDays, restWorkDays },
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

  const totalWorkDays = exclusiveWorkDays + privilegedWorkDays + restWorkDays;

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
    exclusiveWorkDays: exclusiveWorkDays * actualBoost,
    privilegedWorkDays: privilegedWorkDays * actualBoost,
    restWorkDays: restWorkDays * actualBoost,
  };
}
