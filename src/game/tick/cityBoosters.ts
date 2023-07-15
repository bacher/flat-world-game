import { City, WorkDaysSummary } from '@/game/types';
import { getResourceCount, grabResourceStrict } from '@/game/gameState';
import { Booster, boosters } from '@/game/boosters';

export function applyCityModifiers(
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
