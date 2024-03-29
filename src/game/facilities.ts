import {
  ExactFacilityType,
  FacilityLikeType,
  FacilityType,
  ProductVariantId,
  StorageItem,
} from './types';
import { resourceLocalization, ResourceType } from './resources';
import { DepositType } from './depositType';

export const enum IterationInfoType {
  FACILITY = 'FACILITY',
  BOOSTER = 'BOOSTER',
  CONSTRUCTION = 'CONSTRUCTION',
}

export type ProductionVariantInfo = {
  id: ProductVariantId;
  iterationPeopleDays: number;
  input: StorageItem[];
  output: StorageItem[];
};

export type DynamicProductionVariantInfo = {
  id: ProductVariantId;
  input: DynamicStorageItem[];
};

export type DynamicStorageItem = {
  resourceType: ResourceType;
};

export function isStaticProductionVariant(
  productionVariant: ProductionVariantInfo | DynamicProductionVariantInfo,
): productionVariant is ProductionVariantInfo {
  return (productionVariant as any).output !== undefined;
}

export function isStaticStorageItem(
  storageItem: StorageItem | DynamicStorageItem,
): storageItem is StorageItem {
  return (storageItem as any).quantity !== undefined;
}

export type FacilityIterationInfo = {
  iterationInfoType: IterationInfoType.FACILITY;
  maximumPeopleAtWork: number;
  productionVariants: ProductionVariantInfo[];
};

export type BoosterIterationInfo = {
  iterationInfoType: IterationInfoType.BOOSTER;
  productionVariants: DynamicProductionVariantInfo[];
};

function singleProductionVariant(
  info: Omit<ProductionVariantInfo, 'id'>,
): ProductionVariantInfo[] {
  return [
    {
      id: ProductVariantId.BASIC,
      ...info,
    },
  ];
}

function singleDynamicProductionVariant(
  info: Omit<DynamicProductionVariantInfo, 'id'>,
): DynamicProductionVariantInfo[] {
  return [
    {
      id: ProductVariantId.BASIC,
      ...info,
    },
  ];
}

export const facilitiesIterationInfo: Record<
  ExactFacilityType,
  FacilityIterationInfo
