import { useMemo } from 'react';

import sortBy from 'lodash/sortBy';

import styles from './ProductionVariantModal.module.scss';

import type { ExactFacilityType, GameState, StorageItem } from '@/game/types';
import { facilitiesIterationInfo } from '@/game/facilities';
import { resourceLocalization } from '@/game/resources';

import { useRenderOnGameTick } from '@hooks/useRenderOnGameTick';

import { ModalCloseButton } from '../ModalCloseButton';

type Props = {
  gameState: GameState;
  facilityType: ExactFacilityType;
  onProductionVariantChoose: (productionVariant: number) => void;
  onClose: () => void;
};

export function ProductionVariantModal({
  gameState,
  facilityType,
  onProductionVariantChoose,
  onClose,
}: Props) {
  useRenderOnGameTick();

  const iterationInfo = facilitiesIterationInfo[facilityType];

  const unlockedVariants =
    gameState.unlockedProductionVariants.get(facilityType);

  const items = useMemo(() => {
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
                onProductionVariantChoose(index);
              }}
            >
              <div className={styles.index}>{index + 1}</div>
              <div className={styles.resourcesList}>
                <h3>Input:</h3>
                <StorageList storage={variant.input} />
              </div>
              <div className={styles.resourcesList}>
                <h3>Output:</h3>
                <StorageList storage={variant.output} />
              </div>
            </button>
          </li>
        ))}
      </ul>
      <ModalCloseButton onClick={onClose} />
    </div>
  );
}

function StorageList({ storage }: { storage: StorageItem[] }) {
  return (
    <ul>
      {storage.map((item) => (
        <li key={item.resourceType}>
          {resourceLocalization[item.resourceType]} x {item.quantity}
        </li>
      ))}
    </ul>
  );
}
