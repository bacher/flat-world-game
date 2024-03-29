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
  LOGGING = 'LUMBER', // TODO: rename
  LOGGING_2 = 'LOGGING_2',
  CONSTRUCTION = 'CONSTRUCTION',
  SAWMILL = 'CHOP_WOOD', // TODO: rename
  SAWMILL_2 = 'SAWMILL_2',
  GATHERING = 'GATHERING',
  GATHERING_2 = 'GATHERING_2',
  KITCHEN = 'KITCHEN',
  WORK_SHOP = 'WORK_SHOP',
  WORK_SHOP_2 = 'WORK_SHOP_2',
  FIELD = 'FIELD',
  RANCH = 'RANCH',
  STABLE = 'STABLE',
  ANCIENT_FACTORY = 'ANCIENT_FACTORY',
  HUNTERS_BOOTH = 'HUNTERS_BOOTH',
  HUNTERS_BOOTH_2 = 'HUNTERS_BOOTH_2',
  HOUSING_FACTORY = 'HOUSING_FACTORY',
  INTERCITY_SENDER = 'INTERCITY_SENDER',
  INTERCITY_RECEIVER = 'INTERCITY_RECEIVER',
  QUARRY = 'QUARRY',
}

export enum ProductVariantId {
  BASIC = 'BASIC',
  AGRICULTURAL_TOOLS = 'AGRICULTURAL_TOOLS',
  AGRICULTURAL_TOOLS_STONE = 'AGRICULTURAL_TOOLS_STONE',
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
  STONE = 'STONE',
  IRON_ORE = 'IRON_ORE',
  COTTAGE = 'COTTAGE',
  AXE_STONE = 'AXE_STONE',
}

export type ExactFacilityType = Exclude<
  FacilityType,
  | FacilityType.CITY
  | FacilityType.CONSTRUCTION
  | FacilityType.STABLE
  | FacilityType.INTERCITY_SENDER
  | FacilityType.INTERCITY_RECEIVER
>;

export type FacilityLikeType =
  | ExactFacilityType
  | BoosterFacilityType
  | StorageFacilityType;

export type FacilityLike = Facility | BoosterFacility | StorageFacility;

export function isFacilityLike(
  structure: Structure,
): structure is FacilityLike {
  return (
    isExactFacilityType(structure.type) ||
    isBoosterFacilityType(structure.type) ||
    isStorageFacilityType(structure.type)
  );
}

export type StorageFacilityType =
  | FacilityType.INTERCITY_SENDER
  | FacilityType.INTERCITY_RECEIVER;

export type BoosterFacilityType = FacilityType.STABLE;

export type CompleteFacilityType = Exclude<
  FacilityType,
  FacilityType.CONSTRUCTION
>;

export type FacilitiesByCityId = Map<
  CityId,
  (Construction | Facility | StorageFacility | BoosterFacility)[]
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
  viewportState: ViewportState;
};

export type GameStateSnapshot = {
  gameId: string;
  gameSeed: number;
  tickNumber: number;
  worldParams: WorldParams;
  cities: Omit<City, 'isNeedUpdateAutomaticPaths' | 'chunksIds'>[];
  facilities: (Facility | StorageFacility | BoosterFacility | Construction)[];
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

export type ViewportState = {
  center: CellCoordinates;
  scale: number;
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
  chunksIds: Set<ChunkId>;
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
  productionVariantId: ProductVariantId;
  isPaused: boolean;
};

export type StorageFacility = StructureBase & {
  type: FacilityType.INTERCITY_SENDER | FacilityType.INTERCITY_RECEIVER;
  assignedCityId: CityId;
  resourceType: ResourceType;
  isPaused: boolean;
};

export type BoosterFacility = StructureBase & {
  type: FacilityType.STABLE;
  assignedCityId: CityId;
  productionVariantId: ProductVariantId;
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
    !isBoosterFacilityType(type) &&
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

export function isBoosterFacilityType(
  facilityType: FacilityType,
): facilityType is BoosterFacilityType {
  return facilityType === FacilityType.STABLE;
}

export function isBoosterFacility(
  structure: Structure,
): structure is BoosterFacility {
  return isBoosterFacilityType(structure.type);
}

export type Structure =
  | City
  | Construction
  | Facility
  | StorageFacility
  | BoosterFacility;

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
  WOOD_WORK_2 = 'WOOD_WORK_2',
  WORK_SHOP = 'WORK_SHOP',
  WORK_SHOP_2 = 'WORK_SHOP_2',
  LOGGING = 'LOGGING',
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
  HOUSING_3 = 'HOUSING_3',
  INTERCITY = 'INTERCITY',
  STONE = 'STONE',
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
  privilegedWorkDays: number;
  restWorkDays: number;
};

export function sumWorkDays(workHours: WorkDaysSummary): number {
  return (
    workHours.exclusiveWorkDays +
    workHours.privilegedWorkDays +
    workHours.restWorkDays
  );
}
