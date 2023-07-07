import { FacilityType, ProductVariantId, Research, ResearchId } from './types';

export const researches: Record<ResearchId, Research> = {
  [ResearchId.WOOD_WORK]: {
    researchId: ResearchId.WOOD_WORK,
    points: 100,
    requires: [],
    unlockFacilities: [FacilityType.CHOP_WOOD, FacilityType.LUMBERT],
  },
  [ResearchId.WORK_SHOP]: {
    researchId: ResearchId.WORK_SHOP,
    points: 150,
    requires: [ResearchId.WOOD_WORK],
    unlockFacilities: [FacilityType.WORK_SHOP],
  },
  [ResearchId.AGRO_1]: {
    researchId: ResearchId.AGRO_1,
    points: 150,
    requires: [ResearchId.WORK_SHOP],
    unlockFacilities: [FacilityType.FIELD],
    unlockProductionVariants: {
      [FacilityType.WORK_SHOP]: [ProductVariantId.AGRICULTURAL_TOOLS],
      [FacilityType.FIELD]: [ProductVariantId.HAY],
    },
  },
  [ResearchId.HORSES]: {
    researchId: ResearchId.HORSES,
    points: 200,
    requires: [ResearchId.AGRO_1],
    unlockFacilities: [FacilityType.STABLE],
  },
  [ResearchId.PAPYRUS]: {
    researchId: ResearchId.PAPYRUS,
    points: 400,
    requires: [ResearchId.AGRO_1],
    unlockFacilities: [],
    unlockProductionVariants: {
      [FacilityType.WORK_SHOP]: [ProductVariantId.PAPYRUS],
      [FacilityType.FIELD]: [ProductVariantId.REED],
    },
  },
  [ResearchId.FACTORY_1]: {
    researchId: ResearchId.FACTORY_1,
    points: 400,
    requires: [],
    unlockFacilities: [FacilityType.ANCIENT_FACTORY],
  },
  [ResearchId.TEA]: {
    researchId: ResearchId.TEA,
    points: 500,
    requires: [],
    unlockFacilities: [],
    unlockProductionVariants: {
      [FacilityType.ANCIENT_FACTORY]: [ProductVariantId.TEA],
      [FacilityType.FIELD]: [ProductVariantId.TEA_LEAVES],
    },
  },
};

export const researchTranslations: Record<ResearchId, string> = {
  [ResearchId.WOOD_WORK]: 'Wood work',
  [ResearchId.WORK_SHOP]: 'Workshops',
  [ResearchId.AGRO_1]: 'Agroculture',
  [ResearchId.HORSES]: 'Horses',
  [ResearchId.PAPYRUS]: 'Papyrus',
  [ResearchId.FACTORY_1]: 'Ancient factory',
  [ResearchId.TEA]: 'Tea',
};
