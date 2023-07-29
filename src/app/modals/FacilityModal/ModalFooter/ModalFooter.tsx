import { removeFacility } from '@/game/gameState';
import { FacilityLike } from '@/game/types';
import { UiState } from '@/app/logic/UiState';

import styles from './ModalFooter.module.scss';

type Props = {
  uiState: UiState;
  facility: FacilityLike;
  close: () => void;
};

export function ModalFooter({ uiState, facility, close }: Props) {
  const { gameState, visualState } = uiState;

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
