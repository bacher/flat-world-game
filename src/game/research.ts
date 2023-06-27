export const enum ResearchId {
  AGRO_1 = 'AGRO_1',
  HORSES = 'HORSES',
}

export type Research = {
  researchId: ResearchId;
  points: number;
  requires: ResearchId[];
};

export const researches: Record<ResearchId, Research> = {
  [ResearchId.AGRO_1]: {
    researchId: ResearchId.AGRO_1,
    points: 100,
    requires: [],
  },
  [ResearchId.HORSES]: {
    researchId: ResearchId.HORSES,
    points: 200,
    requires: [ResearchId.AGRO_1],
  },
};

export const researchTranslations: Record<ResearchId, string> = {
  [ResearchId.AGRO_1]: 'Agroculture',
  [ResearchId.HORSES]: 'Horses',
};
