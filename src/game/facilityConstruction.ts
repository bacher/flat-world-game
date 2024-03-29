import { ExactFacilityType, FacilityType, StorageItem } from '@/game/types';
import { IterationInfoType } from '@/game/facilities';
import { ResourceType } from '@/game/resources';

export type FacilityConstructionInfo = {
  iterationInfoType: IterationInfoType.CONSTRUCTION;
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
  | FacilityType.STABLE
  | FacilityType.INTERCITY_SENDER
  | FacilityType.INTERCITY_RECEIVER,
  FacilityConstructionInfo
> = {
  [FacilityType.LOGGING]: {
    iterationInfoType: IterationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    workArea: {
      areaType: WorkAreaType.LUMBER,
      radius: 2,
    },
    input: [],
  },
  [FacilityType.LOGGING_2]: {
    iterationInfoType: IterationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    workArea: {
      areaType: WorkAreaType.LUMBER,
      radius: 2,
    },
    input: [],
  },
  [FacilityType.GATHERING]: {
    iterationInfoType: IterationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    workArea: {
      areaType: WorkAreaType.GATHERING,
      radius: 2,
    },
    input: [],
  },
  [FacilityType.GATHERING_2]: {
    iterationInfoType: IterationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    workArea: {
      areaType: WorkAreaType.GATHERING,
      radius: 2,
    },
    input: [
      {
        resourceType: ResourceType.LUMBER_ROUGH,
        quantity: 10,
      },
    ],
  },
  [FacilityType.HUNTERS_BOOTH]: {
    iterationInfoType: IterationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    workArea: {
      areaType: WorkAreaType.HUNTING,
      radius: 2,
    },
    input: [
      {
        resourceType: ResourceType.LUMBER_ROUGH,
        quantity: 10,
      },
    ],
  },
  [FacilityType.HUNTERS_BOOTH_2]: {
    iterationInfoType: IterationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    workArea: {
      areaType: WorkAreaType.HUNTING,
      radius: 3,
    },
    input: [
      {
        resourceType: ResourceType.LUMBER_ROUGH,
        quantity: 20,
      },
    ],
  },
  [FacilityType.KITCHEN]: {
    iterationInfoType: IterationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.LUMBER_ROUGH,
        quantity: 10,
      },
    ],
  },
  [FacilityType.SAWMILL]: {
    iterationInfoType: IterationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.LOG,
        quantity: 4,
      },
    ],
  },
  [FacilityType.SAWMILL_2]: {
    iterationInfoType: IterationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.LUMBER_ROUGH,
        quantity: 10,
      },
      {
        resourceType: ResourceType.STONE,
        quantity: 5,
      },
    ],
  },
  [FacilityType.WORK_SHOP]: {
    iterationInfoType: IterationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.LUMBER_ROUGH,
        quantity: 20,
      },
    ],
  },
  [FacilityType.WORK_SHOP_2]: {
    iterationInfoType: IterationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.LUMBER_ROUGH,
        quantity: 20,
      },
      {
        resourceType: ResourceType.STONE,
        quantity: 10,
      },
    ],
  },
  [FacilityType.FIELD]: {
    iterationInfoType: IterationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.AGRICULTURAL_TOOLS,
        quantity: 20,
      },
    ],
  },
  [FacilityType.RANCH]: {
    iterationInfoType: IterationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.LOG,
        quantity: 20,
      },
    ],
  },
  [FacilityType.STABLE]: {
    iterationInfoType: IterationInfoType.CONSTRUCTION,
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
    iterationInfoType: IterationInfoType.CONSTRUCTION,
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
    iterationInfoType: IterationInfoType.CONSTRUCTION,
    iterationPeopleDays: 3,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.LOG,
        quantity: 10,
      },
      {
        resourceType: ResourceType.LUMBER_ROUGH,
        quantity: 20,
      },
    ],
  },
  [FacilityType.INTERCITY_SENDER]: {
    iterationInfoType: IterationInfoType.CONSTRUCTION,
    iterationPeopleDays: 2,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.LUMBER_ROUGH,
        quantity: 20,
      },
    ],
  },
  [FacilityType.INTERCITY_RECEIVER]: {
    iterationInfoType: IterationInfoType.CONSTRUCTION,
    iterationPeopleDays: 2,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.LUMBER_ROUGH,
        quantity: 20,
      },
    ],
  },
  [FacilityType.QUARRY]: {
    iterationInfoType: IterationInfoType.CONSTRUCTION,
    iterationPeopleDays: 2,
    maximumPeopleAtWork: 3,
    input: [
      {
        resourceType: ResourceType.LUMBER_ROUGH,
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
