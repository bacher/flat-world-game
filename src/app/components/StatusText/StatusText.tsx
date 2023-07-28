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

  switch (visualState.interactiveAction.actionType) {
    case InteractiveActionType.CONSTRUCTION_PLANNING: {
      return (
        <div className={styles.statusText}>
          <div className={styles.upperTitle}>Current action</div>
          <div className={styles.mainTitle}>
            Construct:{' '}
            {facilitiesDescription[visualState.interactiveAction.facilityType]}
          </div>
          <div className={styles.lowerTitle}>[press Escape to cancel]</div>
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
          <div className={styles.lowerTitle}>[press Escape to cancel]</div>
        </div>
      );
    }
  }
}

function getOpositeDirection(direction: 'from' | 'to'): 'from' | 'to' {
  return direction === 'from' ? 'to' : 'from';
}
