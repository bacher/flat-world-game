import sample from 'lodash/sample';

import {
  BASE_HORSE_DAY_PER_CELL,
  BASE_HORSE_WORK_MODIFIER,
  BASE_PEOPLE_DAY_PER_CELL,
  BASE_PEOPLE_WORK_MODIFIER,
  BASE_WEIGHT_PER_HORSE_DAY,
  BASE_WEIGHT_PER_PEOPLE_DAY,
  BUFFER_DAYS,
  HORSES_PER_WORKER,
  MINIMAL_CITY_PEOPLE,
  PEOPLE_FOOD_PER_DAY,
  RESEARCH_POINTS_PER_FREE_PERSON,
  RESEARCH_POINTS_PER_WORKER,
} from './consts';
import {
  CarrierPath,
  City,
  CityId,
  Construction,
  Facility,
  FacilityType,
  GameState,
  StorageItem,
  Structure,
  WorkingPath,
} from './types';
import { calculateDistance, isSamePath } from './helpers';
import {
  actualizeCityTotalAssignedWorkersCount,
  addIterationOutput,
  addResource,
  completeConstruction,
  getCountOfResource,
  getIterationsUntilConstructionComplete,
  getIterationsUntilOverDone,
  getMaximumAddingLimit,
  getMaximumIterationsByResources,
  getPathFacilities,
  getStructureIterationStorageInfo,
  grabResource,
  removeIterationInput,
} from './gameState';
import { researches } from './research';
import { facilitiesConstructionInfo } from './facilities';
import { ResourceType } from './resources';

type JobObject =
  | { type: 'facility'; facility: Facility | Construction; distance: number }
  | {
      type: 'carrier';
      carrierPath: CarrierPath;
      fromFacility: Structure;
      toFacility: Structure;
      commingDistance: number;
      moveDistance: number;
    };

// [temp, current, maximum, facility]
type PlannedJob = [number, number, number, JobObject];

