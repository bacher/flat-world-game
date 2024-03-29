import { MINIMAL_CITY_PEOPLE } from '@/game/consts';
import { City, GameState } from '@/game/types';
import { getResourceCount, grabResource } from '@/game/gameState';
import { ResourceType } from '@/game/resources';
import { Booster, boosters } from '@/game/boosters';

type CityGrowResponse =
  | {
      type: 'SHORTAGE';
      shortage: number;
    }
  | {
      type: 'BELOW_LIMIT';
    }
  | {
      type: 'AT_LIMIT';
    }
  | {
      type: 'MORE';
    };

export function growPhase(gameState: GameState): void {
  for (const city of gameState.cities.values()) {
    const housingModifier = processCityResource(
      city,
      boosters.housing,
      ResourceType.HOUSING,
      10,
    );
    const foodModifier = processCityResource(
      city,
      boosters.population,
      ResourceType.FOOD,
      0,
    );

    let shortage = 0;

    if (
      housingModifier.type === 'SHORTAGE' &&
      foodModifier.type === 'SHORTAGE'
    ) {
      shortage = Math.max(housingModifier.shortage, foodModifier.shortage);
    } else if (housingModifier.type === 'SHORTAGE') {
      shortage = housingModifier.shortage;
    } else if (foodModifier.type === 'SHORTAGE') {
      shortage = foodModifier.shortage;
    }

    if (shortage > 0) {
      const poorPeople = shortage * city.population;
      city.population = Math.max(
        MINIMAL_CITY_PEOPLE,
        city.population - Math.max(0.1, poorPeople * 0.1),
      );
    } else {
      const avgNeed = avg(city.cityReport.population.needStatistics);

      const boostedAvg = Math.max(avgNeed + 1, avgNeed * 1.02);
      const extraPeople = city.population - boostedAvg;

      if (extraPeople > 0) {
        city.population = Math.max(
          MINIMAL_CITY_PEOPLE,
          city.population - Math.max(0.1, extraPeople * 0.1),
        );
      } else if (
        housingModifier.type !== 'AT_LIMIT' &&
        foodModifier.type !== 'AT_LIMIT'
      ) {
        city.population = Math.min(city.population * 1.01, boostedAvg);
      }
    }
  }
}

function avg(values: number[]): number {
  if (values.length === 0) {
    throw new Error();
  }

  let sum = 0;
  for (const value of values) {
    sum += value;
  }
  return sum / values.length;
}

function processCityResource(
  city: City,
  booster: Booster,
  resourceType: ResourceType,
  startFrom: number,
): CityGrowResponse {
  const roundedPopulation = Math.floor(city.population);
  const extraPeople = roundedPopulation - startFrom;

  if (extraPeople === 0) {
    return {
      type:
        getResourceCount(city.input, resourceType) > 0 ? 'MORE' : 'AT_LIMIT',
    };
  } else if (extraPeople <= 0) {
    return {
      type: 'BELOW_LIMIT',
    };
  }

  const needResource = extraPeople * booster.perWorker;

  const grabbedFood = grabResource(city.input, {
    resourceType,
    quantity: needResource,
  });

  if (grabbedFood.quantity === needResource) {
    return {
      type: 'MORE',
    };
  }

  const shortage =
    ((needResource - grabbedFood.quantity) / needResource) *
    (extraPeople / roundedPopulation);

  return {
    type: 'SHORTAGE',
    shortage,
  };
}
