import { useMemo } from 'react';

import { ExactFacilityType, FacilityType } from '../../game/types';
import { facilitiesDescription } from '../../game/facilities';

type Props = {
  onBuildingClick: (params: { facilityType: ExactFacilityType }) => void;
};

export function BuildingsPanel({ onBuildingClick }: Props) {
  const facilityTypes = useMemo<ExactFacilityType[]>(
    () =>
      [...Object.values(FacilityType)].filter(
        (facilityType) =>
          facilityType !== FacilityType.CONSTRUCTION &&
          facilityType !== FacilityType.CITY,
      ) as ExactFacilityType[],
    [],
  );

  return (
    <div>
      <h2>Build new building:</h2>
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
