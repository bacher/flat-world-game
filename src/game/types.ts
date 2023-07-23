import type { Branded } from '@/utils/typeUtils';

import { ResourceType } from './resources';
import { DepositType } from './depositType';

export type CellCoordinates = { i: number; j: number };
export type CellPosition = CellCoordinates & { cellId: CellId };
export type CellId = Branded<number, 'cellId'>;
export type ChunkId = Branded<number, 'chunkId'>;
export type ChunkIdentity = CellCoordinates & { chunkId: ChunkId };

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

export type CellRect = {
  start: CellCoordinates;
  end: CellCoordinates;
};

export type CellShape = {
  cells: CellPosition[];
};

export type DepositInfo = {
  shape: CellShape;
  boundingRect: CellRect;
  depositType: DepositType;
};

export enum FacilityType {
  CITY = 'CITY',
  LUMBER = 'LUMBER',
  CONSTRUCTION = 'CONSTRUCTION',
  CHOP_WOOD = 'CHOP_WOOD',
  GATHERING = 'GATHERING',
  GATHERING_2 = 'GATHERING_2',
  KITCHEN = 'KITCHEN',
  WORK_SHOP = 'WORK_SHOP',
  FIELD = 'FIELD',
  STABLE = 'STABLE',
  ANCIENT_FACTORY = 'ANCIENT_FACTORY',
  HUNTERS_BOOTH = 'HUNTERS_BOOTH',
  HUNTERS_BOOTH_2 = 'HUNTERS_BOOTH_2',
  HOUSING_FACTORY = 'HOUSING_FACTORY',
  INTERCITY_SENDER = 'INTERCITY_SENDER',
  INTERCITY_RECEIVER = 'INTERCITY_RECEIVER',
}

export enum ProductVariantId {
  BASIC = 'BASIC',
  AGRICULTURAL_TOOLS = 'AGRICULTURAL_TOOLS',
  PAPYRUS = 'PAPYRUS',
  HAY = 'HAY',
  REED = 'REED',
  TEA = 'TEA',
  TEA_LEAVES = 'TEA_LEAVES',
  FRUIT = 'FRUIT',
  VEGETABLE = 'VEGETABLE',
  NUT = 'NUT',
  BASKET = 'BASKET',
  COMPLEX_MEAL = 'COMPLEX_MEAL',
  VEGAN_MEAL = 'VEGAN_MEAL',
  WOODEN_BOW = 'WOODEN_BOW',
  WICKIUP = 'WICKIUP',
  HOVEL = 'HOVEL',
}

export type ExactFacilityType = Exclude<
  FacilityType,
  | FacilityType.CITY
  | FacilityType.CONSTRUCTION
  | FacilityType.INTERCITY_SENDER
  | FacilityType.INTERCITY_RECEIVER
>;

export type FacilityLikeType = ExactFacilityType | StorageFacilityType;

export type FacilityLike = Facility | StorageFacility;

export type StorageFacilityType =
  | FacilityType.INTERCITY_SENDER
  | FacilityType.INTERCITY_RECEIVER;

export type CompleteFacilityType = Exclude<
  FacilityType,
  FacilityType.CONSTRUCTION
>;

export type FacilitiesByCityId = Map<
  CityId,
  (Construction | Facility | StorageFacility)[]
>;
export type StructuresByCellId = Map<CellId, Structure>;

export type CarrierPathsCellIdMap = Map<CellId, CarrierPath[]>;

export type GameState = {
  gameId: string;
  gameSeed: number;
  tickNumber: number;
  worldParams: WorldParams;
  cities: Map<CityId, City>;
  facilitiesByCityId: FacilitiesByCityId;
  structuresByCellId: StructuresByCellId;
  carrierPathsFromCellId: CarrierPathsCellIdMap;
  carrierPathsToCellId: CarrierPathsCellIdMap;
  alreadyCityNames: Set<string>;
  completedResearches: Set<ResearchId>;
  inProgressResearches: Map<ResearchId, { points: number }>;
  currentResearchId: ResearchId | undefined;
  unlockedFacilities: Set<FacilityLikeType>;
  unlockedProductionVariants: Map<FacilityLikeType, Set<ProductVariantId>>;
  pseudoRandom: () => number;
  depositsMapCache: DepositsMap;
};

