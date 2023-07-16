import type { VisualState } from '@/game/visualState';
import { removeFacility } from '@/game/gameState';
import { useRenderOnVisualStateChange } from '@hooks/useRenderOnVisualStateChange';
import { FacilityLike } from '@/game/types';

import styles from './ModalFooter.module.scss';

type Props = {
  visualState: VisualState;
  facility: FacilityLike;
  close: () => void;
};

export function ModalFooter({ visualState, facility, close }: Props) {
  useRenderOnVisualStateChange();
  const { gameState } = visualState;

  return (
    <div className={styles.footer}>
      <button
        type="button"
        onClick={() => {
          facility.isPaused = !facility.isPaused;

          visualState.onUpdate();
        }}
      >
        {facility.isPaused ? 'Resume' : 'Pause'}
      </button>
      <button
        type="button"
        onClick={() => {
          removeFacility(gameState, facility);
          visualState.onUpdate();
          close();
        }}
      >
        Demolish
      </button>
    </div>
  );
}
