import { ItrationInfoType } from '@/game/facilities';
import { ExactFacilityType, FacilityType, StorageItem } from '@/game/types';
import { ResourceType } from '@/game/resources';

export type FacilityConstructionInfo = {
  iterationInfoType: ItrationInfoType.CONSTRUCTION;
  iterations: number;
  iterationPeopleDays: number;
  maximumPeopleAtWork: number;
  workRadius?: number;
  input: StorageItem[];
};

export const facilitiesConstructionInfo: Record<
  ExactFacilityType,
  FacilityConstructionInfo
> = {
  [FacilityType.LUMBERT]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterations: 1,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    workRadius: 2,
    input: [],
  },
  [FacilityType.GATHERING]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterations: 1,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    workRadius: 2,
    input: [],
  },
  [FacilityType.GATHERING_2]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterations: 1,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    workRadius: 2,
    input: [
      {
        resourceType: ResourceType.ROUTH_LUMBER,
        quantity: 10,
      },
    ],
  },
  [FacilityType.HUNTERS_BOOTH]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterations: 1,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    workRadius: 2,
    input: [
      {
        resourceType: ResourceType.ROUTH_LUMBER,
        quantity: 10,
      },
    ],
  },
  [FacilityType.KITCHEN]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterations: 1,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    workRadius: 2,
    input: [
      {
        resourceType: ResourceType.ROUTH_LUMBER,
        quantity: 10,
      },
    ],
  },
  [FacilityType.CHOP_WOOD]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterations: 2,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.LOG,
        quantity: 2,
      },
    ],
  },
  [FacilityType.WORK_SHOP]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterations: 2,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.ROUTH_LUMBER,
        quantity: 10,
      },
    ],
  },
  [FacilityType.FIELD]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterations: 2,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.AGRICULTURAL_TOOLS,
        quantity: 10,
      },
    ],
  },
  [FacilityType.STABLE]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterations: 2,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.LOG,
        quantity: 10,
      },
    ],
  },
  [FacilityType.ANCIENT_FACTORY]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterations: 1,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.LOG,
        quantity: 10,
      },
      {
        resourceType: ResourceType.HAY,
        quantity: 4,
      },
    ],
  },
};
