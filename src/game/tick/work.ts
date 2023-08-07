import { BASE_WEIGHT_PER_PEOPLE_DAY } from '@/game/consts';
import {
  CarrierPath,
  Construction,
  Facility,
  FacilityType,
  GameState,
  StorageItem,
} from '@/game/types';
import {
  addResource,
  addResources,
  completeConstruction,
  getCarrierPathStructures,
  getCityResourceSubstitute,
  getConstructionMaximumAddingLimit,
  getStructureIterationStorageInfo,
  getStructureStorageInfo,
  grabResource,
  grabResourcesStrict,
  multiplyResourceStorage,
} from '@/game/gameState';
import { facilitiesConstructionInfo } from '@/game/facilityConstruction';
import { getCarrierPathDistance } from '@/game/helpers';

export function doFacilityWork(facility: Facility, workDays: number): void {
  const iterationInfo = getStructureIterationStorageInfo(facility);

  const doIterations = workDays / iterationInfo.iterationPeopleDays;

  const wasInProcess = facility.inProcess > 0;

  const updatedIterations = facility.inProcess + doIterations;

  const resourcesIterations =
    Math.ceil(updatedIterations) + (wasInProcess ? -1 : 0);

  if (resourcesIterations > 0) {
    grabIterationsResources(facility, resourcesIterations);
  }

  facility.inProcess = updatedIterations % 1;

  const doneIterations = Math.floor(updatedIterations);
  if (doneIterations > 0) {
    addIterationsResources(facility, doneIterations);
  }
}

export function doConstructionWork(
  gameState: GameState,
  construction: Construction,
  workDays: number,
): void {
  // LOGIC:
  // Assuming that all resources for construction is already carried,
  // so we're not checking resouces here.

  const constructionInfo =
    facilitiesConstructionInfo[construction.buildingFacilityType];

  construction.inProcess += workDays / constructionInfo.iterationPeopleDays;

  checkConstructionComplete(gameState, construction);
}

export function doCarryWork(
  gameState: GameState,
  carrierPath: CarrierPath,
  workDays: number,
): void {
  const { to, from } = getCarrierPathStructures(gameState, carrierPath);

  const distance = getCarrierPathDistance(carrierPath);
  let moveQuantity = (workDays * BASE_WEIGHT_PER_PEOPLE_DAY) / distance;

  if (to.type === FacilityType.CONSTRUCTION) {
    const maximumCount = getConstructionMaximumAddingLimit(
      to,
      carrierPath.resourceType,
    );
    moveQuantity = Math.min(moveQuantity, maximumCount);
  }

  const movingResource: StorageItem = {
    resourceType: carrierPath.resourceType,
    quantity: moveQuantity,
  };

  let grabbedItem;
  if (from.type === FacilityType.INTERCITY_SENDER) {
    grabbedItem = grabResource(from.input, movingResource);
  } else {
    grabbedItem = grabResource(from.output, movingResource);
  }

  // TODO: Check correctness
  if (grabbedItem.quantity !== movingResource.quantity) {
    // Could be when we have 2 or more paths from one facility
    console.warn('Carring quantity reduction');
  }

  if (to.type === FacilityType.CITY) {
    const { resourceType, modifier } = getCityResourceSubstitute(
      grabbedItem.resourceType,
    );

    addResource(to.input, {
      resourceType: resourceType,
      quantity: grabbedItem.quantity * modifier,
    });
  } else {
    if (to.type === FacilityType.INTERCITY_RECEIVER) {
      addResource(to.output, grabbedItem);
    } else {
      addResource(to.input, grabbedItem);
    }
  }
}

function grabIterationsResources(
  facility: Facility | Construction,
  iterationsCount: number,
): void {
  const iterationInfo = getStructureStorageInfo(facility);

  const grabResources = multiplyResourceStorage(
    iterationInfo.input,
    iterationsCount,
  );

  grabResourcesStrict(facility.input, grabResources);
}

function addIterationsResources(
  facility: Facility,
  iterationsCount: number,
): void {
  const iterationInfo = getStructureStorageInfo(facility);

  const totalOutputResources = multiplyResourceStorage(
    iterationInfo.output,
    iterationsCount,
  );

  addResources(facility.output, totalOutputResources);
}

function checkConstructionComplete(
  gameState: GameState,
  construction: Construction,
): void {
  if (construction.inProcess >= 1) {
    completeConstruction(gameState, construction);
  }
}
