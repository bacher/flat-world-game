import styles from './CursorLocation.module.scss';

import { UiState } from '@/app/logic/UiState';
import { useUiUpdate } from '@/app/logic/hook';
import { UiUpdateType } from '@/app/logic/types';

type Props = {
  uiState: UiState;
};

export function CursorLocation({ uiState }: Props) {
  useUiUpdate(uiState, UiUpdateType.CANVAS);

  const { hoverCell } = uiState.visualState;

  if (!hoverCell) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      ({hoverCell.i},{hoverCell.j})
    </div>
  );
}
