import type { Branded } from '@/utils/typeUtils';

import { ResourceType } from './resources';

export type CellCoordinates = { i: number; j: number };
export type CellPosition = CellCoordinates & { cellId: CellId };
export type CellId = Branded<number, 'cellId'>;

export type Point = [number, number];

export type CellRect = {
  start: CellCoordinates;
  end: CellCoordinates;
};

export enum FacilityType {
  CITY = 'CITY',
  LUMBERT = 'LAMBERT',
  CONSTRUCTION = 'CONSTRUCTION',
  CHOP_WOOD = 'CHOP_WOOD',
  GATHERING = 'GATHERING',
  WORK_SHOP = 'WORK_SHOP',
  FIELD = 'FIELD',
  STABLE = 'STABLE',
  ANCIENT_FACTORY = 'ANCIENT_FACTORY',
}

export enum ProductVariantId {
  BASIC = 'BASIC',
  AGRICULTURAL_TOOLS = 'AGRICULTURAL_TOOLS',
  PAPYRUS = 'PAPYRUS',
  HAY = 'HAY',
  REED = 'REED',
  TEA = 'TEA',
  TEA_LEAVES = 'TEA_LEAVES',
}

export type ExactFacilityType = Exclude<
  FacilityType,
  FacilityType.CITY | FacilityType.CONSTRUCTION
>;

export type FacilityTypeWithoutConstruction = Exclude<
  FacilityType,
  FacilityType.CONSTRUCTION
>;

export type FacilitiesByCityId = Map<CityId, (Construction | Facility)[]>;
export type StructuresByCellId = Map<CellId, Structure>;

export type CarrierPathsCellIdMap = Map<CellId, CarrierPath[]>;

export type GameState = {
  tickNumber: number;
  gameId: string;
  cities: Map<CityId, City>;
  facilitiesByCityId: FacilitiesByCityId;
  structuresByCellId: StructuresByCellId;
  carrierPathsFromCellId: CarrierPathsCellIdMap;
  carrierPathsToCellId: CarrierPathsCellIdMap;
  alreadyCityNames: Set<string>;
  completedResearches: Set<ResearchId>;
  inProgressResearches: Map<ResearchId, { points: number }>;
  currentResearchId: ResearchId | undefined;
  unlockedFacilities: Set<ExactFacilityType>;
  unlockedProductionVariants: Map<ExactFacilityType, Set<ProductVariantId>>;
};

export type GameStateSnapshot = {
  gameId: string;
  tickNumber: number;
  cities: City[];
  facilities: (Facility | Construction)[];
  completedResearches: ResearchId[];
  currentResearchId: ResearchId | undefined;
  inProgressResearches: [ResearchId, { points: number }][];
};

export type CityId = Branded<number, 'cityId'>;

type StructureBase = {
  position: CellPosition;
  input: StorageItem[];
  output: StorageItem[];
};

export type City = StructureBase & {
  cityId: CityId;
  type: FacilityType.CITY;
  name: string;
  population: number;
  carrierPaths: CarrierPath[];
  peopleDayPerCell: number;
  weightPerPeopleDay: number;
  peopleWorkModifier: number;
  totalAssignedWorkersCount: number;
  lastTickReport: CityReportInfo;
};

export type CityReportInfo = {
  carrierPathReports: CarrierPathReport[];
  facilityWorkerReports: FacilityWorkReport[];
  needPopulation: number;
};

export type Construction = StructureBase & {
  type: FacilityType.CONSTRUCTION;
  assignedCityId: CityId;
  buildingFacilityType: ExactFacilityType;
  assignedWorkersCount: number;
  inProcess: number;
  iterationsComplete: number;
  productionVariantId: ProductVariantId;
  isPaused: boolean;
};

export type Facility = StructureBase & {
  type: ExactFacilityType;
  assignedCityId: CityId;
  assignedWorkersCount: number;
  inProcess: number;
  productionVariantId: ProductVariantId;
  isPaused: boolean;
};

export type Structure = City | Construction | Facility;

export type CellPath = {
  from: CellPosition;
  to: CellPosition;
};

export type StorageItem = {
  resourceType: ResourceType;
  quantity: number;
};

export enum CarrierPathType {
  CONSTRUCTION,
  FACILITY,
}

export type CarrierPath = {
  path: CellPath;
  assignedCityId: CityId;
  people: number;
  resourceType: ResourceType;
  pathType: CarrierPathType;
};

export type CarrierPathReport = {
  path: CellPath;
  carriers: number;
};

export type FacilityWorkReport = {
  facility: Facility | Construction;
  workers: number;
};

export const enum ResearchId {
  WOOD_WORK = 'WOOD_WORK',
  WORK_SHOP = 'WORK_SHOP',
  AGRO_1 = 'AGRO_1',
  HORSES = 'HORSES',
  PAPYRUS = 'PAPYRUS',
  FACTORY_1 = 'FACTORY_1',
  TEA = 'TEA',
}

export type Research = {
  researchId: ResearchId;
  points: number;
  requires: ResearchId[];
  unlockFacilities: ExactFacilityType[];
  unlockProductionVariants?: Partial<
    Record<ExactFacilityType, ProductVariantId[]>
  >;
};
