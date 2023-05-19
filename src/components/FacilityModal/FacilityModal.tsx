import {
  RefObject,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import clamp from 'lodash/clamp';

import styles from './FacilityModal.module.scss';

import { facilitiesDescription } from '../../game/facilitiesDescriptions';
import { City, Facility, Structure } from '../../game/gameState';
import { FacilityType } from '../../game/types';
import { facilitiesIterationInfo } from '../../game/facilitiesIterationInfo';

type Props = {
  facility: Structure;
  onClose: () => void;
};

type Control = {
  applyChanges: () => void;
};

type ControlRef = RefObject<Control | undefined>;

export function FacilityModal({ facility, onClose }: Props) {
  const controlRef = useRef<Control | undefined>();

  function onCloseClick() {
    controlRef.current?.applyChanges();
    onClose();
  }

  return (
    <div className={styles.modalWindow}>
      <Content facility={facility} controlRef={controlRef} />
      <button
        className={styles.closeButton}
        title="close"
        type="button"
        onClick={onCloseClick}
      >
        x
      </button>
    </div>
  );
}

function Content({
  facility,
  controlRef,
}: {
  facility: Structure;
  controlRef: ControlRef;
}) {
  if (facility.type === FacilityType.CITY) {
    return <CityContent city={facility} />;
  }

  return <FacilityContent facility={facility} controlRef={controlRef} />;
}

function CityContent({ city }: { city: City }) {
  return <div>City: {city.name}</div>;
}

function FacilityContent({
  facility,
  controlRef,
}: {
  facility: Facility;
  controlRef: ControlRef;
}) {
  const [workersCountString, setWorkersCountString] = useState(
    facility.assignedWorkersCount.toString(),
  );

  const max = useMemo(
    () => facilitiesIterationInfo.get(facility.type)!.maximumPeopleAtWork,
    [facility.type],
  );

  useImperativeHandle(controlRef, () => ({
    applyChanges: () => {
      const workersCount = parseInt(workersCountString, 10);

      if (workersCount !== facility.assignedWorkersCount) {
        facility.assignedWorkersCount = clamp(workersCount, 0, max);
      }
    },
  }));

  return (
    <div>
      <div>{facilitiesDescription.get(facility.type)}</div>
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
    </div>
  );
}
