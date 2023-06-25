import { ResourceType } from './resources';

export type CellPosition = [number, number];

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
  HORSE_HOUSE = 'HORSE_HOUSE',
}

export type ExactFacilityType = Exclude<
  FacilityType,
  FacilityType.CITY | FacilityType.CONSTRUCTION
>;

export type FacilityTypeWithoutConstruction = Exclude<
  FacilityType,
  FacilityType.CONSTRUCTION
>;

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
  people: number;
  resourceType: ResourceType;
};

export type WorkingPath = {
  path: CellPath;
  workers: number;
  carriers: number;
};
