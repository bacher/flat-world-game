import { useMemo } from 'react';

import { CompleteFacilityType, FacilityType } from '@/game/types';
import {
  facilitiesDescription,
  initiallyUnlockedFacilities,
} from '@/game/facilities';
import { UiState } from '@/app/logic/UiState';
import { InteractiveActionType } from '@/game/visualState';
import { useUiUpdate } from '@/app/logic/hook.ts';
import { UiUpdateType } from '@/app/logic/types.ts';

type Props = {
  uiState: UiState;
};

export function BuildingsPanel({ uiState }: Props) {
  const { visualState, gameState } = uiState;

  useUiUpdate(uiState, UiUpdateType.CANVAS);

  const facilityTypes = useMemo<CompleteFacilityType[]>(
    () =>
      (
        [...Object.values(FacilityType)].filter(
          (facilityType) => facilityType !== FacilityType.CONSTRUCTION,
        ) as CompleteFacilityType[]
      ).filter(
        (facilityType) =>
          facilityType === FacilityType.CITY ||
          initiallyUnlockedFacilities.has(facilityType) ||
          gameState.unlockedFacilities.has(facilityType),
      ),
    [],
  );

  return (
    <div>
      <h2>Build new facility:</h2>
      {facilityTypes.map((facilityType) => (
        <div key={facilityType}>
          <button
            type="button"
            onClick={() => {
              visualState.interactiveAction = {
                actionType: InteractiveActionType.CONSTRUCTION_PLANNING,
                facilityType,
              };
            }}
          >
            {facilitiesDescription[facilityType] ?? facilityType}
          </button>
        </div>
      ))}
    </div>
  );
}
