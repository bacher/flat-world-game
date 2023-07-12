import { foodResourceTypes, ResourceType } from './resources';

export type Booster = {
  resourceTypes: ResourceType[];
  perWorker: number;
  boost: number;
};

export const boosters: Record<
  'population' | 'carrier' | 'worker' | 'research',
  Booster
> = {
  population: {
    resourceTypes: [...foodResourceTypes.values()],
    perWorker: 0.2,
    boost: 1,
  },
  carrier: {
    resourceTypes: [ResourceType.HORSE],
    perWorker: 0.01,
    boost: 1,
  },
  worker: {
    resourceTypes: [ResourceType.TEA],
    perWorker: 0.3,
    boost: 0.2,
  },
  research: {
    resourceTypes: [ResourceType.PAPYRUS],
    perWorker: 0.1,
    boost: 0.2,
  },
};

export const boosterByResourceType: Record<ResourceType, Booster | undefined> =
  (Object.keys(boosters) as (keyof typeof boosters)[]).reduce(
    (acc, boosterCategoryName) => {
      const booster = boosters[boosterCategoryName];
      for (const resourceType of booster.resourceTypes) {
        acc[resourceType] = booster;
      }
      return acc;
    },
    {} as Record<ResourceType, Booster | undefined>,
  );

export const cityResourcesInput: ResourceType[] = Object.keys(
  boosterByResourceType,
) as ResourceType[];