export type ChunkDeposits = {
  deposits: DepositInfo[];
  map: Map<CellId, DepositType>;
};

export type DepositsMap = Map<ChunkId, ChunkDeposits>;

export type GameSave = {
  gameState: GameStateSnapshot;
  uiState: UiState;
};

export type GameStateSnapshot = {
  gameId: string;
  gameSeed: number;
  tickNumber: number;
  worldParams: WorldParams;
  cities: Omit<City, 'isNeedUpdateAutomaticPaths'>[];
  facilities: (Facility | StorageFacility | Construction)[];
  completedResearches: ResearchId[];
  currentResearchId: ResearchId | undefined;
  inProgressResearches: [ResearchId, { points: number }][];
};

export type WorldParams = {
  chunkSize: number;
  maxChunkDeposits: number;
  maxDepositRadius: number;
  ignoreDepositsInCenterRadius: number;
};

export type UiState = {
  center: CellCoordinates;
  zoom: number;
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
  isNeedUpdateAutomaticPaths: boolean;
  peopleDayPerCell: number;
  weightPerPeopleDay: number;
  peopleWorkModifier: number;
  cityReport: CityReportInfo;
};

export type CityLastTickReportInfo = {
  carrierPathReports: CarrierPathReport[];
  facilityWorkerReports: FacilityWorkReport[];
};

export type CityReportInfo = {
  population: {
    needStatistics: number[];
    lastTick: number;
  };
  lastTick: CityLastTickReportInfo;
};

export type Construction = StructureBase & {
  type: FacilityType.CONSTRUCTION;
  assignedCityId: CityId;
  buildingFacilityType: FacilityLikeType;
  assignedWorkersCount: number;
  inProcess: number;
  productionVariantId: ProductVariantId | ResourceType;
  isPaused: boolean;
};

export type Facility = StructureBase & {
  type: ExactFacilityType;
  assignedCityId: CityId;
  assignedWorkersCount: number;
  inProcess: number;
  productionVariantId: ProductVariantId | ResourceType;
  isPaused: boolean;
};

export type StorageFacility = StructureBase & {
  type: FacilityType.INTERCITY_SENDER | FacilityType.INTERCITY_RECEIVER;
  assignedCityId: CityId;
  resourceType: ResourceType;
  isPaused: boolean;
};

export function isExactFacility(structure: Structure): structure is Facility {
  return isExactFacilityType(structure.type);
}

export function isExactFacilityType(
  type: FacilityType,
): type is ExactFacilityType {
  return (
    type !== FacilityType.CITY &&
    type !== FacilityType.CONSTRUCTION &&
    !isStorageFacilityType(type)
  );
}

export function isStorageFacilityType(
  facilityType: FacilityType,
): facilityType is StorageFacilityType {
  return (
    facilityType === FacilityType.INTERCITY_SENDER ||
    facilityType === FacilityType.INTERCITY_RECEIVER
  );
}

export function isStorageFacility(
  structure: Structure,
): structure is StorageFacility {
  return isStorageFacilityType(structure.type);
}

export function isFacilityLike(
  structure: Structure,
): structure is FacilityLike {
  return (
    isExactFacilityType(structure.type) || isStorageFacilityType(structure.type)
  );
}

export type Structure = City | Construction | Facility | StorageFacility;

export type CellPath = {
  from: CellPosition;
  to: CellPosition;
};

export type StorageItem = {
  resourceType: ResourceType;
  quantity: number;
};

export enum CarrierPathType {
  AUTOMATIC,
  EXPLICIT,
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
  GATHERING_2 = 'GATHERING_2',
  COOKING = 'COOKING',
  HUNTING = 'HUNTING',
  HUNTING_2 = 'HUNTING_2',
  HOUSING = 'HOUSING',
  HOUSING_2 = 'HOUSING_2',
  INTERCITY = 'INTERCITY',
}

export type Research = {
  researchId: ResearchId;
  points: number;
  requires: ResearchId[];
  unlockFacilities: FacilityLikeType[];
  unlockProductionVariants?: Partial<
    Record<ExactFacilityType, ProductVariantId[]>
  >;
};

export type WorkDaysSummary = {
  exclusiveWorkDays: number;
  restWorkDays: number;
};
