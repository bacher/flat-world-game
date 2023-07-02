import {
  MINIMAL_CITY_PEOPLE,
  PEOPLE_FOOD_PER_DAY,
  RESEARCH_POINTS_PER_PERSON,
} from './consts';
import { GameState } from './types';
import {
  // actualizeCityTotalAssignedWorkersCount,
  // addIterationOutput,
  // addResource,
  // completeConstruction,
  // getIterationsUntilConstructionComplete,
  // getIterationsUntilOverDone,
  // getMaximumAddingLimit,
  // getMaximumIterationsByResources,
  // getPathFacilities,
  // getStructureIterationStorageInfo,
  // removeIterationInput,
  getCountOfResource,
  grabResource,
} from './gameState';
import { researches } from './research';

import { ResourceType } from './resources';

// type TickTemporalStorage = {};

export function tick(gameState: GameState): void {
  // const temp: TickTemporalStorage = {};

  // TODO

  researchPhase(gameState);

  growPhase(gameState);
}

function growPhase(gameState: GameState): void {
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
}

function researchPhase(gameState: GameState): void {
  let researchPoints = 0;

  for (const city of gameState.cities.values()) {
    researchPoints += city.population * RESEARCH_POINTS_PER_PERSON;
  }

  if (gameState.currentResearchId && researchPoints > 0) {
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
