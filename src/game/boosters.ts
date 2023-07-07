import { ResourceType } from './resources';

export type Booster = {
  resourceType: ResourceType;
  perWorker: number;
  boost: number;
};

export const boosters: Record<
  'population' | 'carrier' | 'worker' | 'research',
  Booster
> = {
  population: {
    resourceType: ResourceType.FOOD,
    perWorker: 0.2,
    boost: 1,
  },
  carrier: {
    resourceType: ResourceType.HORSE,
    perWorker: 0.01,
    boost: 1,
  },
  worker: {
    resourceType: ResourceType.TEA,
    perWorker: 0.3,
    boost: 0.2,
  },
  research: {
    resourceType: ResourceType.PAPYRUS,
    perWorker: 0.1,
    boost: 0.2,
  },
};

export const cityResourcesInput: ResourceType[] = Object.values(boosters).map(
  (booster) => booster.resourceType,
);
