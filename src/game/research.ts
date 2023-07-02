import { FacilityType, Research, ResearchId } from './types';

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
  },
  [ResearchId.HORSES]: {
    researchId: ResearchId.HORSES,
    points: 200,
    requires: [ResearchId.AGRO_1],
    unlockFacilities: [FacilityType.STABLE],
  },
};

export const researchTranslations: Record<ResearchId, string> = {
  [ResearchId.WOOD_WORK]: 'Wood work',
  [ResearchId.WORK_SHOP]: 'Workshops',
  [ResearchId.AGRO_1]: 'Agroculture',
  [ResearchId.HORSES]: 'Horses',
};
