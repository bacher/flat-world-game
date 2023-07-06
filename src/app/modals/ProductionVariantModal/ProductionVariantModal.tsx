import styles from './ProductionVariantModal.module.scss';

import type { ExactFacilityType, StorageItem } from '@/game/types';
import { facilitiesIterationInfo } from '@/game/facilities';
import { resourceLocalization } from '@/game/resources';

import { useRenderOnGameTick } from '@hooks/useRenderOnGameTick';

import { ModalCloseButton } from '../ModalCloseButton';

type Props = {
  facilityType: ExactFacilityType;
  onProductionVariantChoose: (productionVariant: number) => void;
  onClose: () => void;
};

export function ProductionVariantModal({
  facilityType,
  onProductionVariantChoose,
  onClose,
}: Props) {
  useRenderOnGameTick();

  const iterationInfo = facilitiesIterationInfo[facilityType];

  return (
    <div className={styles.modal}>
      <h2>Select production variant</h2>
      <ul className={styles.list}>
        {iterationInfo.productionVariants.map((variant, index) => (
          <li key={index} className={styles.item}>
            <button
              type="button"
              className={styles.button}
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
