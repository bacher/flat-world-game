import { useMemo } from 'react';

import { Construction, GameState } from '@/game/types';
import { removeFacility } from '@/game/gameState';
import type { VisualState } from '@/game/visualState';
import { facilitiesConstructionInfo } from '@/game/facilityConstruction';
import { StorateType, SupplySection } from '@components/SupplySection';

import { useAlreadyPathsState } from '../helpers';
import styles from './share.module.scss';

export function ConstructionContent({
  gameState,
  visualState,
  construction,
  closeWithoutApplying,
}: {
  gameState: GameState;
  visualState: VisualState;
  construction: Construction;
  onCloseClick: () => void;
  closeWithoutApplying: () => void;
}) {
  const iterationInfo = useMemo(
    () => facilitiesConstructionInfo[construction.buildingFacilityType],
    [construction.buildingFacilityType],
  );

  const alreadyToPaths = useAlreadyPathsState({
    availableResources: iterationInfo.input.map((item) => item.resourceType),
    actualPaths: gameState.carrierPathsToCellId.get(
      construction.position.cellId,
    ),
  });

  return (
    <div className={styles.contentBlock}>
      <h2>Under construction</h2>
      <div className={styles.content}>
        <SupplySection
          title="Input"
          storageType={StorateType.INPUT}
          storage={construction.input}
          alreadyPaths={alreadyToPaths}
        />
      </div>
      <div className={styles.footer}>
        <button
          type="button"
          onClick={() => {
            construction.isPaused = !construction.isPaused;
            visualState.onUpdate();
          }}
        >
          {construction.isPaused ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={() => {
            removeFacility(gameState, construction);
            visualState.onUpdate();
            closeWithoutApplying();
          }}
        >
          Demolish
        </button>
      </div>
    </div>
  );
}
