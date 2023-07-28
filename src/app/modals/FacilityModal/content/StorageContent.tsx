import { StorageFacility } from '@/game/types';
import { facilitiesDescription } from '@/game/facilities';
import { StorateType, SupplySection } from '@components/SupplySection';
import { useForceUpdate } from '@hooks/forceUpdate';
import { UiState } from '@/app/logic/UiState.ts';

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
  const forceUpdate = useForceUpdate();
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
          onAddPathClick={(resourceType) => {
            addPath(visualState, storageFacility, 'to', resourceType);
            onCloseClick();
          }}
          forceUpdate={forceUpdate}
        />
        <SupplySection
          title="Output"
          storageType={StorateType.OUTPUT}
          storage={storageFacility.output}
          alreadyPaths={alreadyFromPaths}
          onAddPathClick={(resourceType) => {
            addPath(visualState, storageFacility, 'from', resourceType);
            onCloseClick();
          }}
          forceUpdate={forceUpdate}
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
