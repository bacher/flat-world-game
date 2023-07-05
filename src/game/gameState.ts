import partition from 'lodash/partition';

import { removeArrayItem } from '@/utils/helpers';

import { generateNewCityName } from './cityNameGenerator';
import {
  CarrierPath,
  CarrierPathType,
  CarrierPathsCellIdMap,
  CellId,
  CellPath,
  CellPosition,
  City,
  CityId,
  Construction,
  ExactFacilityType,
  Facility,
  FacilityType,
  GameState,
  StorageItem,
  Structure,
} from './types';
import { ResourceType } from './resources';
import {
  facilitiesConstructionInfo,
  facilitiesIterationInfo,
} from './facilities';
import {
  BASE_PEOPLE_DAY_PER_CELL,
  BASE_PEOPLE_WORK_MODIFIER,
  BASE_WEIGHT_PER_PEOPLE_DAY,
  OUTPUT_BUFFER_DAYS,
  MINIMAL_CITY_PEOPLE,
} from './consts';
import { calculateDistance, isSamePos } from './helpers';

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

export function actualizeCityTotalAssignedWorkersCount(
  gameState: GameState,
  city: City,
): void {
  const carriers = city.carrierPaths.reduce(
    (acc, path) => acc + path.people,
    0,
  );

  const workers =
    gameState.facilitiesByCityId
      .get(city.cityId)
      ?.reduce((acc, facility) => acc + facility.assignedWorkersCount, 0) ?? 0;

  city.totalAssignedWorkersCount = Math.min(
    city.population,
    carriers + workers,
  );
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
  resources: StorageItem[],
  mul: number,
): StorageItem[] {
  return resources.map(({ resourceType, quantity }) => ({
    resourceType,
    quantity: quantity * mul,
  }));
}

export function getStructureIterationStorageInfo(
  facility: Facility | Construction,
): {
  iterationPeopleDays: number;
  input: StorageItem[];
  output: StorageItem[];
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

  return iterationInfo.productionVariants[facility.productionVariant];
}

export function getMaximumIterationsByResources(
  facility: Facility | Construction,
): number {
  let minIterations = Infinity;

  for (let resource of getStructureIterationStorageInfo(facility).input) {
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

export function getIterationsUntilOverDone(
  facility: Facility,
  city: City,
): number {
  let minIterations = Infinity;

  const info = getStructureIterationStorageInfo(facility);

  for (let resource of info.output) {
    const maxPerDay =
      resource.quantity *
      (facility.assignedWorkersCount /
        info.iterationPeopleDays /
        city.peopleWorkModifier);

    const iterations = Math.ceil(
      (maxPerDay * OUTPUT_BUFFER_DAYS -
        getResourceCount(facility.output, resource.resourceType)) /
        resource.quantity,
    );

    if (iterations < minIterations) {
      minIterations = iterations;
    }
  }

  return Math.max(0, minIterations);
}

export function getIterationsUntilConstructionComplete(
  construction: Construction,
): number {
  const iterationInfo =
    facilitiesConstructionInfo[construction.buildingFacilityType];

  return iterationInfo.iterations - construction.iterationsComplete;
}

export function removeIterationInput(
  facility: Facility | Construction,
  iterationCount: number,
): void {
  const info = getStructureIterationStorageInfo(facility);

  for (const resource of info.input) {
    const quantity = iterationCount * resource.quantity;

    const grabbedResource = grabResource(facility.input, {
      resourceType: resource.resourceType,
      quantity,
    });

    if (grabbedResource.quantity !== quantity) {
      throw new Error();
    }
  }
}

export function addIterationOutput(
  facility: Facility,
  iterationCount: number,
): void {
  const iterationInfo = getStructureIterationStorageInfo(facility);

  for (const resource of iterationInfo.output) {
    addResource(facility.output, {
      resourceType: resource.resourceType,
      quantity: iterationCount * resource.quantity,
    });
  }
}

export function getPathFacilities(
  city: City,
  facilities: (Facility | Construction)[],
  path: CellPath,
): { from: Structure | undefined; to: Structure | undefined } {
  return {
    from: getFacilityByPos(city, facilities, path.from),
    to: getFacilityByPos(city, facilities, path.to),
  };
}

function getFacilityByPos(
  city: City,
  facilities: (Facility | Construction)[],
  pos: CellPosition,
): Structure | undefined {
  if (isSamePos(city.position, pos)) {
    return city;
  }

  return facilities.find((facility) => isSamePos(facility.position, pos));
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
    population: MINIMAL_CITY_PEOPLE,
    carrierPaths: [],
    totalAssignedWorkersCount: 0,
    peopleDayPerCell: BASE_PEOPLE_DAY_PER_CELL,
    weightPerPeopleDay: BASE_WEIGHT_PER_PEOPLE_DAY,
    peopleWorkModifier: BASE_PEOPLE_WORK_MODIFIER,
    lastTickNeedPopulation: 0,
    lastTickWorkingPaths: [],
    input: [],
    output: [],
  };

  gameState.cities.set(city.cityId, city);
  gameState.facilitiesByCityId.set(city.cityId, []);
  gameState.structuresByCellId.set(city.position.cellId, city);

  return city;
}

function addCityFacility(
  gameState: GameState,
  city: City,
  facility: Facility | Construction,
): void {
  const facilities = gameState.facilitiesByCityId.get(city.cityId)!;

  facilities.push(facility);

  gameState.structuresByCellId.set(facility.position.cellId, facility);
}

export function addConstructionStructure(
  gameState: GameState,
  {
    facilityType,
    position,
  }: { facilityType: ExactFacilityType; position: CellPosition },
  city: City,
): void {
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
    iterationsComplete: 0,
    isPaused: false,
  };

  addCityFacility(gameState, city, buildingFacilility);
}

