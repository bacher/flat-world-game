import partition from 'lodash/partition';

import { removeArrayItem } from '@/utils/helpers';
import { neverCall } from '@/utils/typeUtils';

import {
  BASE_PEOPLE_DAY_PER_CELL,
  BASE_PEOPLE_WORK_MODIFIER,
  BASE_WEIGHT_PER_PEOPLE_DAY,
  CITY_ACTUAL_BORDER_RADIUS,
  CITY_BORDER_RADIUS_SQUARE,
  CITY_POPULATION_STATISTICS_LENGTH,
  MINIMAL_CITY_PEOPLE,
} from './consts';
import {
  BoosterFacility,
  CarrierPath,
  CarrierPathsCellIdMap,
  CarrierPathType,
  CellCoordinates,
  CellId,
  CellPath,
  CellPosition,
  CellRect,
  ChunkId,
  ChunkIdentity,
  City,
  CityId,
  CityLastTickReportInfo,
  CityReportInfo,
  Construction,
  Facility,
  FacilityLikeType,
  FacilityType,
  GameState,
  isBoosterFacility,
  isBoosterFacilityType,
  isStorageFacility,
  isStorageFacilityType,
  ProductVariantId,
  StorageFacility,
  StorageItem,
  Structure,
  WorldParams,
} from './types';

import {
  foodNutritionlValue,
  houseCapacities,
  isFoodResourceType,
  isHouseResourceType,
  ResourceType,
} from './resources';
import {
  boostersIterationInfo,
  facilitiesIterationInfo,
  IterationInfoType,
} from './facilities';
import { facilitiesConstructionInfo } from './facilityConstruction';
import { generateNewCityName } from './cityNameGenerator';
import { cityResourcesInput } from './boosters';
import {
  calculateDistance,
  calculateDistanceSquare,
  newCellPosition,
  newChunkIdentity,
} from './helpers';

export function addCarrierPath(
  gameState: GameState,
  carrierPath: CarrierPath,
): void {
  const city = gameState.cities.get(carrierPath.assignedCityId)!;
  city.carrierPaths.push(carrierPath);

  addPathTo(
    gameState.carrierPathsFromCellId,
    carrierPath,
    carrierPath.path.from,
  );
  addPathTo(gameState.carrierPathsToCellId, carrierPath, carrierPath.path.to);
}

export function addPathTo(
  carrierPaths: Map<CellId, CarrierPath[]>,
  carrierPath: CarrierPath,
  pos: CellPosition,
): void {
  let alreadyPaths = carrierPaths.get(pos.cellId);

  if (!alreadyPaths) {
    alreadyPaths = [];
    carrierPaths.set(pos.cellId, alreadyPaths);
  }

  alreadyPaths.push(carrierPath);
}

export function addResource(
  storage: StorageItem[],
  addItem: StorageItem,
): void {
  if (addItem.quantity === 0) {
    return;
  }

  const alreadyResource = storage.find(
    (item) => item.resourceType === addItem.resourceType,
  );

  if (alreadyResource) {
    alreadyResource.quantity += addItem.quantity;
  } else {
    storage.push(addItem);
  }
}

export function addResources(
  storage: StorageItem[],
  addItems: StorageItem[],
): void {
  for (const addItem of addItems) {
    addResource(storage, addItem);
  }
}

export function grabResource(
  storage: StorageItem[],
  grabItem: StorageItem,
): StorageItem {
  const foundResource = storage.find(
    (item) => item.resourceType === grabItem.resourceType,
  );

  if (!foundResource) {
    return {
      resourceType: grabItem.resourceType,
      quantity: 0,
    };
  }

  if (foundResource.quantity <= grabItem.quantity) {
    const index = storage.indexOf(foundResource);
    storage.splice(index, 1);
    return {
      resourceType: grabItem.resourceType,
      quantity: foundResource.quantity,
    };
  }

  foundResource.quantity -= grabItem.quantity;
  return grabItem;
}

export function grabResourceStrict(
  storage: StorageItem[],
  grabItem: StorageItem,
): void {
  const grabbedItem = grabResource(storage, grabItem);
  if (grabbedItem.quantity !== grabItem.quantity) {
    throw new Error('Not enough resource');
  }
}

export function grabResourcesStrict(
  storage: StorageItem[],
  grabItems: StorageItem[],
) {
  for (const grabItem of grabItems) {
    grabResourceStrict(storage, grabItem);
  }
}

export function getResourceCount(
  storage: StorageItem[],
  resourceType: ResourceType,
): number {
  return (
    storage.find((item) => item.resourceType === resourceType)?.quantity ?? 0
  );
}

export function multiplyResourceStorage(
  storage: StorageItem[],
  mul: number,
): StorageItem[] {
  return storage.map((item) => multiplyResourceItem(item, mul));
}

