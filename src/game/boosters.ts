import {
  foodResourceTypes,
  houseResourceTypes,
  ResourceType,
} from './resources';

export type Booster = {
  resourceTypes: ResourceType[];
  perWorker: number;
};

export const boosters = {
  population: {
    resourceTypes: [...foodResourceTypes],
    perWorker: 0.15,
  },
  housing: {
    resourceTypes: [...houseResourceTypes],
    perWorker: 0.01,
  },
};

boosters satisfies Record<string, Booster>;

type BoostersByResourceType = Partial<
  Record<ResourceType, Booster | undefined>
>;

export const cityBoosterByResourceType: BoostersByResourceType = (() => {
  const acc: BoostersByResourceType = {};

  for (const resourceType of boosters.population.resourceTypes) {
    acc[resourceType] = boosters.population;
  }
  for (const resourceType of boosters.housing.resourceTypes) {
    acc[resourceType] = boosters.housing;
  }

  return acc;
})();

export const cityResourcesInput: ResourceType[] = Object.keys(
  cityBoosterByResourceType,
) as ResourceType[];
