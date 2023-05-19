import { FacilityType, ResourceType, StorageItem } from './types';

export type FacilityIterationInfo = {
  iterationPeopleDays: number;
  maximumPeopleAtWork: number;
  input: StorageItem[];
  output: StorageItem[];
};

export const facilitiesIterationInfo: Map<FacilityType, FacilityIterationInfo> =
  new Map([
    [
      FacilityType.BUILDING,
      {
        iterationPeopleDays: 3,
        maximumPeopleAtWork: 3,
        input: [],
        output: [],
      },
    ],
    [
      FacilityType.GATHERING,
      {
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
    ],
    [
      FacilityType.LAMBERT,
      {
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
    ],
    [
      FacilityType.CHOP_WOOD,
      {
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
    ],
  ]);
