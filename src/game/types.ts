import type { ResourceType } from './resources';

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
