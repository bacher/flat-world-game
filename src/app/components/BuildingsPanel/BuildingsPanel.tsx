import { useMemo } from 'react';

import { CompleteFacilityType, FacilityType, GameState } from '@/game/types';
import {
  facilitiesDescription,
  initiallyUnlockedFacilities,
} from '@/game/facilities';
import { useRenderOnGameTick } from '@hooks/useRenderOnGameTick';

type Props = {
  gameState: GameState;
  onBuildingClick: (params: { facilityType: CompleteFacilityType }) => void;
};

export function BuildingsPanel({ gameState, onBuildingClick }: Props) {
  useRenderOnGameTick();

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
              onBuildingClick({ facilityType });
            }}
          >
            {facilitiesDescription[facilityType] ?? facilityType}
          </button>
        </div>
      ))}
    </div>
  );
}
