import { ExactFacilityType, FacilityType, StorageItem } from '@/game/types';
import { ItrationInfoType } from '@/game/facilities';
import { ResourceType } from '@/game/resources';

export type FacilityConstructionInfo = {
  iterationInfoType: ItrationInfoType.CONSTRUCTION;
  iterationPeopleDays: number;
  maximumPeopleAtWork: number;
  workArea?: WorkArea;
  input: StorageItem[];
};

export enum WorkAreaType {
  LUMBER = 'LUMBER',
  GATHERING = 'GATHERING',
  HUNTING = 'HUNTING',
}

export type WorkArea = {
  areaType: WorkAreaType;
  radius: number;
};

export type WorkAreaMap = Record<
  WorkAreaType,
  {
    maximumRadius: number;
    facilities: Set<FacilityType>;
  }
>;

export const facilitiesConstructionInfo: Record<
  | ExactFacilityType
  | FacilityType.INTERCITY_SENDER
  | FacilityType.INTERCITY_RECEIVER,
  FacilityConstructionInfo
> = {
  [FacilityType.LUMBER]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    workArea: {
      areaType: WorkAreaType.LUMBER,
      radius: 2,
    },
    input: [],
  },
  [FacilityType.GATHERING]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    workArea: {
      areaType: WorkAreaType.GATHERING,
      radius: 2,
    },
    input: [],
  },
  [FacilityType.GATHERING_2]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    workArea: {
      areaType: WorkAreaType.GATHERING,
      radius: 2,
    },
    input: [
      {
        resourceType: ResourceType.ROUTH_LUMBER,
        quantity: 10,
      },
    ],
  },
  [FacilityType.HUNTERS_BOOTH]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    workArea: {
      areaType: WorkAreaType.HUNTING,
      radius: 2,
    },
    input: [
      {
        resourceType: ResourceType.ROUTH_LUMBER,
        quantity: 10,
      },
    ],
  },
  [FacilityType.HUNTERS_BOOTH_2]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    workArea: {
      areaType: WorkAreaType.HUNTING,
      radius: 3,
    },
    input: [
      {
        resourceType: ResourceType.ROUTH_LUMBER,
        quantity: 20,
      },
    ],
  },
  [FacilityType.KITCHEN]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.ROUTH_LUMBER,
        quantity: 10,
      },
    ],
  },
  [FacilityType.CHOP_WOOD]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.LOG,
        quantity: 4,
      },
    ],
  },
  [FacilityType.WORK_SHOP]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.ROUTH_LUMBER,
        quantity: 20,
      },
    ],
  },
  [FacilityType.FIELD]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.AGRICULTURAL_TOOLS,
        quantity: 20,
      },
    ],
  },
  [FacilityType.STABLE]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.LOG,
        quantity: 20,
      },
    ],
  },
  [FacilityType.ANCIENT_FACTORY]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.LOG,
        quantity: 20,
      },
      {
        resourceType: ResourceType.HAY,
        quantity: 8,
      },
    ],
  },
  [FacilityType.HOUSING_FACTORY]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.LOG,
        quantity: 10,
      },
      {
        resourceType: ResourceType.ROUTH_LUMBER,
        quantity: 20,
      },
    ],
  },
  [FacilityType.INTERCITY_SENDER]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterationPeopleDays: 2,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.ROUTH_LUMBER,
        quantity: 20,
      },
    ],
  },
  [FacilityType.INTERCITY_RECEIVER]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterationPeopleDays: 2,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.ROUTH_LUMBER,
        quantity: 20,
      },
    ],
  },
  [FacilityType.QUARRY]: {
    iterationInfoType: ItrationInfoType.CONSTRUCTION,
    iterationPeopleDays: 2,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.ROUTH_LUMBER,
        quantity: 20,
      },
    ],
  },
};

export const workAreaMap: WorkAreaMap = Object.entries(
  facilitiesConstructionInfo,
).reduce((acc, [facilityType, constructionInfo]) => {
  if (constructionInfo.workArea) {
    let item = acc[constructionInfo.workArea.areaType];
    if (!item) {
      item = {
        maximumRadius: 0,
        facilities: new Set(),
      };

      acc[constructionInfo.workArea.areaType] = item;
    }

    item.facilities.add(facilityType as ExactFacilityType);

    if (item.maximumRadius < constructionInfo.workArea.radius) {
      item.maximumRadius = constructionInfo.workArea.radius;
    }
  }
  return acc;
}, {} as Partial<WorkAreaMap>) as WorkAreaMap;