export function multiplyResourceItem(
  { resourceType, quantity }: StorageItem,
  mul: number,
): StorageItem {
  return {
    resourceType,
    quantity: quantity * mul,
  };
}

// TODO!
const cityInput = cityResourcesInput.map((resourceType) => ({
  resourceType,
  quantity: 0,
}));

export function getStructureStorageInfo(structure: Structure): {
  input: StorageItem[];
  output: StorageItem[];
} {
  if (structure.type === FacilityType.CITY) {
    return {
      input: cityInput,
      output: [],
    };
  }

  if (isStorageFacility(structure)) {
    switch (structure.type) {
      case FacilityType.INTERCITY_SENDER:
        return {
          input: [
            {
              resourceType: structure.resourceType,
              quantity: 0,
            },
          ],
          output: [],
        };
      case FacilityType.INTERCITY_RECEIVER:
        return {
          input: [],
          output: [
            {
              resourceType: structure.resourceType,
              quantity: 0,
            },
          ],
        };
      default:
        throw neverCall(structure);
    }
  }

  if (isBoosterFacility(structure)) {
    const iterationInfo = boostersIterationInfo[structure.type];

    const variant = iterationInfo.productionVariants.find(
      (variant) => variant.id === structure.productionVariantId,
    )!;

    return {
      input: variant.input.map(({ resourceType }) => ({
        resourceType,
        quantity: 0,
      })),
      output: [],
    };
  }

  return getStructureIterationStorageInfo(structure);
}

export function getStructureIterationStorageInfo(
  facility: Facility | Construction,
): {
  input: StorageItem[];
  output: StorageItem[];
  iterationPeopleDays: number;
} {
  if (facility.type === FacilityType.CONSTRUCTION) {
    const info = facilitiesConstructionInfo[facility.buildingFacilityType];
    return {
      iterationPeopleDays: info.iterationPeopleDays,
      input: info.input,
      output: [],
    };
  }

  const iterationInfo = facilitiesIterationInfo[facility.type];

  return iterationInfo.productionVariants.find(
    (variant) => variant.id === facility.productionVariantId,
  )!;
}

export function getMaximumIterationsByResources(
  facility: Facility | Construction,
): number {
  let minIterations = Infinity;

  for (const resource of getStructureStorageInfo(facility).input) {
    const iterations = Math.floor(
      getResourceCount(facility.input, resource.resourceType) /
        resource.quantity,
    );

    if (iterations < minIterations) {
      minIterations = iterations;
    }
  }

  return minIterations;
}

export function addCity(
  gameState: GameState,
  { position }: { position: CellPosition },
): City {
  const city: City = {
    cityId: position.cellId as unknown as CityId,
    type: FacilityType.CITY,
    name: generateNewCityName(gameState.alreadyCityNames, true),
    position,
    chunksIds: getCityChunksByPosition(gameState.worldParams, position),
    population: MINIMAL_CITY_PEOPLE,
    carrierPaths: [],
    isNeedUpdateAutomaticPaths: false,
    peopleDayPerCell: BASE_PEOPLE_DAY_PER_CELL,
    weightPerPeopleDay: BASE_WEIGHT_PER_PEOPLE_DAY,
    peopleWorkModifier: BASE_PEOPLE_WORK_MODIFIER,
    cityReport: createEmptyCityReport(),
    input: [],
    output: [],
  };

  gameState.cities.set(city.cityId, city);
  gameState.facilitiesByCityId.set(city.cityId, []);
  gameState.structuresByCellId.set(city.position.cellId, city);

  return city;
}

export function getCityChunksByPosition(
  worldParams: WorldParams,
  { i, j }: CellPosition,
): Set<ChunkId> {
  const r = CITY_ACTUAL_BORDER_RADIUS;

  const chunksIds = [
    { i: -r, j: -r },
    { i: r, j: -r },
    { i: r, j: r },
    { i: -r, j: r },
  ].map(
    (coord) =>
      getChunkByCell(worldParams, {
        i: i + coord.i,
        j: j + coord.j,
      }).chunkId,
  );

  return new Set(chunksIds);
}

function addCityFacility(
  gameState: GameState,
  city: City,
  facility: Facility | Construction,
): void {
  const facilities = gameState.facilitiesByCityId.get(city.cityId)!;

  facilities.push(facility);

  gameState.structuresByCellId.set(facility.position.cellId, facility);
  city.isNeedUpdateAutomaticPaths = true;
}

