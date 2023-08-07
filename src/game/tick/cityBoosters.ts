import {
  City,
  FacilityType,
  GameState,
  StorageItem,
  sumWorkDays,
  WorkDaysSummary,
} from '@/game/types';
import {
  getResourceCount,
  grabResourceStrict,
  multiplyResourceItem,
} from '@/game/gameState';
import { Booster } from '@/game/boosters';
import { carrierBoosters, carrierBoostersByPower } from '@/game/resources';

export type Ratios = {
  exclusive: number;
  privileged: number;
  rest: number;
};

type ReservedStorage = {
  storage: StorageItem[];
  reservedItem: StorageItem;
};

export function applyCityModifiers(
  gameState: GameState,
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
  const workSum = sumWorkDays(needWorkersWorkDays);
  const carrierSum = sumWorkDays(needCarriersWorkDays);

  const workerWorkBoostRatio = applyCityWorkerModifier(
    gameState,
    city,
    workSum,
  );
  const carrierBoosted = applyCityCarrierModifier(gameState, city, carrierSum);

  const exclusiveWorkDays =
    needWorkersWorkDays.exclusiveWorkDays * workerWorkBoostRatio +
    needCarriersWorkDays.exclusiveWorkDays * carrierBoosted.boostRatio;
  const privilegedWorkDays =
    needWorkersWorkDays.privilegedWorkDays * workerWorkBoostRatio +
    needCarriersWorkDays.privilegedWorkDays * carrierBoosted.boostRatio;
  const restWorkDays =
    needWorkersWorkDays.restWorkDays * workerWorkBoostRatio +
    needCarriersWorkDays.restWorkDays * carrierBoosted.boostRatio;

  const totalNeedPeopleCount =
    exclusiveWorkDays + privilegedWorkDays + restWorkDays;

  const overallWorkRatio = Math.min(1, city.population / totalNeedPeopleCount);

  grabBoosterResources(carrierBoosted.grabbedResources, overallWorkRatio);

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
    ratios.exclusive = 1;
    const restPopulation = city.population - exclusiveWorkDays;
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

function grabBoosterResources(
  storages: ReservedStorage[],
  ratio: number,
): void {
  for (const { storage, reservedItem } of storages) {
    grabResourceStrict(storage, multiplyResourceItem(reservedItem, ratio));
  }
}

// TODO
// eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/ban-ts-comment
// @ts-ignore
function applyCityModifier(
  city: City,
  {
    workDaysSummary: { exclusiveWorkDays, privilegedWorkDays, restWorkDays },
    booster: { resourceTypes, perWorker },
  }: {
    workDaysSummary: WorkDaysSummary;
    booster: Booster;
  },
): WorkDaysSummary {
  // TODO: Try to use all resource types
  const resourceType = resourceTypes[0];

  const haveResourceCount = getResourceCount(city.input, resourceType);
  const totalBoost = 2;

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

function applyCityWorkerModifier(
  _gameState: GameState,
  _city: City,
  _needWorkers: number,
): number {
  // TODO:
  return 1;
}

function applyCityCarrierModifier(
  gameState: GameState,
  city: City,
  needWorkers: number,
): {
  boostRatio: number;
  grabbedResources: ReservedStorage[];
} {
  const facilities = gameState.facilitiesByCityId.get(city.cityId)!;

  const stable = facilities.find(
    (structure) => structure.type === FacilityType.STABLE,
  );

  if (!stable) {
    return {
      boostRatio: 1,
      grabbedResources: [],
    };
  }

  let boostedWorkers = 0;
  let restWorkers = needWorkers;
  const grabbedResources: ReservedStorage[] = [];

  for (const boosterResourceType of carrierBoostersByPower) {
    const count = getResourceCount(stable.input, boosterResourceType);

    if (count > 0) {
      const { boost, perWorker } = carrierBoosters[boosterResourceType];

      const boostModifier = 1 + boost;

      let grabCount: number;
      const boostedWorkDays = (count / perWorker) * boostModifier;

      if (boostedWorkDays >= restWorkers) {
        grabCount = (restWorkers / boostModifier) * perWorker;
        boostedWorkers += restWorkers / boostModifier;
        restWorkers = 0;
      } else {
        grabCount = count;
        boostedWorkers += boostedWorkDays / boostModifier;
        restWorkers -= boostedWorkDays;
      }

      grabbedResources.push({
        storage: stable.input,
        reservedItem: {
          resourceType: boosterResourceType,
          quantity: grabCount,
        },
      });

      if (restWorkers === 0) {
        break;
      }
    }
  }

  return {
    boostRatio: (boostedWorkers + restWorkers) / needWorkers,
    grabbedResources,
  };
}
