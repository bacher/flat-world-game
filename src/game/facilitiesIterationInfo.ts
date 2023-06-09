import {
  ExactFacilityType,
  FacilityType,
  ResourceType,
  StorageItem,
} from './types';

export enum ItrationInfoType {
  FACILITY,
  CONSTRUCTION,
}

export type FacilityIterationInfo = {
  iterationInfoType: ItrationInfoType.FACILITY;
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
    iterationInfoType: ItrationInfoType.FACILITY,
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
    iterationInfoType: ItrationInfoType.FACILITY,
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
    iterationInfoType: ItrationInfoType.FACILITY,
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
  iterationInfoType: ItrationInfoType.CONSTRUCTION;
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
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterations: 1,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [],
  },
  [FacilityType.GATHERING]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterations: 1,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [],
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
};
