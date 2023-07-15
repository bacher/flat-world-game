import { neverCall } from '@/utils/typeUtils';

import {
  BASE_WEIGHT_PER_PEOPLE_DAY,
  CITY_POPULATION_STATISTICS_LENGTH,
} from './consts';
import {
  CarrierPath,
  CarrierPathType,
  City,
  Construction,
  Facility,
  FacilityType,
  GameState,
  StorageItem,
} from './types';
import {
  addCarrierPath,
  addResource,
  addResources,
  completeConstruction,
  createEmptyLastTickCityReport,
  getCarrierPathStructures,
  getCityResourceSubstitute,
  getConstructionMaximumAddingLimit,
  getStructureIterationStorageInfo,
  grabResource,
  grabResourcesStrict,
  multiplyResourceStorage,
  removeAllCarrierPathsTo,
} from './gameState';
import { facilitiesConstructionInfo } from './facilityConstruction';
import {
  getCarrierPathDistance,
  isExactFacilityType,
  isSamePath,
} from './helpers';
import { growPhase } from './tick/growPhase';
import { researchPhase } from './tick/researchPhase';
import { DailyWork, JobType, planCityTickWork } from './tick/planning';

export function tick(gameState: GameState): void {
  gameState.tickNumber += 1;

  console.group(`Tick ${gameState.tickNumber}`);

  for (const city of gameState.cities.values()) {
    city.cityReport.lastTick = createEmptyLastTickCityReport();

    const facilities = gameState.facilitiesByCityId.get(city.cityId)!;

    // TODO: Actualize only when something changed in city
    for (const facility of facilities) {
      if (facility.type === FacilityType.CONSTRUCTION) {
        addConstructionInputPaths(gameState, city, facility);
      }
    }

    const { totalNeedPeopleCount, dailyWorks } = planCityTickWork(
      gameState,
      city,
    );

    updateCityNeedPopulation(gameState, city, totalNeedPeopleCount);

    for (const work of dailyWorks) {
      const { actualWorkDays } = work;

      switch (work.jobType) {
        case JobType.WORKER: {
          const { facility } = work;
          if (facility.type === FacilityType.CONSTRUCTION) {
            doConstructionWork(gameState, facility, actualWorkDays);
          } else {
            doFacilityWork(facility, actualWorkDays);
          }
          break;
        }
        case JobType.CARRIER: {
          const { carrierPath } = work;
          doCarryWork(gameState, carrierPath, actualWorkDays);
          break;
        }
        default:
          throw neverCall(work);
      }
    }

    fillInCityWorkReport(city, dailyWorks);
  }

  researchPhase(gameState);

  growPhase(gameState);

  console.groupEnd();
}

function updateCityNeedPopulation(
  gameState: GameState,
  city: City,
  totalNeed: number,
): void {
  const need = Math.ceil(totalNeed);
  city.cityReport.population.lastTick = need;
  city.cityReport.population.needStatistics[
    gameState.tickNumber % CITY_POPULATION_STATISTICS_LENGTH
  ] = need;
}

function fillInCityWorkReport(city: City, dailyWorks: DailyWork[]): void {
  const report = createEmptyLastTickCityReport();

  for (const work of dailyWorks) {
    const { actualWorkDays } = work;

    switch (work.jobType) {
      case JobType.WORKER: {
        const { facility } = work;
        report.facilityWorkerReports.push({
          facility,
          workers: actualWorkDays,
        });
        break;
      }
      case JobType.CARRIER: {
        const { carrierPath } = work;
        const { from, to } = carrierPath.path;

        const alreadyPath = report.carrierPathReports.find((path) =>
          isSamePath(path.path, carrierPath.path),
        );

        if (alreadyPath) {
          alreadyPath.carriers += actualWorkDays;
        } else {
          report.carrierPathReports.push({
            path: { from, to },
            carriers: actualWorkDays,
          });
        }
        break;
      }
      default:
        throw neverCall(work);
    }
  }

  city.cityReport.lastTick = report;
}

(window as any).completeAllConstruction = () => {
  const gs = (window as any).gameState;

  for (const facilities of gs.facilitiesByCityId.values()) {
    for (const facility of facilities) {
      if (facility.type === FacilityType.CONSTRUCTION) {
        completeConstruction(gs, facility);
      }
    }
  }
};

function doFacilityWork(facility: Facility, workDays: number): void {
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

function doConstructionWork(
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

function doCarryWork(
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

  const grabbedItem = grabResource(from.output, movingResource);

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
    addResource(to.input, grabbedItem);
  }
}

function grabIterationsResources(
  facility: Facility | Construction,
  iterationsCount: number,
): void {
  const iterationInfo = getStructureIterationStorageInfo(facility);

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
  const iterationInfo = getStructureIterationStorageInfo(facility);

  const totalOutputResources = multiplyResourceStorage(
    iterationInfo.output,
    iterationsCount,
  );

  addResources(facility.output, totalOutputResources);
}

function addConstructionInputPaths(
  gameState: GameState,
  city: City,
  construction: Construction,
): void {
  removeAllCarrierPathsTo(
    gameState,
    construction.position.cellId,
    CarrierPathType.CONSTRUCTION,
  );

  const constructionIterationInfo =
    getStructureIterationStorageInfo(construction);

  const facilities = gameState.facilitiesByCityId.get(city.cityId)!;

  for (const facility of facilities) {
    if (isExactFacilityType(facility.type)) {
      const iterationInfo = getStructureIterationStorageInfo(facility);

      for (const { resourceType } of constructionIterationInfo.input) {
        for (const {
          resourceType: facilityResourceType,
        } of iterationInfo.output) {
          if (resourceType === facilityResourceType) {
            addCarrierPath(gameState, {
              assignedCityId: city.cityId,
              people: 1,
              resourceType,
              pathType: CarrierPathType.CONSTRUCTION,
              path: {
                from: facility.position,
                to: construction.position,
              },
            });
          }
        }
      }
    }
  }
}

function checkConstructionComplete(
  gameState: GameState,
  construction: Construction,
): void {
  if (construction.inProcess >= 1) {
    completeConstruction(gameState, construction);
  }
}
