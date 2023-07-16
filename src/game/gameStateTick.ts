import { neverCall } from '@/utils/typeUtils';

import { CITY_POPULATION_STATISTICS_LENGTH } from './consts';
import {
  CarrierPathType,
  City,
  FacilityType,
  GameState,
  isFacilityLike,
  Structure,
} from './types';
import {
  addCarrierPath,
  completeConstruction,
  createEmptyLastTickCityReport,
  getStructureIterationStorageInfo,
  removeAllCarrierPathsTo,
} from './gameState';
import { isSamePath } from './helpers';
import { growPhase } from './tick/growPhase';
import { researchPhase } from './tick/researchPhase';
import { DailyWork, JobType, planCityTickWork } from './tick/planning';
import { doCarryWork, doConstructionWork, doFacilityWork } from './tick/work';

export function tick(gameState: GameState): void {
  gameState.tickNumber += 1;

  console.group(`Tick ${gameState.tickNumber}`);

  for (const city of gameState.cities.values()) {
    city.cityReport.lastTick = createEmptyLastTickCityReport();

    const facilities = gameState.facilitiesByCityId.get(city.cityId)!;

    if (city.isNeedUpdateAutomaticPaths) {
      addAutomaticInputPaths(gameState, city, city);

      for (const facility of facilities) {
        addAutomaticInputPaths(gameState, city, facility);
      }
      city.isNeedUpdateAutomaticPaths = false;
    }

    const { totalNeedPeopleCount, dailyWorks } = planCityTickWork(
      gameState,
      city,
    );

    updateCityNeedPopulation(gameState, city, totalNeedPeopleCount);

    for (const work of dailyWorks) {
      const { actualWorkDays, task } = work;

      switch (task.jobType) {
        case JobType.WORKER: {
          const { facility } = task;
          if (facility.type === FacilityType.CONSTRUCTION) {
            doConstructionWork(gameState, facility, actualWorkDays);
          } else {
            doFacilityWork(facility, actualWorkDays);
          }
          break;
        }
        case JobType.CARRIER: {
          const { carrierPath } = task;
          doCarryWork(gameState, carrierPath, actualWorkDays);
          break;
        }
        default:
          throw neverCall(task);
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
    const { task, actualWorkDays } = work;

    switch (task.jobType) {
      case JobType.WORKER: {
        const { facility } = task;
        report.facilityWorkerReports.push({
          facility,
          workers: actualWorkDays,
        });
        break;
      }
      case JobType.CARRIER: {
        const { carrierPath } = task;
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
        throw neverCall(task);
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

function addAutomaticInputPaths(
  gameState: GameState,
  city: City,
  structure: Structure,
): void {
  removeAllCarrierPathsTo(
    gameState,
    structure.position.cellId,
    CarrierPathType.AUTOMATIC,
  );

  const constructionIterationInfo = getStructureIterationStorageInfo(structure);

  const facilities = gameState.facilitiesByCityId.get(city.cityId)!;

  for (const facility of facilities) {
    if (isFacilityLike(facility)) {
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
              pathType: CarrierPathType.AUTOMATIC,
              path: {
                from: facility.position,
                to: structure.position,
              },
            });
          }
        }
      }
    }
  }
}
