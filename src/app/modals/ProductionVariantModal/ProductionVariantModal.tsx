import { useMemo } from 'react';
import sortBy from 'lodash/sortBy';

import styles from './ProductionVariantModal.module.scss';

import type {
  BoosterFacilityType,
  ExactFacilityType,
  ProductVariantId,
  StorageItem,
} from '@/game/types';
import {
  boostersIterationInfo,
  DynamicProductionVariantInfo,
  DynamicStorageItem,
  facilitiesIterationInfo,
  isStaticProductionVariant,
  isStaticStorageItem,
  ProductionVariantInfo,
} from '@/game/facilities';
import { resourceLocalization } from '@/game/resources';
import { UiState } from '@/app/logic/UiState';
import { useUiUpdate } from '@/app/logic/hook';
import { UiUpdateType } from '@/app/logic/types';

import { ModalCloseButton } from '../ModalCloseButton';
import { isBoosterFacilityType } from '@/game/types';

type Props = {
  uiState: UiState;
  facilityType: ExactFacilityType | BoosterFacilityType;
  onProductionVariantChoose: (productionVariantId: ProductVariantId) => void;
  onClose: () => void;
};

export function ProductionVariantModal({
  uiState,
  facilityType,
  onProductionVariantChoose,
  onClose,
}: Props) {
  const { gameState } = uiState;
  useUiUpdate(uiState, UiUpdateType.CANVAS);

  const iterationInfo = isBoosterFacilityType(facilityType)
    ? boostersIterationInfo[facilityType]
    : facilitiesIterationInfo[facilityType];

  const unlockedVariants =
    gameState.unlockedProductionVariants.get(facilityType);

  const items = useMemo<
    DynamicProductionVariantInfo[] | ProductionVariantInfo[]
  >(() => {
    if (!unlockedVariants) {
      return iterationInfo.productionVariants;
    }
    return sortBy(iterationInfo.productionVariants, (item) =>
      unlockedVariants.has(item.id) ? 0 : 1,
    );
  }, [gameState.tickNumber]);

  return (
    <div className={styles.modal}>
      <h2 className={styles.title}>Select production variant:</h2>
      <ul className={styles.list}>
        {items.map((variant, index) => (
          <li key={index} className={styles.item}>
            <button
              type="button"
              className={styles.button}
              disabled={!unlockedVariants?.has(variant.id)}
              onClick={() => {
                onProductionVariantChoose(variant.id);
              }}
            >
              <div className={styles.index}>{index + 1}</div>
              <div className={styles.resourcesList}>
                <h3>Input:</h3>
                <StorageList storage={variant.input} />
              </div>
              {isStaticProductionVariant(variant) && (
                <div className={styles.resourcesList}>
                  <h3>Output:</h3>
                  <StorageList storage={variant.output} />
                </div>
              )}
            </button>
          </li>
        ))}
      </ul>
      <ModalCloseButton onClick={onClose} />
    </div>
  );
}

function StorageList({
  storage,
}: {
  storage: (StorageItem | DynamicStorageItem)[];
}) {
  if (storage.length === 0) {
    return <div>None</div>;
  }

  return (
    <ul>
      {storage.map((item) => (
        <li key={item.resourceType}>
          {resourceLocalization[item.resourceType]}
          {isStaticStorageItem(item) && `x ${item.quantity}`}
        </li>
      ))}
    </ul>
  );
}
