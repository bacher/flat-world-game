import { FacilityType, StorageFacility } from '@/game/types';
import { facilitiesDescription } from '@/game/facilities';
import { StorateType, SupplySection } from '@components/SupplySection';
import { UiState } from '@/app/logic/UiState';

import { ModalFooter } from '../ModalFooter';
import { addPath, useAlreadyPathsState } from '../helpers';
import styles from './share.module.scss';

type Props = {
  uiState: UiState;
  storageFacility: StorageFacility;
  onCloseClick: () => void;
};

export function StorageContent({
  uiState,
  storageFacility,
  onCloseClick,
}: Props) {
  const { gameState, visualState } = uiState;

  const alreadyToPaths = useAlreadyPathsState({
    availableResources: [storageFacility.resourceType],
    actualPaths: gameState.carrierPathsToCellId.get(
      storageFacility.position.cellId,
    ),
  });
  const alreadyFromPaths = useAlreadyPathsState({
    availableResources: [storageFacility.resourceType],
    actualPaths: gameState.carrierPathsFromCellId.get(
      storageFacility.position.cellId,
    ),
  });

  return (
    <div className={styles.contentBlock}>
      <h2>{facilitiesDescription[storageFacility.type]}</h2>
      <div className={styles.content}>
        <SupplySection
          title="Input"
          storageType={StorateType.INPUT}
          storage={storageFacility.input}
          alreadyPaths={alreadyToPaths}
          onAddPathClick={
            storageFacility.type === FacilityType.INTERCITY_RECEIVER
              ? (resourceType) => {
                  addPath(visualState, storageFacility, 'to', resourceType);
                  onCloseClick();
                }
              : undefined
          }
        />
        <SupplySection
          title="Output"
          storageType={StorateType.OUTPUT}
          storage={storageFacility.output}
          alreadyPaths={alreadyFromPaths}
          onAddPathClick={
            storageFacility.type === FacilityType.INTERCITY_SENDER
              ? (resourceType) => {
                  addPath(visualState, storageFacility, 'from', resourceType);
                  onCloseClick();
                }
              : undefined
          }
        />
      </div>
      <ModalFooter
        uiState={uiState}
        facility={storageFacility}
        close={onCloseClick}
      />
    </div>
  );
}
