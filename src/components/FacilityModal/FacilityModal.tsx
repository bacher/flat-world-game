import {
  RefObject,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import clamp from 'lodash/clamp';

import styles from './FacilityModal.module.scss';

import { facilitiesDescription } from '../../game/facilitiesDescriptions';
import {
  City,
  Facility,
  GameState,
  Structure,
  addCityCarrierPaths,
} from '../../game/gameState';
import {
  CarrierPath,
  FacilityType,
  ResourceType,
  StorageItem,
} from '../../game/types';
import { facilitiesIterationInfo } from '../../game/facilitiesIterationInfo';
import { resourceLocalization } from '../../game/resourceLocalization';
import { useForceUpdate } from '../hooks/forceUpdate';
import { useRenderOnGameTick } from '../hooks/useRenderOnGameTick';
import { parseCoordinatesFromString } from '../utils/coords';

type Props = {
  gameState: GameState;
  facility: Structure;
  onClose: () => void;
};

type Control = {
  applyChanges: () => void;
};

type ControlRef = RefObject<Control | undefined>;

export type FacilityModalRef = {
  close: () => void;
};

export const FacilityModal = forwardRef<FacilityModalRef, Props>(
  ({ gameState, facility, onClose }, ref) => {
    const controlRef = useRef<Control | undefined>();

    function onCloseClick() {
      controlRef.current?.applyChanges();
      onClose();
    }

    useImperativeHandle(ref, () => ({
      close: onCloseClick,
    }));

    return (
      <div className={styles.modalWindow}>
        <Content
          gameState={gameState}
          facility={facility}
          controlRef={controlRef}
        />
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
  },
);

function Content({
  gameState,
  facility,
  controlRef,
}: {
  gameState: GameState;
  facility: Structure;
  controlRef: ControlRef;
}) {
  if (facility.type === FacilityType.CITY) {
    return <CityContent city={facility} />;
  }

  return (
    <FacilityContent
      gameState={gameState}
      facility={facility}
      controlRef={controlRef}
    />
  );
}

function CityContent({ city }: { city: City }) {
  return <div>City: {city.name}</div>;
}

type ActualPathState = Map<
  ResourceType,
  { path: CarrierPath; inputValue: string; changed: boolean }[]
>;

function useAlreadyPathsState({
  gameState,
  facility,
  actualPaths,
  availablePaths,
}: {
  gameState: GameState;
  facility: Facility;
  actualPaths: CarrierPath[] | undefined;
  availablePaths: StorageItem[];
}): ActualPathState {
  return useMemo(() => {
    const state = new Map();

    for (const availablePath of availablePaths) {
      state.set(availablePath.resourceType, []);
    }

    if (actualPaths) {
      for (const actualPath of actualPaths) {
        let alreadyPaths = state.get(actualPath.resourceType);
        if (!alreadyPaths) {
          alreadyPaths = [];
          state.set(actualPath.resourceType, alreadyPaths);
        }

        alreadyPaths.push({
          path: actualPath,
          inputValue: actualPath.people.toString(),
          changed: false,
        });
      }
    }

    return state;
  }, []);
}

function FacilityContent({
  gameState,
  facility,
  controlRef,
}: {
  gameState: GameState;
  facility: Facility;
  controlRef: ControlRef;
}) {
  const forceUpdate = useForceUpdate();
  useRenderOnGameTick();

  const [workersCountString, setWorkersCountString] = useState(
    facility.assignedWorkersCount.toString(),
  );

  const facilityInfo = useMemo(
    () => facilitiesIterationInfo.get(facility.type)!,
    [facility.type],
  );

  const alreadyToPaths = useAlreadyPathsState({
    gameState,
    facility,
    availablePaths: facilityInfo.input,
    actualPaths: gameState.carrierPathsToCellId.get(facility.cellId),
  });

  const alreadyFromPaths = useAlreadyPathsState({
    gameState,
    facility,
    availablePaths: facilityInfo.output,
    actualPaths: gameState.carrierPathsFromCellId.get(facility.cellId),
  });

  const max = useMemo(() => facilityInfo.maximumPeopleAtWork, [facilityInfo]);

  useImperativeHandle(controlRef, () => ({
    applyChanges: () => {
      const workersCount = parseInt(workersCountString, 10);

      if (workersCount !== facility.assignedWorkersCount) {
        facility.assignedWorkersCount = clamp(workersCount, 0, max);
      }

      for (const resourcePaths of alreadyToPaths.values()) {
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

  function onAddPathClick(
    resourceType: ResourceType,
    alreadyPaths: ActualPathState,
  ): void {
    const coordinatesString = window
      .prompt('Enter cell coordinates in format 3,-3:')
      ?.trim();

    if (!coordinatesString) {
      return;
    }

    const cell = parseCoordinatesFromString(coordinatesString);

    if (!cell) {
      return;
    }

    const newPath = {
      path: {
        from: cell,
        to: facility.position,
      },
      resourceType,
      people: 1,
    };

    addCityCarrierPaths(gameState, [...gameState.cities.values()][0], [
      newPath,
    ]);

    let list = alreadyPaths.get(resourceType);
    if (!list) {
      list = [];
      alreadyPaths.set(resourceType, list);
    }

    list.push({
      path: newPath,
      changed: false,
      inputValue: '1',
    });
  }

  return (
    <div>
      <h2>{facilitiesDescription.get(facility.type)}</h2>
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
          onAddPathClick(resourceType, alreadyToPaths);
        }}
        forceUpdate={forceUpdate}
      />
      <SupplySection
        title="Output"
        storageType={StorateType.OUTPUT}
        storage={facility.output}
        alreadyPaths={alreadyFromPaths}
        onAddPathClick={(resourceType) => {
          onAddPathClick(resourceType, alreadyFromPaths);
        }}
        forceUpdate={forceUpdate}
      />
    </div>
  );
}

const enum StorateType {
  INPUT,
  OUTPUT,
}

function SupplySection({
  title,
  storageType,
  storage,
  alreadyPaths,
  onAddPathClick,
  forceUpdate,
}: {
  title: string;
  storageType: StorateType;
  storage: StorageItem[];
  alreadyPaths: ActualPathState;
  onAddPathClick: (resourceType: ResourceType) => void;
  forceUpdate: () => void;
}) {
  return (
    <div>
      <h3>{title}:</h3>
      {alreadyPaths.size > 0 ? (
        [...alreadyPaths.entries()].map(([resourceType, resourcePaths]) => {
          const storageResource = storage.find(
            (item) => item.resourceType === resourceType,
          );

          return (
            <div key={resourceType}>
              <div className={styles.resourceNameLine}>
                <div className={styles.resourceName}>
                  {resourceLocalization[resourceType]}:{' '}
                  <span>{storageResource?.quantity ?? 0}</span>
                </div>
                <button
                  type="button"
                  className={styles.addCarrierPathButton}
                  onClick={() => onAddPathClick(resourceType)}
                >
                  Add carrier path
                </button>
              </div>
              <div className={styles.carrierPaths}>
                {resourcePaths.map((resourcePath, i) => (
                  <label key={i} className={styles.carrierPathLine}>
                    {'Carriers: '}
                    <input
                      type="number"
                      value={resourcePath.inputValue}
                      onChange={(event) => {
                        resourcePath.inputValue = event.target.value;
                        resourcePath.changed = true;
                        forceUpdate();
                      }}
                    />
                    {storageType === StorateType.INPUT ? (
                      <>
                        {' from ('}
                        {resourcePath.path.path.from.join(',')}
                        {')'}
                      </>
                    ) : (
                      <>
                        {' to ('}
                        {resourcePath.path.path.to.join(',')}
                        {')'}
                      </>
                    )}
                  </label>
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <div>No entities</div>
      )}
    </div>
  );
}
