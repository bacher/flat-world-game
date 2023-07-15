import { useMemo, useState } from 'react';

import styles from './ResourceChooseModal.module.scss';

import type { GameState } from '@/game/types';
import { resourceLocalization, ResourceType } from '@/game/resources';
import { useRenderOnGameTick } from '@hooks/useRenderOnGameTick';

import { ModalCloseButton } from '../ModalCloseButton';

type Props = {
  gameState: GameState;
  onResourceTypeChoose: (resourceType: ResourceType) => void;
  onClose: () => void;
};

export function ResourceChooseModal({
  gameState: _,
  onResourceTypeChoose,
  onClose,
}: Props) {
  useRenderOnGameTick();

  const [filterText, setFilterText] = useState('');

  const items = useMemo(() => {
    let list = Object.keys(resourceLocalization) as ResourceType[];

    const query = filterText.trim();
    if (query) {
      list = list.filter((resourceType) =>
        resourceLocalization[resourceType].toLowerCase().includes(query),
      );
    }

    return list;
  }, [filterText]);

  return (
    <div className={styles.modal}>
      <h2 className={styles.title}>Select resource type:</h2>
      <label className={styles.searchBlock}>
        Filter{' '}
        <input
          value={filterText}
          autoFocus
          onChange={(event) => {
            setFilterText(event.target.value);
          }}
        />
      </label>
      <ul className={styles.list}>
        {items.map((resourceType, index) => (
          <li key={resourceType} className={styles.item}>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                onResourceTypeChoose(resourceType);
              }}
            >
              <div className={styles.index}>{index + 1}</div>
              <div>{resourceLocalization[resourceType]}</div>
            </button>
          </li>
        ))}
      </ul>
      <ModalCloseButton onClick={onClose} />
    </div>
  );
}