export function completeConstruction(
  gameState: GameState,
  construction: Construction,
): Facility {
  const facility: Facility = {
    type: construction.buildingFacilityType,
    assignedCityId: construction.assignedCityId,
    position: construction.position,
    assignedWorkersCount:
      facilitiesIterationInfo[construction.buildingFacilityType]
        .maximumPeopleAtWork,
    productionVariant: 0,
    input: [],
    output: [],
    inProcess: 0,
    isPaused: false,
  };

  removeAllCarrierPathsTo(
    gameState,
    facility.position.cellId,
    CarrierPathType.CONSTRUCTION,
  );
  replaceCunstructionByFacility(gameState, construction, facility);

  return facility;
}

function replaceCunstructionByFacility(
  gameState: GameState,
  construction: Construction,
  facility: Facility,
): void {
  const facilities = gameState.facilitiesByCityId.get(facility.assignedCityId)!;
  const index = facilities.indexOf(construction);
  if (index === -1) {
    throw new Error('No construction found');
  }

  facilities[index] = facility;
  gameState.structuresByCellId.set(facility.position.cellId, facility);
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

export function getMaximumAddingLimit(
  facility: Construction,
  resourceType: ResourceType,
): number {
  const constructionInfo =
    facilitiesConstructionInfo[facility.buildingFacilityType];

  const iterationInput = constructionInfo.input.find(
    (resource) => resource.resourceType === resourceType,
  );

  if (!iterationInput) {
    return 0;
  }

  const alreadyQuantity = getResourceCount(facility.input, resourceType);
  const restIterations =
    constructionInfo.iterations -
    (facility.iterationsComplete + (facility.inProcess > 0 ? 1 : 0));

  if (restIterations <= 0) {
    return 0;
  }

  return Math.max(
    0,
    iterationInput.quantity * restIterations - alreadyQuantity,
  );
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
  facility: Facility | Construction,
): void {
  const facilities = gameState.facilitiesByCityId.get(facility.assignedCityId)!;

  removeArrayItem(facilities, facility);

  gameState.structuresByCellId.delete(facility.position.cellId);

  removeAllCarrierPathsVia(
    gameState,
    facility.position.cellId,
    CarrierPathType.CONSTRUCTION,
  );
  removeAllCarrierPathsVia(
    gameState,
    facility.position.cellId,
    CarrierPathType.FACILITY,
  );
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