export function addConstructionStructure(
  gameState: GameState,
  {
    facilityType,
    position,
    productionVariantId,
  }: {
    facilityType: FacilityLikeType;
    position: CellPosition;
    productionVariantId: ProductVariantId | ResourceType;
  },
): void {
  const city = getNearestCity(gameState, position);

  const buildingFacilility: Construction = {
    type: FacilityType.CONSTRUCTION,
    assignedCityId: city.cityId,
    position,
    buildingFacilityType: facilityType,
    assignedWorkersCount:
      facilitiesConstructionInfo[facilityType].maximumPeopleAtWork,
    input: [],
    output: [],
    inProcess: 0,
    productionVariantId,
    isPaused: false,
  };

  addCityFacility(gameState, city, buildingFacilility);
}

export function completeConstruction(
  gameState: GameState,
  construction: Construction,
): Facility | StorageFacility | BoosterFacility {
  let facility: Facility | StorageFacility | BoosterFacility;

  if (isStorageFacilityType(construction.buildingFacilityType)) {
    facility = {
      type: construction.buildingFacilityType,
      assignedCityId: construction.assignedCityId,
      position: construction.position,
      input: [],
      output: [],
      // TODO:
      resourceType: construction.productionVariantId as ResourceType,
      isPaused: false,
    };
  } else if (isBoosterFacilityType(construction.buildingFacilityType)) {
    facility = {
      type: construction.buildingFacilityType,
      assignedCityId: construction.assignedCityId,
      position: construction.position,
      productionVariantId: construction.productionVariantId as ProductVariantId,
      input: [],
      output: [],
      isPaused: false,
    };
  } else {
    const iterationInfo =
      facilitiesIterationInfo[construction.buildingFacilityType];

    if (iterationInfo.iterationInfoType !== IterationInfoType.FACILITY) {
      throw new Error();
    }

    facility = {
      type: construction.buildingFacilityType,
      assignedCityId: construction.assignedCityId,
      position: construction.position,
      assignedWorkersCount: iterationInfo.maximumPeopleAtWork,
      productionVariantId: construction.productionVariantId as ProductVariantId,
      input: [],
      output: [],
      inProcess: 0,
      isPaused: false,
    };
  }

  removeAllCarrierPathsTo(
    gameState,
    facility.position.cellId,
    CarrierPathType.AUTOMATIC,
  );
  replaceCunstructionByFacility(gameState, construction, facility);

  return facility;
}

function replaceCunstructionByFacility(
  gameState: GameState,
  construction: Construction,
  facility: Facility | StorageFacility | BoosterFacility,
): void {
  const city = gameState.cities.get(facility.assignedCityId)!;
  const facilities = gameState.facilitiesByCityId.get(city.cityId)!;

  const index = facilities.indexOf(construction);
  if (index === -1) {
    throw new Error('No construction found');
  }

  facilities[index] = facility;
  gameState.structuresByCellId.set(facility.position.cellId, facility);

  city.isNeedUpdateAutomaticPaths = true;
}

export function removeAllCarrierPathsTo(
  gameState: GameState,
  cellId: CellId,
  carrierPathType: CarrierPathType,
): void {
  removeAllCarrierPathsSystem(
    gameState,
    cellId,
    carrierPathType,
    gameState.carrierPathsToCellId,
    gameState.carrierPathsFromCellId,
    (path) => path.from,
  );
}

export function removeAllCarrierPathsFrom(
  gameState: GameState,
  cellId: CellId,
  carrierPathType: CarrierPathType,
): void {
  removeAllCarrierPathsSystem(
    gameState,
    cellId,
    carrierPathType,
    gameState.carrierPathsFromCellId,
    gameState.carrierPathsToCellId,
    (path) => path.to,
  );
}

function removeAllCarrierPathsSystem(
  gameState: GameState,
  cellId: CellId,
  carrierPathType: CarrierPathType,
  storage: CarrierPathsCellIdMap,
  opositeStorage: CarrierPathsCellIdMap,
  getOposite: (path: CellPath) => CellPosition,
) {
  const paths = storage.get(cellId);

  if (paths) {
    const [remove, stay] = partition(
      paths,
      (path) => path.pathType === carrierPathType,
    );

    for (const path of remove) {
      const fromPaths = opositeStorage.get(getOposite(path.path).cellId)!;
      removeArrayItem(fromPaths, path);

      const assignedCity = gameState.cities.get(path.assignedCityId)!;
      removeArrayItem(assignedCity.carrierPaths, path);
    }

    if (stay.length > 0) {
      storage.set(cellId, stay);
    } else {
      storage.delete(cellId);
    }
  }
}

export function removeAllCarrierPathsVia(
  gameState: GameState,
  cellId: CellId,
  carrierPathType: CarrierPathType,
): void {
  removeAllCarrierPathsTo(gameState, cellId, carrierPathType);
  removeAllCarrierPathsFrom(gameState, cellId, carrierPathType);
}

