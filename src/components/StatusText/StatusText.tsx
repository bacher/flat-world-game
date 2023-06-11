import { facilitiesDescription } from '../../game/facilitiesDescriptions';
import type { VisualState } from '../../game/visualState';
import { useRenderOnVisualStateChange } from '../hooks/useRenderOnVisualStateChange';

import styles from './StatusText.module.scss';

type Props = {
  visualState: VisualState;
};

export function StatusText({ visualState }: Props) {
  // useRenderOnGameTick();
  useRenderOnVisualStateChange();

  if (!visualState.planingBuildingMode) {
    return null;
  }

  return (
    <div className={styles.statusText}>
      <div className={styles.upperTitle}>Current action</div>
      <div className={styles.mainTitle}>
        Construct:{' '}
        {facilitiesDescription[visualState.planingBuildingMode.facilityType]}
      </div>
      <div className={styles.lowerTitle}>[press Escape to cancel]</div>
    </div>
  );
}
