import { addToMapSet } from '@/utils/helpers';
import { ExactFacilityType, GameState, ResearchId } from '@/game/types';
import { researches } from '@/game/research';
import { RESEARCH_PERSON_MODIFICATOR } from '@/game/consts';
import { boosters } from '@/game/boosters';
import { grabResource } from '@/game/gameState';

export function researchPhase(gameState: GameState): void {
  if (!gameState.currentResearchId) {
    return;
  }

  let researchPoints = 0;

  for (const city of gameState.cities.values()) {
    const needBoosters = city.population * boosters.research.perWorker;

    const { quantity: grabbedBoosters } = grabResource(city.input, {
      // TODO: Try to use all resource types
      resourceType: boosters.research.resourceTypes[0],
      quantity: needBoosters,
    });

    researchPoints +=
      city.population *
      RESEARCH_PERSON_MODIFICATOR *
      (1 + boosters.research.boost * (grabbedBoosters / needBoosters));
  }

  if (researchPoints > 0) {
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
      completeResearch(gameState, researchInfo.researchId);
      gameState.currentResearchId = undefined;
    }
  }
}

function completeResearch(gameState: GameState, researchId: ResearchId): void {
  const researchInfo = researches[researchId];

  gameState.completedResearches.add(researchId);
  gameState.inProgressResearches.delete(researchId);

  for (const facilityType of researchInfo.unlockFacilities) {
    gameState.unlockedFacilities.add(facilityType);
  }

  if (researchInfo.unlockProductionVariants) {
    for (const [facilityType, productVariants] of Object.entries(
      researchInfo.unlockProductionVariants,
    )) {
      addToMapSet(
        gameState.unlockedProductionVariants,
        facilityType as ExactFacilityType,
        productVariants,
      );
    }
  }
}