export function tick(gameState: GameState): void {
  // PLANING PHASE

  const grabbedHorsesPerCity = new Map<CityId, number>();

  for (const city of gameState.cities.values()) {
    actualizeCityTotalAssignedWorkersCount(gameState, city);
    calculateCityModificators(grabbedHorsesPerCity, city);
  }

  const planPerCity = new Map<CityId, { jobs: PlannedJob[] }>();

  let researchPoints = 0;

  for (const city of gameState.cities.values()) {
    const facilities = gameState.facilitiesByCityId.get(city.cityId)!;

    let jobs: PlannedJob[] = [];
    let needPeople = 0;
    let maxRatio = -Infinity;

    function registerJob(
      item: JobObject,
      people: number,
      maxPeople: number,
    ): void {
      const nextRatio = (people - 1) / maxPeople;
      jobs.push([nextRatio, people, maxPeople, item]);
      needPeople += people;

      if (nextRatio > maxRatio) {
        maxRatio = nextRatio;
      }
    }

    for (const facility of facilities) {
      const distance = calculateDistance(city.position, facility.position);

      const iterationInfo = getStructureIterationStorageInfo(facility);

      if (iterationInfo) {
        const iterationPeopleDays =
          iterationInfo.iterationPeopleDays / city.peopleWorkModifier;

        let needPeople = 0;

        if (facility.inProcess > 0) {
          needPeople += (1 - facility.inProcess) * iterationPeopleDays;
        }

        const resourcesForIterations =
          getMaximumIterationsByResources(facility);

        let iterationsUntilOverDone;

        if (facility.type === FacilityType.CONSTRUCTION) {
          iterationsUntilOverDone =
            getIterationsUntilConstructionComplete(facility);
        } else {
          iterationsUntilOverDone = getIterationsUntilOverDone(facility, city);
        }

        needPeople +=
          Math.min(
            resourcesForIterations,
            Math.max(
              0,
              iterationsUntilOverDone + (facility.inProcess > 0 ? -1 : 0),
            ),
          ) * iterationPeopleDays;

        if (needPeople > 0) {
          const max = facility.assignedWorkersCount;

          const onePersonWork = 1 - distance * 0.05;
          const people = Math.min(max, Math.ceil(needPeople / onePersonWork));

          registerJob({ type: 'facility', facility, distance }, people, max);
        }
      }
    }

    for (const carrierPath of city.carrierPaths) {
      const { from: fromFacility, to: toFacility } = getPathFacilities(
        city,
        facilities,
        carrierPath.path,
      );

      if (!fromFacility || !toFacility) {
        console.error('No facility found!');
        continue;
      }

      const fromCount = getCountOfResource(
        fromFacility.output,
        carrierPath.resourceType,
      );

      if (fromCount === 0) {
        continue;
      }

      // TODO: Calculate how many people we need based on input and needed output

      const toCount = getCountOfResource(
        toFacility.input,
        carrierPath.resourceType,
      );

      let maxInput = 0;

      if (toFacility.type === FacilityType.CITY) {
        maxInput = toFacility.population * 2;
      } else {
        if (toFacility.type === FacilityType.CONSTRUCTION) {
          const constructInfo =
            facilitiesConstructionInfo[toFacility.buildingFacilityType];

          const resourceIterationInfo = constructInfo.input.find(
            (input) => input.resourceType === carrierPath.resourceType,
          )!;

          if (!resourceIterationInfo) {
            debugger;
          }

          maxInput =
            resourceIterationInfo.quantity *
            (toFacility.assignedWorkersCount /
              constructInfo.iterationPeopleDays /
              city.peopleWorkModifier) *
            constructInfo.iterations;
        } else {
          const toFacilityIterationInfo =
            getStructureIterationStorageInfo(toFacility);

          const resourceIterationInfo = toFacilityIterationInfo.input.find(
            (input) => input.resourceType === carrierPath.resourceType,
          )!;

          maxInput =
            resourceIterationInfo.quantity *
            (toFacility.assignedWorkersCount /
              toFacilityIterationInfo.iterationPeopleDays /
              city.peopleWorkModifier) *
            BUFFER_DAYS;
        }

        if (toCount >= maxInput) {
          continue;
        }
      }

      const commingDistance =
        calculateDistance(city.position, fromFacility.position) +
        calculateDistance(toFacility.position, city.position);

      const moveDistance = calculateDistance(
        fromFacility.position,
        toFacility.position,
      );

      const needToMove = maxInput - toCount;

      const remains = 1 - commingDistance * city.peopleDayPerCell;

      const needPeople = Math.ceil(
        ((needToMove / city.weightPerPeopleDay) * moveDistance) / remains,
      );

      registerJob(
        {
          type: 'carrier',
          carrierPath,
          fromFacility,
          toFacility,
          commingDistance,
          moveDistance,
        },
        Math.min(needPeople, carrierPath.people),
        carrierPath.people,
      );
    }

    city.lastTickNeedPopulation = needPeople;

    while (city.population < needPeople) {
      const cutJobs = jobs.filter((job) => job[0] === maxRatio);

      const cutJob = sample(cutJobs)!;
      cutJob[1] -= 1;
      cutJob[0] = (cutJob[1] - 1) / cutJob[2];
      needPeople -= 1;

      if (cutJobs.length === 1) {
        maxRatio = -Infinity;
        for (const job of jobs) {
          if (job[0] > maxRatio) {
            maxRatio = job[0];
          }
        }
      }
    }

    jobs = jobs.filter((job) => job[1] > 0);

    planPerCity.set(city.cityId, { jobs });
  }

  // Return unused horses

  for (const city of gameState.cities.values()) {
    const { jobs } = planPerCity.get(city.cityId)!;
    const grabbedHorses = grabbedHorsesPerCity.get(city.cityId)!;

    const actualTotalWorkersCount = jobs.reduce((acc, job) => acc + job[1], 0);

    const usedHorses = actualTotalWorkersCount * HORSES_PER_WORKER;

    const unusedHorses = grabbedHorses - usedHorses;

    if (unusedHorses > 0) {
      addResource(city.input, {
        resourceType: ResourceType.HORSE,
        quantity: unusedHorses,
      });
    }

    researchPoints +=
      (city.population - actualTotalWorkersCount) *
        RESEARCH_POINTS_PER_FREE_PERSON +
      actualTotalWorkersCount * RESEARCH_POINTS_PER_WORKER;
  }

  // Carriers get items

  const currentlyMovingProducts: {
    fromFacility: Structure;
    toFacility: Structure;
    resource: StorageItem;
  }[] = [];

  for (const city of gameState.cities.values()) {
    const { jobs } = planPerCity.get(city.cityId)!;

    for (const [, people, , jobObject] of jobs) {
      if (jobObject.type === 'carrier') {
        const {
          carrierPath,
          fromFacility,
          toFacility,
          commingDistance,
          moveDistance,
        } = jobObject;

        const remains = 1 - commingDistance * city.peopleDayPerCell;

        const power = remains * people;

        let movedWeight = (power / moveDistance) * city.weightPerPeopleDay;
        movedWeight = Math.floor(movedWeight * 10) / 10;

        const grabbedItem = grabResource(fromFacility.output, {
          resourceType: carrierPath.resourceType,
          quantity: movedWeight,
        });

        currentlyMovingProducts.push({
          fromFacility,
          toFacility,
          resource: grabbedItem,
        });
      }
    }
  }

  // Facilities make products

  for (const city of gameState.cities.values()) {
    const { jobs } = planPerCity.get(city.cityId)!;

    for (const [, people, , jobObject] of jobs) {
      if (jobObject.type === 'facility') {
        const { facility, distance } = jobObject;
        const peopleAfterWalk = people * (1 - distance * 0.05);

        const iteration = getStructureIterationStorageInfo(facility);

        let peopleIterationsRemains =
          peopleAfterWalk /
          iteration.iterationPeopleDays /
          city.peopleWorkModifier;
        let overallDone = 0;

        if (facility.inProcess > 0) {
          const iterationLeft = 1 - facility.inProcess;

          if (peopleIterationsRemains < iterationLeft) {
            facility.inProcess += peopleIterationsRemains;
            continue;
          }

          peopleIterationsRemains -= iterationLeft;
          facility.inProcess = 0;
          overallDone += 1;
        }

        const resourceForIterations = getMaximumIterationsByResources(facility);

        let iterationsUntilOverDone;

        if (facility.type === FacilityType.CONSTRUCTION) {
          iterationsUntilOverDone =
            getIterationsUntilConstructionComplete(facility);
        } else {
          iterationsUntilOverDone = getIterationsUntilOverDone(facility, city);
        }

        const finalIterationsUntilOverDone = Math.max(
          0,
          iterationsUntilOverDone - overallDone,
        );

        const resourceIterations = Math.min(
          finalIterationsUntilOverDone,
          resourceForIterations,
          Math.ceil(peopleIterationsRemains),
        );

        if (resourceIterations > 0) {
          removeIterationInput(facility, resourceIterations);
        }

        if (peopleIterationsRemains >= resourceIterations) {
          overallDone += resourceIterations;
        } else {
          const doneNewIterations = Math.floor(peopleIterationsRemains);
          overallDone += doneNewIterations;
          facility.inProcess = peopleIterationsRemains % 1;
        }

        if (facility.type === FacilityType.CONSTRUCTION) {
          facility.iterationsComplete += overallDone;

          const constructionInfo =
            facilitiesConstructionInfo[facility.buildingFacilityType];

          if (facility.iterationsComplete >= constructionInfo.iterations) {
            completeConstruction(gameState, facility);
          }
        } else {
          if (overallDone > 0) {
            addIterationOutput(facility, overallDone);
          }
        }
      }
    }
  }

  // Carriers have brought items

  for (const {
    fromFacility,
    toFacility,
    resource,
  } of currentlyMovingProducts) {
    if (toFacility.type === FacilityType.CONSTRUCTION) {
      const addingLimit = getMaximumAddingLimit(
        toFacility,
        resource.resourceType,
      );

      if (resource.quantity > addingLimit) {
        if (addingLimit > 0) {
          addResource(toFacility.input, {
            quantity: addingLimit,
            resourceType: resource.resourceType,
          });
        }

        addResource(fromFacility.output, {
          quantity: resource.quantity - addingLimit,
          resourceType: resource.resourceType,
        });
      } else {
        addResource(toFacility.input, resource);
      }
    } else {
      addResource(toFacility.input, resource);
    }
  }

  // Apply cities' working paths

  for (const city of gameState.cities.values()) {
    const { jobs } = planPerCity.get(city.cityId)!;

    city.lastTickWorkingPaths = [];

    for (const job of jobs) {
      let workingPath: WorkingPath;

      switch (job[3].type) {
        case 'facility': {
          const facility = job[3].facility;
          workingPath = {
            path: { from: city.position, to: facility.position },
            workers: job[1],
            carriers: 0,
          };
          break;
        }
        case 'carrier': {
          const { from, to } = job[3].carrierPath.path;
          workingPath = {
            path: { from, to },
            workers: 0,
            carriers: job[1],
          };
          break;
        }
      }

      const alreadyPath = city.lastTickWorkingPaths.find((path) =>
        isSamePath(path.path, workingPath.path),
      );

      if (alreadyPath) {
        alreadyPath.workers += workingPath.workers;
        alreadyPath.carriers += workingPath.carriers;
      } else {
        city.lastTickWorkingPaths.push(workingPath);
      }
    }
  }

  // Population grow phase

  for (const city of gameState.cities.values()) {
    const roundedPopulation = Math.floor(city.population);
    const needFood = roundedPopulation * PEOPLE_FOOD_PER_DAY;

    const grabbedFood = grabResource(city.input, {
      resourceType: ResourceType.FOOD,
      quantity: needFood,
    });

    if (grabbedFood.quantity === needFood) {
      if (getCountOfResource(city.input, ResourceType.FOOD) > 0) {
        city.population *= 1.01;
      }
    } else {
      if (city.population > MINIMAL_CITY_PEOPLE) {
        const shortage = (needFood - grabbedFood.quantity) / needFood;
        const poorPeople = shortage * city.population;
        city.population -= poorPeople / 10;

        if (city.population < MINIMAL_CITY_PEOPLE) {
          city.population = MINIMAL_CITY_PEOPLE;
        }
      }
    }
  }

  // Research progress

  if (gameState.currentResearchId) {
    let currentPoints = gameState.inProgressResearches.get(
      gameState.currentResearchId,
    );

    if (!currentPoints) {
      currentPoints = {
        points: 0,
      };

      gameState.inProgressResearches.set(
        gameState.currentResearchId,
        currentPoints,
      );
    }

    currentPoints.points += researchPoints;
    const researchInfo = researches[gameState.currentResearchId];

    if (currentPoints.points >= researchInfo.points) {
      gameState.completedResearches.add(gameState.currentResearchId);
      gameState.inProgressResearches.delete(gameState.currentResearchId);
      gameState.currentResearchId = undefined;

      for (const facilityType of researchInfo.unlockFacilities) {
        gameState.unlockedFacilities.add(facilityType);
      }
    }
  }
}

function calculateCityModificators(
  grabbedHorsesPerCity: Map<CityId, number>,
  city: City,
): void {
  const horsesNeeded = city.totalAssignedWorkersCount * HORSES_PER_WORKER;

  const grabbedHorses = grabResource(city.input, {
    resourceType: ResourceType.HORSE,
    quantity: horsesNeeded,
  });

  const horseRatio = Math.min(1, grabbedHorses.quantity / horsesNeeded);

  city.peopleWorkModifier =
    BASE_PEOPLE_WORK_MODIFIER + horseRatio * BASE_HORSE_WORK_MODIFIER;
  city.peopleDayPerCell =
    BASE_PEOPLE_DAY_PER_CELL + horseRatio * BASE_HORSE_DAY_PER_CELL;
  city.weightPerPeopleDay =
    BASE_WEIGHT_PER_PEOPLE_DAY + horseRatio * BASE_WEIGHT_PER_HORSE_DAY;

  grabbedHorsesPerCity.set(city.cityId, grabbedHorses.quantity);
}
