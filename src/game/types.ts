import type { Branded } from '../utils/typeUtils';

import type { ResearchId } from './research';
import { ResourceType } from './resources';

export type CellPosition = [number, number];
export type CellId = Branded<number, 'cellId'>;

export type Point = [number, number];

export type CellRect = {
  start: CellPosition;
  end: CellPosition;
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

export type GameState = {
  gameId: string;
  cities: Map<CityId, City>;
  facilitiesByCityId: FacilitiesByCityId;
  structuresByCellId: StructuresByCellId;
  carrierPathsFromCellId: Map<CellId, CarrierPath[]>;
  carrierPathsToCellId: Map<CellId, CarrierPath[]>;
  alreadyCityNames: Set<string>;
  completedResearches: Set<ResearchId>;
  inProgressResearches: Map<ResearchId, { points: number }>;
  currentResearchId: ResearchId | undefined;
  unlockedFacilities: Set<ExactFacilityType>;
};

export type CityId = Branded<number, 'cityId'>;

type StructureBase = {
  position: CellPosition;
  cellId: CellId;
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
  lastTickNeedPopulation: number;
  lastTickWorkingPaths: WorkingPath[];
};

export type Construction = StructureBase & {
  type: FacilityType.CONSTRUCTION;
  assignedCityId: CityId;
  buildingFacilityType: ExactFacilityType;
  assignedWorkersCount: number;
  inProcess: number;
  iterationsComplete: number;
};

export type Facility = StructureBase & {
  type: ExactFacilityType;
  assignedCityId: CityId;
  assignedWorkersCount: number;
  inProcess: number;
  productionVariant: number;
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

export const citiesInputResourceTypes = [ResourceType.FOOD, ResourceType.HORSE];

export type CarrierPath = {
  path: CellPath;
  assignedCityId: CityId;
  people: number;
  resourceType: ResourceType;
};

export type WorkingPath = {
  path: CellPath;
  workers: number;
  carriers: number;
};
