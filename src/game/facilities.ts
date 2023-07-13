import {
  ExactFacilityType,
  FacilityType,
  ProductVariantId,
  StorageItem,
} from './types';
import { resourceLocalization, ResourceType } from './resources';

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
          resourceType: ResourceType.FRUIT,
          quantity: 1,
        },
      ],
    }),
  },
  [FacilityType.GATHERING_2]: {
    iterationInfoType: ItrationInfoType.FACILITY,
    maximumPeopleAtWork: 3,
    productionVariants: [
      {
        id: ProductVariantId.FRUIT,
        iterationPeopleDays: 1,
        input: [],
        output: [
          {
            resourceType: ResourceType.FRUIT,
            quantity: 1,
          },
        ],
      },
      {
        id: ProductVariantId.VEGETABLE,
        iterationPeopleDays: 1,
        input: [],
        output: [
          {
            resourceType: ResourceType.VEGETABLE,
            quantity: 1,
          },
        ],
      },
      {
        id: ProductVariantId.NUT,
        iterationPeopleDays: 1,
        input: [],
        output: [
          {
            resourceType: ResourceType.NUT,
            quantity: 1,
          },
        ],
      },
    ],
  },
  [FacilityType.HUNTERS_BOOTH]: {
    iterationInfoType: ItrationInfoType.FACILITY,
    maximumPeopleAtWork: 3,
    productionVariants: singleProductionVariant({
      iterationPeopleDays: 1,
      input: [],
      output: [
        {
          resourceType: ResourceType.MEAT,
          quantity: 1,
        },
      ],
    }),
  },
  [FacilityType.KITCHEN]: {
    iterationInfoType: ItrationInfoType.FACILITY,
    maximumPeopleAtWork: 2,
    productionVariants: singleProductionVariant({
      iterationPeopleDays: 1,
      input: [
        {
          resourceType: ResourceType.FRUIT,
          quantity: 1,
        },
        {
          resourceType: ResourceType.VEGETABLE,
          quantity: 1,
        },
        {
          resourceType: ResourceType.NUT,
          quantity: 1,
        },
        {
          resourceType: ResourceType.MEAT,
          quantity: 1,
        },
      ],
      output: [
        {
          resourceType: ResourceType.COMPLEX_MEAL,
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
        id: ProductVariantId.BASKET,
        iterationPeopleDays: 1,
        input: [
          {
            resourceType: ResourceType.REED,
            quantity: 5,
          },
        ],
        output: [
          {
            resourceType: ResourceType.BASKET,
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
      {
        id: ProductVariantId.TEA_LEAVES,
        iterationPeopleDays: 1,
        input: [
          {
            resourceType: ResourceType.AGRICULTURAL_TOOLS,
            quantity: 1,
          },
        ],
        output: [
          {
            resourceType: ResourceType.TEA_LEAVES,
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
  [FacilityType.ANCIENT_FACTORY]: {
    iterationInfoType: ItrationInfoType.FACILITY,
    maximumPeopleAtWork: 4,
    productionVariants: [
      {
        id: ProductVariantId.TEA,
        iterationPeopleDays: 1,
        input: [
          {
            resourceType: ResourceType.TEA_LEAVES,
            quantity: 4,
          },
        ],
        output: [
          {
            resourceType: ResourceType.TEA,
            quantity: 1,
          },
        ],
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
  [FacilityType.GATHERING_2]: 'Gathering II',
  [FacilityType.KITCHEN]: 'Kitchen',
  [FacilityType.HUNTERS_BOOTH]: "Hunter's booth",
  [FacilityType.CHOP_WOOD]: 'Chop wood',
  [FacilityType.FIELD]: 'Field',
  [FacilityType.WORK_SHOP]: 'Work shop',
  [FacilityType.STABLE]: 'Stable',
  [FacilityType.ANCIENT_FACTORY]: 'Ancient factory',
};

export const productVariantsTranslations: Record<ProductVariantId, string> = {
  [ProductVariantId.BASIC]: '',
  [ProductVariantId.AGRICULTURAL_TOOLS]:
    resourceLocalization[ResourceType.AGRICULTURAL_TOOLS],
  [ProductVariantId.HAY]: resourceLocalization[ResourceType.HAY],
  [ProductVariantId.REED]: resourceLocalization[ResourceType.REED],
  [ProductVariantId.PAPYRUS]: resourceLocalization[ResourceType.PAPYRUS],
  [ProductVariantId.TEA]: resourceLocalization[ResourceType.TEA],
  [ProductVariantId.TEA_LEAVES]: resourceLocalization[ResourceType.TEA_LEAVES],
  [ProductVariantId.FRUIT]: resourceLocalization[ResourceType.FRUIT],
  [ProductVariantId.VEGETABLE]: resourceLocalization[ResourceType.VEGETABLE],
  [ProductVariantId.NUT]: resourceLocalization[ResourceType.NUT],
  [ProductVariantId.BASKET]: resourceLocalization[ResourceType.BASKET],
};
