import { useEffect } from 'react';

import { UiUpdateType } from '@/app/logic/types';
import { useForceUpdate } from '@hooks/forceUpdate';
import { UiState } from '@/app/logic/UiState';

export function useUiUpdate(uiState: UiState, updateType: UiUpdateType): void {
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    uiState.addListener(updateType, forceUpdate);

    return () => {
      uiState.removeListener(updateType, forceUpdate);
    };
  }, []);
}
