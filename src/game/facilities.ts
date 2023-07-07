import {
  ExactFacilityType,
  FacilityType,
  ProductVariantId,
  StorageItem,
} from './types';
import { ResourceType } from './resources';

export enum ItrationInfoType {
  FACILITY,
  CONSTRUCTION,
}

export type ProductionVariantInfo = {
  id: ProductVariantId;
  iterationPeopleDays: number;
  input: StorageItem[];
  output: StorageItem[];
};

export type FacilityIterationInfo = {
  iterationInfoType: ItrationInfoType.FACILITY;
  maximumPeopleAtWork: number;
  productionVariants: ProductionVariantInfo[];
};

function singleProductionVariant(
  info: Omit<ProductionVariantInfo, 'id'>,
): ProductionVariantInfo[] {
  return [{ id: ProductVariantId.BASIC, ...info }];
}

export const facilitiesIterationInfo: Record<
  ExactFacilityType,
  FacilityIterationInfo
> = {
  [FacilityType.GATHERING]: {
    iterationInfoType: ItrationInfoType.FACILITY,
    maximumPeopleAtWork: 3,
    productionVariants: singleProductionVariant({
      iterationPeopleDays: 1,
      input: [],
      output: [
        {
          resourceType: ResourceType.FOOD,
          quantity: 1,
        },
      ],
    }),
  },
  [FacilityType.LUMBERT]: {
    iterationInfoType: ItrationInfoType.FACILITY,
    maximumPeopleAtWork: 4,
    productionVariants: singleProductionVariant({
      iterationPeopleDays: 1,
      input: [],
      output: [
        {
          resourceType: ResourceType.LOG,
          quantity: 1,
        },
      ],
    }),
  },
  [FacilityType.CHOP_WOOD]: {
    iterationInfoType: ItrationInfoType.FACILITY,
    maximumPeopleAtWork: 4,
    productionVariants: singleProductionVariant({
      iterationPeopleDays: 1,
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
    }),
  },
  [FacilityType.WORK_SHOP]: {
    iterationInfoType: ItrationInfoType.FACILITY,
    maximumPeopleAtWork: 4,
    productionVariants: [
      {
        id: ProductVariantId.AGRICULTURAL_TOOLS,
        iterationPeopleDays: 1,
        input: [
          {
            resourceType: ResourceType.ROUTH_LUMBER,
            quantity: 1,
          },
        ],
        output: [
          {
            resourceType: ResourceType.AGRICULTURAL_TOOLS,
            quantity: 2,
          },
        ],
      },
      {
        id: ProductVariantId.PAPYRUS,
        iterationPeopleDays: 1,
        input: [
          {
            resourceType: ResourceType.REED,
            quantity: 1,
          },
        ],
        output: [
          {
            resourceType: ResourceType.PAPYRUS,
            quantity: 1,
          },
        ],
      },
    ],
  },
  [FacilityType.FIELD]: {
    iterationInfoType: ItrationInfoType.FACILITY,
    maximumPeopleAtWork: 4,
    productionVariants: [
      {
        id: ProductVariantId.HAY,
        iterationPeopleDays: 1,
        input: [
          {
            resourceType: ResourceType.AGRICULTURAL_TOOLS,
            quantity: 1,
          },
        ],
        output: [
          {
            resourceType: ResourceType.HAY,
            quantity: 2,
          },
        ],
      },
      {
        id: ProductVariantId.REED,
        iterationPeopleDays: 1,
        input: [
          {
            resourceType: ResourceType.AGRICULTURAL_TOOLS,
            quantity: 1,
          },
        ],
        output: [
          {
            resourceType: ResourceType.REED,
            quantity: 1,
          },
        ],
      },
    ],
  },
  [FacilityType.STABLE]: {
    iterationInfoType: ItrationInfoType.FACILITY,
    maximumPeopleAtWork: 4,
    productionVariants: singleProductionVariant({
      iterationPeopleDays: 1,
      input: [
        {
          resourceType: ResourceType.HAY,
          quantity: 20,
        },
      ],
      output: [
        {
          resourceType: ResourceType.HORSE,
          quantity: 1,
        },
      ],
    }),
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
};

export const initiallyUnlockedFacilities: ExactFacilityType[] = [
  FacilityType.GATHERING,
];

export const facilitiesDescription: Record<FacilityType, string> = {
  [FacilityType.CITY]: 'City',
  [FacilityType.CONSTRUCTION]: 'Building',
  [FacilityType.LUMBERT]: 'Lumbert',
  [FacilityType.GATHERING]: 'Gathering',
  [FacilityType.CHOP_WOOD]: 'Chop wood',
  [FacilityType.FIELD]: 'Field',
  [FacilityType.WORK_SHOP]: 'Work shop',
  [FacilityType.STABLE]: 'Stable',
};