> = {
  [FacilityType.GATHERING]: {
    iterationInfoType: IterationInfoType.FACILITY,
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
    iterationInfoType: IterationInfoType.FACILITY,
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
    iterationInfoType: IterationInfoType.FACILITY,
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
    iterationInfoType: IterationInfoType.FACILITY,
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
    iterationInfoType: IterationInfoType.FACILITY,
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
  [FacilityType.LOGGING]: {
    iterationInfoType: IterationInfoType.FACILITY,
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
  [FacilityType.LOGGING_2]: {
    iterationInfoType: IterationInfoType.FACILITY,
    maximumPeopleAtWork: 4,
    productionVariants: singleProductionVariant({
      iterationPeopleDays: 1,
      input: [
        {
          resourceType: ResourceType.AXE_STONE,
          quantity: 0.1,
        },
      ],
      output: [
        {
          resourceType: ResourceType.LOG,
          quantity: 2,
        },
      ],
    }),
  },
  [FacilityType.SAWMILL]: {
    iterationInfoType: IterationInfoType.FACILITY,
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
          resourceType: ResourceType.LUMBER_ROUGH,
          quantity: 2,
        },
      ],
    }),
  },
  [FacilityType.SAWMILL_2]: {
    iterationInfoType: IterationInfoType.FACILITY,
    maximumPeopleAtWork: 4,
    productionVariants: singleProductionVariant({
      iterationPeopleDays: 1,
      input: [
        {
          resourceType: ResourceType.LOG,
          quantity: 1,
        },
        {
          resourceType: ResourceType.AXE_STONE,
          quantity: 0.1,
        },
      ],
      output: [
        {
          resourceType: ResourceType.LUMBER_ROUGH,
          quantity: 3,
        },
      ],
    }),
  },
  [FacilityType.WORK_SHOP]: {
    iterationInfoType: IterationInfoType.FACILITY,
    maximumPeopleAtWork: 3,
    productionVariants: [
      {
        id: ProductVariantId.AGRICULTURAL_TOOLS,
        iterationPeopleDays: 1,
        input: [
          {
            resourceType: ResourceType.LUMBER_ROUGH,
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
            resourceType: ResourceType.LUMBER_ROUGH,
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
  [FacilityType.WORK_SHOP_2]: {
    iterationInfoType: IterationInfoType.FACILITY,
    maximumPeopleAtWork: 4,
    productionVariants: [
      {
        id: ProductVariantId.AGRICULTURAL_TOOLS_STONE,
        iterationPeopleDays: 1,
        input: [
          {
            resourceType: ResourceType.LUMBER_ROUGH,
            quantity: 1,
          },
          {
            resourceType: ResourceType.STONE,
            quantity: 0.5,
          },
        ],
        output: [
          {
            resourceType: ResourceType.AGRICULTURAL_TOOLS_STONE,
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
        id: ProductVariantId.AXE_STONE,
        iterationPeopleDays: 1,
        input: [
          {
            resourceType: ResourceType.LUMBER_ROUGH,
            quantity: 1,
          },
          {
            resourceType: ResourceType.STONE,
            quantity: 0.5,
          },
        ],
        output: [
          {
            resourceType: ResourceType.AXE_STONE,
            quantity: 2,
          },
        ],
      },
    ],
  },
  [FacilityType.FIELD]: {
    iterationInfoType: IterationInfoType.FACILITY,
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
  [FacilityType.RANCH]: {
    iterationInfoType: IterationInfoType.FACILITY,
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
    iterationInfoType: IterationInfoType.FACILITY,
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
    iterationInfoType: IterationInfoType.FACILITY,
    maximumPeopleAtWork: 4,
    productionVariants: [
      {
        id: ProductVariantId.WICKIUP,
        iterationPeopleDays: 4,
        input: [
          {
            resourceType: ResourceType.LUMBER_ROUGH,
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
            resourceType: ResourceType.LUMBER_ROUGH,
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
            resourceType: ResourceType.LUMBER_ROUGH,
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
    iterationInfoType: IterationInfoType.FACILITY,
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

export const boostersIterationInfo = {
  [FacilityType.STABLE]: {
    iterationInfoType: IterationInfoType.BOOSTER,
    productionVariants: singleDynamicProductionVariant({
      input: [
        {
          resourceType: ResourceType.HORSE,
        },
        {
          resourceType: ResourceType.HORSE_WITH_CART,
        },
      ],
    }),
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
  [FacilityType.LOGGING]: 'Logging',
  [FacilityType.LOGGING_2]: 'Logging II',
  [FacilityType.GATHERING]: 'Gathering',
  [FacilityType.GATHERING_2]: 'Gathering II',
  [FacilityType.KITCHEN]: 'Kitchen',
  [FacilityType.HUNTERS_BOOTH]: "Hunter's booth",
  [FacilityType.HUNTERS_BOOTH_2]: "Hunter's booth II",
  [FacilityType.SAWMILL]: 'Sawmill',
  [FacilityType.SAWMILL_2]: 'Sawmill II',
  [FacilityType.FIELD]: 'Field',
  [FacilityType.WORK_SHOP]: 'Work shop',
  [FacilityType.WORK_SHOP_2]: 'Work shop II',
  [FacilityType.RANCH]: 'Ranch',
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
  [ProductVariantId.AGRICULTURAL_TOOLS_STONE]:
    resourceLocalization[ResourceType.AGRICULTURAL_TOOLS_STONE],
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
  [ProductVariantId.AXE_STONE]: resourceLocalization[ResourceType.AXE_STONE],
};
