import { useImperativeHandle, useMemo, useState } from 'react';
import clamp from 'lodash/clamp';

import styles from './share.module.scss';

import { Facility } from '@/game/types';
import {
  facilitiesDescription,
  facilitiesIterationInfo,
  IterationInfoType,
} from '@/game/facilities';
import { getStructureIterationStorageInfo } from '@/game/gameState';
import { UiState } from '@/app/logic/UiState';
import { useUiUpdate } from '@/app/logic/hook';
import { UiUpdateType } from '@/app/logic/types';
import { StorateType, SupplySection } from '@components/SupplySection';

import { ModalControlRef } from '../types';
import { useAlreadyPathsState } from '../helpers';
import { ModalFooter } from '../ModalFooter';

type Props = {
  uiState: UiState;
  facility: Facility;
  controlRef: ModalControlRef;
  closeWithoutApplying: () => void;
};

export function FacilityContent({
  uiState,
  facility,
  controlRef,
  closeWithoutApplying,
}: Props) {
  const { gameState } = uiState;

  useUiUpdate(uiState, UiUpdateType.CANVAS);

  const [workersCountString, setWorkersCountString] = useState(
    facility.assignedWorkersCount.toString(),
  );

  const facilityInfo = useMemo(
    () => facilitiesIterationInfo[facility.type],
    [facility.type],
  );

  const iterationInfo = useMemo(
    () => getStructureIterationStorageInfo(facility),
    [facility],
  );

  const alreadyToPaths = useAlreadyPathsState({
    availableResources: iterationInfo.input.map((item) => item.resourceType),
    actualPaths: gameState.carrierPathsToCellId.get(facility.position.cellId),
  });

  const alreadyFromPaths = useAlreadyPathsState({
    availableResources: iterationInfo.output.map((item) => item.resourceType),
    actualPaths: gameState.carrierPathsFromCellId.get(facility.position.cellId),
  });

  useImperativeHandle(controlRef, () => ({
    applyChanges: () => {
      if (facilityInfo.iterationInfoType === IterationInfoType.FACILITY) {
        const workersCount = parseInt(workersCountString, 10);

        if (workersCount !== facility.assignedWorkersCount) {
          facility.assignedWorkersCount = clamp(
            workersCount,
            0,
            facilityInfo.maximumPeopleAtWork,
          );
        }
      }

      for (const resourcePaths of [
        ...alreadyToPaths.values(),
        ...alreadyFromPaths.values(),
      ]) {
        for (const resourcePath of resourcePaths) {
          if (resourcePath.changed) {
            const count = parseInt(resourcePath.inputValue, 10);

            if (Number.isNaN(count)) {
              throw new Error('Invalid format');
            }

            resourcePath.path.people = count;
          }
        }
      }
    },
  }));

  return (
    <div className={styles.contentBlock}>
      <h2>{facilitiesDescription[facility.type]}</h2>
      <div className={styles.content}>
        {facilityInfo.iterationInfoType === IterationInfoType.FACILITY && (
          <label>
            Assigned Workers (max={facilityInfo.maximumPeopleAtWork}):{' '}
            <input
              type="number"
              value={workersCountString}
              onChange={(event) => {
                setWorkersCountString(event.target.value);
              }}
            />
          </label>
        )}
        <SupplySection
          title="Input"
          storageType={StorateType.INPUT}
          storage={facility.input}
          alreadyPaths={alreadyToPaths}
        />
        <SupplySection
          title="Output"
          storageType={StorateType.OUTPUT}
          storage={facility.output}
          alreadyPaths={alreadyFromPaths}
        />
      </div>
      <ModalFooter
        uiState={uiState}
        facility={facility}
        close={closeWithoutApplying}
      />
    </div>
  );
}
