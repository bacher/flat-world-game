import { useImperativeHandle, useMemo, useState } from 'react';
import clamp from 'lodash/clamp';

import { Facility } from '@/game/types';
import {
  facilitiesDescription,
  facilitiesIterationInfo,
} from '@/game/facilities';
import { useForceUpdate } from '@hooks/forceUpdate';
import { getStructureIterationStorageInfo } from '@/game/gameState';
import { StorateType, SupplySection } from '@components/SupplySection';
import { UiState } from '@/app/logic/UiState.ts';

import { ModalControlRef } from '../types';
import { addPath, useAlreadyPathsState } from '../helpers';
import { ModalFooter } from '../ModalFooter';
import styles from './share.module.scss';
import { useUiUpdate } from '@/app/logic/hook.ts';
import { UiUpdateType } from '@/app/logic/types.ts';

type Props = {
  uiState: UiState;
  facility: Facility;
  controlRef: ModalControlRef;
  onCloseClick: () => void;
  closeWithoutApplying: () => void;
};

export function FacilityContent({
  uiState,
  facility,
  controlRef,
  onCloseClick,
  closeWithoutApplying,
}: Props) {
  const { gameState, visualState } = uiState;

  const forceUpdate = useForceUpdate();
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

  const max = facilityInfo.maximumPeopleAtWork;

  useImperativeHandle(controlRef, () => ({
    applyChanges: () => {
      const workersCount = parseInt(workersCountString, 10);

      if (workersCount !== facility.assignedWorkersCount) {
        facility.assignedWorkersCount = clamp(workersCount, 0, max);
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
        <label>
          Assigned Workers (max={max}):{' '}
          <input
            type="number"
            value={workersCountString}
            onChange={(event) => {
              setWorkersCountString(event.target.value);
            }}
          />
        </label>
        <SupplySection
          title="Input"
          storageType={StorateType.INPUT}
          storage={facility.input}
          alreadyPaths={alreadyToPaths}
          onAddPathClick={(resourceType) => {
            addPath(visualState, facility, 'to', resourceType);
            onCloseClick();
          }}
          forceUpdate={forceUpdate}
        />
        <SupplySection
          title="Output"
          storageType={StorateType.OUTPUT}
          storage={facility.output}
          alreadyPaths={alreadyFromPaths}
          onAddPathClick={(resourceType) => {
            addPath(visualState, facility, 'from', resourceType);
            onCloseClick();
          }}
          forceUpdate={forceUpdate}
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
