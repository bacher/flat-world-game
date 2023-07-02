import { useMemo } from 'react';

import {
  GameState,
  ExactFacilityType,
  FacilityType,
} from '../../../game/types';
import {
  facilitiesDescription,
  initiallyUnlockedFacilities,
} from '../../../game/facilities';
import { useRenderOnGameTick } from '../../hooks/useRenderOnGameTick';

type Props = {
  gameState: GameState;
  onBuildingClick: (params: { facilityType: ExactFacilityType }) => void;
};

export function BuildingsPanel({ gameState, onBuildingClick }: Props) {
  useRenderOnGameTick();

  const facilityTypes = useMemo<ExactFacilityType[]>(
    () =>
      [...Object.values(FacilityType)].filter(
        (facilityType) =>
          facilityType !== FacilityType.CONSTRUCTION &&
          facilityType !== FacilityType.CITY,
      ) as ExactFacilityType[],
    [],
  );

  const availableFacilities = [
    ...initiallyUnlockedFacilities,
    ...facilityTypes.filter((facilityType) =>
      gameState.unlockedFacilities.has(facilityType),
    ),
  ];

  return (
    <div>
      <h2>Build new building:</h2>
      {availableFacilities.map((facilityType) => (
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
