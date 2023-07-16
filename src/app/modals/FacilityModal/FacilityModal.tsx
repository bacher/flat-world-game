import { RefObject, useImperativeHandle, useRef } from 'react';

import styles from './FacilityModal.module.scss';

import {
  FacilityType,
  GameState,
  isStorageFacility,
  Structure,
} from '@/game/types';
import type { VisualState } from '@/game/visualState';

import type { ModalRef } from '../types';
import { ModalCloseButton } from '../ModalCloseButton';
import type { ModalControl, ModalControlRef } from './types';
import { FacilityContent } from './content/FacilityContent';
import { CityContent } from './content/CityContent';
import { ConstructionContent } from './content/ConstructionContent';
import { StorageContent } from './content/StorageContent';

type Props = {
  gameState: GameState;
  visualState: VisualState;
  facility: Structure;
  modalRef: RefObject<ModalRef>;
  onClose: () => void;
};

export function FacilityModal({
  gameState,
  visualState,
  facility,
  modalRef,
  onClose,
}: Props) {
  const controlRef = useRef<ModalControl | undefined>();

  function onCloseClick() {
    controlRef.current?.applyChanges();
    onClose();
  }

  useImperativeHandle(modalRef, () => ({
    close: onCloseClick,
  }));

  return (
    <div className={styles.modalWindow}>
      <Content
        gameState={gameState}
        visualState={visualState}
        facility={facility}
        controlRef={controlRef}
        onCloseClick={onCloseClick}
        closeWithoutApplying={onClose}
      />
      <ModalCloseButton onClick={onCloseClick} />
    </div>
  );
}

function Content({
  gameState,
  visualState,
  facility,
  controlRef,
  onCloseClick,
  closeWithoutApplying,
}: {
  gameState: GameState;
  visualState: VisualState;
  facility: Structure;
  controlRef: ModalControlRef;
  onCloseClick: () => void;
  closeWithoutApplying: () => void;
}) {
  if (facility.type === FacilityType.CITY) {
    return <CityContent city={facility} />;
  }

  if (facility.type === FacilityType.CONSTRUCTION) {
    return (
      <ConstructionContent
        gameState={gameState}
        visualState={visualState}
        construction={facility}
        onCloseClick={onCloseClick}
        closeWithoutApplying={closeWithoutApplying}
      />
    );
  }

  if (isStorageFacility(facility)) {
    return (
      <StorageContent
        visualState={visualState}
        storageFacility={facility}
        onCloseClick={onCloseClick}
      />
    );
  }

  return (
    <FacilityContent
      visualState={visualState}
      gameState={gameState}
      facility={facility}
      controlRef={controlRef}
      onCloseClick={onCloseClick}
      closeWithoutApplying={closeWithoutApplying}
    />
  );
}
