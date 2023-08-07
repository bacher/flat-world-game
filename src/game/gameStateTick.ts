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
  createEmptyLastTickCityReport,
  getStructureIterationStorageInfo,
  removeAllCarrierPathsTo,
} from './gameState';
import { isSamePath } from './helpers';
import { mulberry32, shuffledTraversalMulberry } from './pseudoRandom';

import { growPhase } from './tick/growPhase';
import { researchPhase } from './tick/researchPhase';
import { DailyWork, JobType, planCityTickWork } from './tick/planning';
import { doCarryWork, doConstructionWork, doFacilityWork } from './tick/work';

const PRINT_TICKS = false;

export function tick(gameState: GameState): void {
  gameState.tickNumber += 1;
  gameState.pseudoRandom = mulberry32(
    gameState.gameSeed + gameState.tickNumber,
  );

  if (PRINT_TICKS) {
    console.group(`Tick ${gameState.tickNumber}`);
  }

  const shuffledCities = shuffledTraversalMulberry(gameState.pseudoRandom, [
    ...gameState.cities.values(),
  ]);

  for (const city of shuffledCities) {
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

  if (PRINT_TICKS) {
    console.groupEnd();
  }
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
