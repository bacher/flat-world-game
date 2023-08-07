import { RefObject, useImperativeHandle, useRef } from 'react';

import styles from './FacilityModal.module.scss';

import {
  FacilityType,
  isBoosterFacility,
  isStorageFacility,
  Structure,
} from '@/game/types';
import { UiState } from '@/app/logic/UiState';

import type { ModalRef } from '../types';
import { ModalCloseButton } from '../ModalCloseButton';
import type { ModalControl, ModalControlRef } from './types';
import { FacilityContent } from './content/FacilityContent';
import { CityContent } from './content/CityContent';
import { ConstructionContent } from './content/ConstructionContent';
import { StorageContent } from './content/StorageContent';

type Props = {
  uiState: UiState;
  facility: Structure;
  modalRef: RefObject<ModalRef>;
  onClose: () => void;
};

export function FacilityModal({ uiState, facility, modalRef, onClose }: Props) {
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
        uiState={uiState}
        facility={facility}
        controlRef={controlRef}
        onCloseClick={onCloseClick}
        closeWithoutApplying={onClose}
      />
      <ModalCloseButton onClick={onCloseClick} />
    </div>
  );
}

type ContentProps = {
  uiState: UiState;
  facility: Structure;
  controlRef: ModalControlRef;
  onCloseClick: () => void;
  closeWithoutApplying: () => void;
};

function Content({
  uiState,
  facility,
  controlRef,
  onCloseClick,
  closeWithoutApplying,
}: ContentProps) {
  const { gameState, visualState } = uiState;

  if (facility.type === FacilityType.CITY) {
    return (
      <CityContent city={facility} uiState={uiState} controlRef={controlRef} />
    );
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
        uiState={uiState}
        storageFacility={facility}
        onCloseClick={onCloseClick}
      />
    );
  }

  // TODO: Implement
  if (isBoosterFacility(facility)) {
    return <div>Booster</div>;
  }

  return (
    <FacilityContent
      uiState={uiState}
      facility={facility}
      controlRef={controlRef}
      closeWithoutApplying={closeWithoutApplying}
    />
  );
}
