import mapValues from 'lodash/mapValues';

import { FacilityType, ProductVariantId, Research, ResearchId } from './types';

const researchesInit: Record<ResearchId, Omit<Research, 'researchId'>> = {
  [ResearchId.WOOD_WORK]: {
    points: 100,
    requires: [],
    unlockFacilities: [FacilityType.SAWMILL, FacilityType.LOGGING],
  },
  [ResearchId.WOOD_WORK_2]: {
    points: 500,
    requires: [ResearchId.WOOD_WORK],
    unlockFacilities: [FacilityType.SAWMILL_2],
  },
  [ResearchId.WORK_SHOP]: {
    points: 200,
    requires: [ResearchId.WOOD_WORK],
    unlockFacilities: [FacilityType.WORK_SHOP],
  },
  [ResearchId.WORK_SHOP_2]: {
    points: 500,
    requires: [ResearchId.STONE],
    unlockFacilities: [FacilityType.WORK_SHOP_2],
    unlockProductionVariants: {
      [FacilityType.WORK_SHOP_2]: [
        ProductVariantId.AGRICULTURAL_TOOLS_STONE,
        ProductVariantId.AXE_STONE,
      ],
    },
  },
  [ResearchId.LOGGING]: {
    points: 500,
    requires: [ResearchId.STONE],
    unlockFacilities: [FacilityType.LOGGING_2],
  },
  [ResearchId.GATHERING_2]: {
    points: 300,
    requires: [ResearchId.WORK_SHOP, ResearchId.AGRO_1],
    unlockFacilities: [FacilityType.GATHERING_2],
    unlockProductionVariants: {
      [FacilityType.GATHERING_2]: [
        ProductVariantId.FRUIT,
        ProductVariantId.VEGETABLE,
        ProductVariantId.NUT,
      ],
      [FacilityType.WORK_SHOP]: [ProductVariantId.BASKET],
      [FacilityType.FIELD]: [ProductVariantId.REED],
    },
  },
  [ResearchId.COOKING]: {
    points: 200,
    requires: [ResearchId.GATHERING_2],
    unlockFacilities: [FacilityType.KITCHEN],
    unlockProductionVariants: {
      [FacilityType.KITCHEN]: [
        ProductVariantId.VEGAN_MEAL,
        ProductVariantId.COMPLEX_MEAL,
      ],
    },
  },
  [ResearchId.AGRO_1]: {
    points: 150,
    requires: [ResearchId.WORK_SHOP],
    unlockFacilities: [FacilityType.FIELD],
    unlockProductionVariants: {
      [FacilityType.WORK_SHOP]: [ProductVariantId.AGRICULTURAL_TOOLS],
      [FacilityType.FIELD]: [ProductVariantId.HAY],
    },
  },
  [ResearchId.HORSES]: {
    points: 250,
    requires: [ResearchId.AGRO_1],
    unlockFacilities: [FacilityType.RANCH, FacilityType.STABLE],
  },
  [ResearchId.PAPYRUS]: {
    points: 400,
    requires: [ResearchId.AGRO_1],
    unlockFacilities: [],
    unlockProductionVariants: {
      [FacilityType.WORK_SHOP]: [ProductVariantId.PAPYRUS],
      [FacilityType.FIELD]: [ProductVariantId.REED],
    },
  },
  [ResearchId.FACTORY_1]: {
    points: 400,
    requires: [],
    unlockFacilities: [FacilityType.ANCIENT_FACTORY],
  },
  [ResearchId.TEA]: {
    points: 500,
    requires: [ResearchId.FACTORY_1],
    unlockFacilities: [],
    unlockProductionVariants: {
      [FacilityType.ANCIENT_FACTORY]: [ProductVariantId.TEA],
      [FacilityType.FIELD]: [ProductVariantId.TEA_LEAVES],
    },
  },
  [ResearchId.HUNTING]: {
    points: 200,
    requires: [],
    unlockFacilities: [FacilityType.HUNTERS_BOOTH],
  },
  [ResearchId.HUNTING_2]: {
    points: 200,
    requires: [ResearchId.HUNTING],
    unlockFacilities: [FacilityType.HUNTERS_BOOTH_2],
    unlockProductionVariants: {
      [FacilityType.WORK_SHOP]: [ProductVariantId.WOODEN_BOW],
    },
  },
  [ResearchId.HOUSING]: {
    points: 500,
    requires: [ResearchId.FACTORY_1],
    unlockFacilities: [FacilityType.HOUSING_FACTORY],
    unlockProductionVariants: {
      [FacilityType.HOUSING_FACTORY]: [ProductVariantId.WICKIUP],
    },
  },
  [ResearchId.HOUSING_2]: {
    points: 500,
    requires: [ResearchId.HOUSING],
    unlockFacilities: [],
    unlockProductionVariants: {
      [FacilityType.HOUSING_FACTORY]: [ProductVariantId.HOVEL],
    },
  },
  [ResearchId.INTERCITY]: {
    points: 1000,
    requires: [ResearchId.HORSES],
    unlockFacilities: [
      FacilityType.INTERCITY_SENDER,
      FacilityType.INTERCITY_RECEIVER,
    ],
  },
  [ResearchId.STONE]: {
    points: 2000,
    requires: [ResearchId.INTERCITY],
    unlockFacilities: [FacilityType.QUARRY],
    unlockProductionVariants: {
      [FacilityType.QUARRY]: [ProductVariantId.STONE],
    },
  },
  [ResearchId.HOUSING_3]: {
    points: 1000,
    requires: [ResearchId.HOUSING_2],
    unlockFacilities: [],
    unlockProductionVariants: {
      [FacilityType.HOUSING_FACTORY]: [ProductVariantId.COTTAGE],
    },
  },
};

export const researches: Record<ResearchId, Research> = mapValues(
  researchesInit,
  (research, researchId) => {
    (research as any).researchId = researchId;
    return research as Research;
  },
);

export const researchTranslations: Record<ResearchId, string> = {
  [ResearchId.WOOD_WORK]: 'Wood work',
  [ResearchId.WOOD_WORK_2]: 'Wood work II',
  [ResearchId.WORK_SHOP]: 'Workshops',
  [ResearchId.WORK_SHOP_2]: 'Workshops II',
  [ResearchId.LOGGING]: 'Advanced logging',
  [ResearchId.AGRO_1]: 'Agroculture',
  [ResearchId.HORSES]: 'Horses',
  [ResearchId.PAPYRUS]: 'Papyrus',
  [ResearchId.FACTORY_1]: 'Ancient factory',
  [ResearchId.TEA]: 'Tea',
  [ResearchId.GATHERING_2]: 'Advanced gathering',
  [ResearchId.COOKING]: 'Cooking',
  [ResearchId.HUNTING]: 'Hunting',
  [ResearchId.HUNTING_2]: 'Hunting II',
  [ResearchId.HOUSING]: 'Housing',
  [ResearchId.HOUSING_2]: 'Housing II',
  [ResearchId.HOUSING_3]: 'Housing III',
  [ResearchId.INTERCITY]: 'Intercity exchange',
  [ResearchId.STONE]: 'Stone processing',
};
