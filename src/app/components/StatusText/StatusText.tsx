import { facilitiesDescription } from '@/game/facilities';
import { resourceLocalization } from '@/game/resources';
import { InteractiveActionType } from '@/game/visualState';
import { UiState } from '@/app/logic/UiState';
import { useUiUpdate } from '@/app/logic/hook.ts';
import { UiUpdateType } from '@/app/logic/types.ts';

import styles from './StatusText.module.scss';

type Props = {
  uiState: UiState;
};

export function StatusText({ uiState }: Props) {
  const { visualState } = uiState;

  useUiUpdate(uiState, UiUpdateType.CANVAS);

  if (!visualState.interactiveAction) {
    return null;
  }

  const cancelBlock = (
    <div className={styles.lowerTitle}>
      [press Escape or click{' '}
      <button
        type="button"
        className={styles.cancelButton}
        onClick={() => {
          uiState.cancelCurrentAction();
        }}
      >
        Cancel
      </button>{' '}
      to cancel]
    </div>
  );

  switch (visualState.interactiveAction.actionType) {
    case InteractiveActionType.CONSTRUCTION_PLANNING: {
      return (
        <div className={styles.statusText}>
          <div className={styles.upperTitle}>Current action</div>
          <div className={styles.mainTitle}>
            Construct:{' '}
            {facilitiesDescription[visualState.interactiveAction.facilityType]}
          </div>
          {cancelBlock}
        </div>
      );
    }
    case InteractiveActionType.CARRIER_PATH_PLANNING: {
      return (
        <div className={styles.statusText}>
          <div className={styles.upperTitle}>Current action</div>
          <div className={styles.mainTitle}>
            Choose carrier path with "
            {resourceLocalization[visualState.interactiveAction.resourceType]}"{' '}
            {getOpositeDirection(visualState.interactiveAction.direction)}:
          </div>
          {cancelBlock}
        </div>
      );
    }
  }
}

function getOpositeDirection(direction: 'from' | 'to'): 'from' | 'to' {
  return direction === 'from' ? 'to' : 'from';
}
