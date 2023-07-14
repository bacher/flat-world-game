import mapValues from 'lodash/mapValues';

import { FacilityType, ProductVariantId, Research, ResearchId } from './types';

const researchesInit: Record<ResearchId, Omit<Research, 'researchId'>> = {
  [ResearchId.WOOD_WORK]: {
    points: 100,
    requires: [],
    unlockFacilities: [FacilityType.CHOP_WOOD, FacilityType.LUMBER],
  },
  [ResearchId.WORK_SHOP]: {
    points: 150,
    requires: [ResearchId.WOOD_WORK],
    unlockFacilities: [FacilityType.WORK_SHOP],
  },
  [ResearchId.GATHERING_2]: {
    points: 100,
    requires: [],
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
    points: 200,
    requires: [ResearchId.AGRO_1],
    unlockFacilities: [FacilityType.STABLE],
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
    requires: [],
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
  [ResearchId.WORK_SHOP]: 'Workshops',
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
};