export function getConstructionMaximumAddingLimit(
  construction: Construction,
  resourceType: ResourceType,
): number {
  const constructionInfo =
    facilitiesConstructionInfo[construction.buildingFacilityType];

  const iterationInputCount = getResourceCount(
    constructionInfo.input,
    resourceType,
  );

  if (!iterationInputCount) {
    return 0;
  }

  const alreadyQuantity = getResourceCount(construction.input, resourceType);

  return Math.max(0, iterationInputCount - alreadyQuantity);
}

export function getNearestCity(gameState: GameState, cell: CellPosition): City {
  let nearestCity: City | undefined;
  let nearestCityDistance = Infinity;

  for (const city of gameState.cities.values()) {
    const distance = calculateDistance(city.position, cell);

    if (
      distance < nearestCityDistance ||
      (nearestCity &&
        distance === nearestCityDistance &&
        nearestCity.population < city.population)
    ) {
      nearestCity = city;
      nearestCityDistance = distance;
    }
  }

  if (!nearestCity) {
    throw new Error('Invariant');
  }

  return nearestCity;
}

export function getFacilityBindedCity(
  gameState: GameState,
  facility: Structure,
): City {
  if (facility.type === FacilityType.CITY) {
    return facility;
  }

  return gameState.cities.get(facility.assignedCityId)!;
}

export function removeFacility(
  gameState: GameState,
  facility: Facility | BoosterFacility | StorageFacility | Construction,
): void {
  const city = gameState.cities.get(facility.assignedCityId)!;
  const facilities = gameState.facilitiesByCityId.get(city.cityId)!;

  removeAllCarrierPathsVia(
    gameState,
    facility.position.cellId,
    CarrierPathType.AUTOMATIC,
  );
  removeAllCarrierPathsVia(
    gameState,
    facility.position.cellId,
    CarrierPathType.EXPLICIT,
  );

  removeArrayItem(facilities, facility);

  gameState.structuresByCellId.delete(facility.position.cellId);

  city.isNeedUpdateAutomaticPaths = true;
}

export function getCarrierPathStructures(
  gameState: GameState,
  carrierPath: CarrierPath,
): { from: Structure; to: Structure } {
  const from = gameState.structuresByCellId.get(carrierPath.path.from.cellId)!;
  const to = gameState.structuresByCellId.get(carrierPath.path.to.cellId)!;

  return {
    from,
    to,
  };
}

export function createEmptyLastTickCityReport(): CityLastTickReportInfo {
  return {
    carrierPathReports: [],
    facilityWorkerReports: [],
  };
}

export function createEmptyCityReport(): CityReportInfo {
  return {
    lastTick: createEmptyLastTickCityReport(),
    population: {
      lastTick: 0,
      needStatistics: Array(CITY_POPULATION_STATISTICS_LENGTH).fill(0),
    },
  };
}

export function getAllStructuresInArea(
  gameState: GameState,
  area: CellRect,
): Structure[] {
  const structures: Structure[] = [];
  for (let i = area.start.i; i <= area.end.i; i += 1) {
    for (let j = area.start.j; j <= area.end.j; j += 1) {
      const cell = newCellPosition({ i, j });
      const structure = gameState.structuresByCellId.get(cell.cellId);

      if (structure) {
        structures.push(structure);
      }
    }
  }

  return structures;
}

export function getAssignedCityId(structure: Structure): CityId {
  if (structure.type === FacilityType.CITY) {
    return structure.cityId;
  }
  return structure.assignedCityId;
}

export function getCityResourceSubstitute(resourceType: ResourceType): {
  resourceType: ResourceType;
  modifier: number;
} {
  if (isFoodResourceType(resourceType)) {
    return {
      resourceType: ResourceType.FOOD,
      modifier: foodNutritionlValue[resourceType],
    };
  }

  if (isHouseResourceType(resourceType)) {
    return {
      resourceType: ResourceType.HOUSING,
      modifier: houseCapacities[resourceType],
    };
  }

  return {
    resourceType,
    modifier: 1,
  };
}

export function getChunkByCell(
  worldParams: WorldParams,
  cell: CellCoordinates,
): ChunkIdentity {
  const { chunkSize } = worldParams;
  return newChunkIdentity({
    i: Math.floor(cell.i / chunkSize) * chunkSize,
    j: Math.floor(cell.j / chunkSize) * chunkSize,
  });
}

export function changeCityName(
  gameState: GameState,
  city: City,
  name: string,
): void {
  gameState.alreadyCityNames.delete(name);
  city.name = name;
  gameState.alreadyCityNames.add(name);
}

export function isCellInsideCityBorder(
  cityCell: CellPosition,
  cell: CellPosition,
): boolean {
  return calculateDistanceSquare(cityCell, cell) < CITY_BORDER_RADIUS_SQUARE;
}
