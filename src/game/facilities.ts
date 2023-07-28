import {
  ExactFacilityType,
  FacilityLikeType,
  FacilityType,
  ProductVariantId,
  StorageItem,
} from './types';
import { resourceLocalization, ResourceType } from './resources';
import { DepositType } from '@/game/depositType';

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
      iterationPeopleDays: 2,
      input: [],
      output: [
        {
          resourceType: ResourceType.FOOD,
          quantity: 0.5,
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
        input: [
          {
            resourceType: ResourceType.BASKET,
            quantity: 0.1,
          },
        ],
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
        input: [
          {
            resourceType: ResourceType.BASKET,
            quantity: 0.1,
          },
        ],
        output: [
          {
            resourceType: ResourceType.VEGETABLE,
            quantity: 1,
          },
        ],
      },
      {
        id: ProductVariantId.NUT,
        iterationPeopleDays: 3,
        input: [
          {
            resourceType: ResourceType.BASKET,
            quantity: 0.1,
          },
        ],
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
          quantity: 0.3,
        },
      ],
    }),
  },
  [FacilityType.HUNTERS_BOOTH_2]: {
    iterationInfoType: ItrationInfoType.FACILITY,
    maximumPeopleAtWork: 3,
    productionVariants: singleProductionVariant({
      iterationPeopleDays: 1,
      input: [
        {
          resourceType: ResourceType.WOODEN_BOW,
          quantity: 0.1,
        },
      ],
      output: [
        {
          resourceType: ResourceType.MEAT,
          quantity: 0.7,
        },
      ],
    }),
  },
  [FacilityType.KITCHEN]: {
    iterationInfoType: ItrationInfoType.FACILITY,
    maximumPeopleAtWork: 2,
    productionVariants: [
      {
        id: ProductVariantId.VEGAN_MEAL,
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
            quantity: 0.3,
          },
        ],
        output: [
          {
            resourceType: ResourceType.VEGAN_MEAL,
            quantity: 1,
          },
        ],
      },
      {
        id: ProductVariantId.COMPLEX_MEAL,
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
            quantity: 0.3,
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
      },
    ],
  },
  [FacilityType.LUMBER]: {
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
      {
        id: ProductVariantId.WOODEN_BOW,
        iterationPeopleDays: 1,
        input: [
          {
            resourceType: ResourceType.ROUTH_LUMBER,
            quantity: 2,
          },
        ],
        output: [
          {
            resourceType: ResourceType.WOODEN_BOW,
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
  [FacilityType.HOUSING_FACTORY]: {
    iterationInfoType: ItrationInfoType.FACILITY,
    maximumPeopleAtWork: 4,
    productionVariants: [
      {
        id: ProductVariantId.WICKIUP,
        iterationPeopleDays: 4,
        input: [
          {
            resourceType: ResourceType.ROUTH_LUMBER,
            quantity: 10,
          },
        ],
        output: [
          {
            resourceType: ResourceType.WICKIUP,
            quantity: 1,
          },
        ],
      },
      {
        id: ProductVariantId.HOVEL,
        iterationPeopleDays: 10,
        input: [
          {
            resourceType: ResourceType.ROUTH_LUMBER,
            quantity: 40,
          },
          {
            resourceType: ResourceType.HAY,
            quantity: 10,
          },
        ],
        output: [
          {
            resourceType: ResourceType.HOVEL,
            quantity: 1,
          },
        ],
      },
      {
        id: ProductVariantId.COTTAGE,
        iterationPeopleDays: 10,
        input: [
          {
            resourceType: ResourceType.ROUTH_LUMBER,
            quantity: 10,
          },
          {
            resourceType: ResourceType.HAY,
            quantity: 10,
          },
          {
            resourceType: ResourceType.STONE,
            quantity: 20,
          },
        ],
        output: [
          {
            resourceType: ResourceType.COTTAGE,
            quantity: 1,
          },
        ],
      },
    ],
  },
  [FacilityType.QUARRY]: {
    iterationInfoType: ItrationInfoType.FACILITY,
    maximumPeopleAtWork: 3,
    productionVariants: [
      {
        id: ProductVariantId.STONE,
        iterationPeopleDays: 5,
        input: [],
        output: [
          {
            resourceType: ResourceType.STONE,
            quantity: 2,
          },
        ],
      },
      {
        id: ProductVariantId.IRON_ORE,
        iterationPeopleDays: 5,
        input: [],
        output: [
          {
            resourceType: ResourceType.IRON_ORE,
            quantity: 1,
          },
        ],
      },
    ],
  },
};

export const depositToProductVariant: Record<
  DepositType,
  ProductVariantId | undefined
> = {
  [DepositType.STONE]: ProductVariantId.STONE,
  [DepositType.IRON]: ProductVariantId.IRON_ORE,
  [DepositType.COAL]: undefined,
  [DepositType.OIL]: undefined,
};

export const initiallyUnlockedFacilities: Set<FacilityLikeType> = new Set([
  FacilityType.GATHERING,
]);

export const facilitiesDescription: Record<FacilityType, string> = {
  [FacilityType.CITY]: 'City',
  [FacilityType.CONSTRUCTION]: 'Building',
  [FacilityType.LUMBER]: 'Lumber',
  [FacilityType.GATHERING]: 'Gathering',
  [FacilityType.GATHERING_2]: 'Gathering II',
  [FacilityType.KITCHEN]: 'Kitchen',
  [FacilityType.HUNTERS_BOOTH]: "Hunter's booth",
  [FacilityType.HUNTERS_BOOTH_2]: "Hunter's booth II",
  [FacilityType.CHOP_WOOD]: 'Chop wood',
  [FacilityType.FIELD]: 'Field',
  [FacilityType.WORK_SHOP]: 'Work shop',
  [FacilityType.STABLE]: 'Stable',
  [FacilityType.ANCIENT_FACTORY]: 'Ancient factory',
  [FacilityType.HOUSING_FACTORY]: 'Housing factory',
  [FacilityType.INTERCITY_SENDER]: 'Intercity sender',
  [FacilityType.INTERCITY_RECEIVER]: 'Intercity receiver',
  [FacilityType.QUARRY]: 'Quarry',
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
  [ProductVariantId.VEGAN_MEAL]: resourceLocalization[ResourceType.VEGAN_MEAL],
  [ProductVariantId.COMPLEX_MEAL]:
    resourceLocalization[ResourceType.COMPLEX_MEAL],
  [ProductVariantId.WOODEN_BOW]: resourceLocalization[ResourceType.WOODEN_BOW],
  [ProductVariantId.WICKIUP]: resourceLocalization[ResourceType.WICKIUP],
  [ProductVariantId.HOVEL]: resourceLocalization[ResourceType.HOVEL],
  [ProductVariantId.STONE]: resourceLocalization[ResourceType.STONE],
  [ProductVariantId.IRON_ORE]: resourceLocalization[ResourceType.IRON_ORE],
  [ProductVariantId.COTTAGE]: resourceLocalization[ResourceType.COTTAGE],
};
