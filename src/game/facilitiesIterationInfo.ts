import {
  ExactFacilityType,
  FacilityType,
  ResourceType,
  StorageItem,
} from './types';

export type FacilityIterationInfo = {
  iterationPeopleDays: number;
  maximumPeopleAtWork: number;
  input: StorageItem[];
  output: StorageItem[];
};

export const facilitiesIterationInfo: Record<
  ExactFacilityType,
  FacilityIterationInfo
> = {
  [FacilityType.GATHERING]: {
    iterationPeopleDays: 1,
    maximumPeopleAtWork: 3,
    input: [],
    output: [
      {
        resourceType: ResourceType.FOOD,
        quantity: 1,
      },
    ],
  },

  [FacilityType.LUMBERT]: {
    iterationPeopleDays: 1,
    maximumPeopleAtWork: 4,
    input: [],
    output: [
      {
        resourceType: ResourceType.LOG,
        quantity: 1,
      },
    ],
  },

  [FacilityType.CHOP_WOOD]: {
    iterationPeopleDays: 1,
    maximumPeopleAtWork: 4,
    input: [
      {
        resourceType: ResourceType.LOG,
        quantity: 1,
      },
    ],
    output: [
      {
        resourceType: ResourceType.ROUTH_LUMBER,
        quantity: 2,
      },
    ],
  },
};

export type FacilityConstructionInfo = {
  iterations: number;
  iterationPeopleDays: number;
  maximumPeopleAtWork: number;
  input: StorageItem[];
};

export const facilitiesConstructionInfo: Record<
  ExactFacilityType,
  FacilityConstructionInfo
> = {
  [FacilityType.LUMBERT]: {
    iterations: 1,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [],
  },
  [FacilityType.GATHERING]: {
    iterations: 1,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [],
  },
  [FacilityType.CHOP_WOOD]: {
    iterations: 2,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.ROUTH_LUMBER,
        quantity: 2,
      },
    ],
  },
};
