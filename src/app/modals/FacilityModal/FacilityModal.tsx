import {
  RefObject,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import clamp from 'lodash/clamp';

import styles from './FacilityModal.module.scss';

import {
  City,
  Construction,
  Facility,
  GameState,
  Structure,
  CarrierPath,
  FacilityType,
  StorageItem,
  CellPosition,
} from '@/game/types';
import { facilitiesDescription } from '@/game/facilities';
import { facilitiesConstructionInfo } from '@/game/facilityConstruction';
import {
  getStructureIterationStorageInfo,
  removeFacility,
} from '@/game/gameState';
import { ResourceType } from '@/game/resources';
import { facilitiesIterationInfo } from '@/game/facilities';
import { resourceLocalization } from '@/game/resources';
import { useForceUpdate } from '@hooks/forceUpdate';
import { useRenderOnGameTick } from '@hooks/useRenderOnGameTick';
import { InteractiveActionType, VisualState } from '@/game/visualState';
import { humanFormat } from '@/utils/format';

import type { ModalRef } from '../types';
import { ModalCloseButton } from '../ModalCloseButton';

type Props = {
  gameState: GameState;
  visualState: VisualState;
  facility: Structure;
  modalRef: RefObject<ModalRef>;
  onClose: () => void;
};

type Control = {
  applyChanges: () => void;
};

type ControlRef = RefObject<Control | undefined>;

export function FacilityModal({
  gameState,
  visualState,
  facility,
  modalRef,
  onClose,
}: Props) {
  const controlRef = useRef<Control | undefined>();

  function onCloseClick() {
    controlRef.current?.applyChanges();
    onClose();
  }

  useImperativeHandle(modalRef, () => ({
    close: onCloseClick,
  }));

  return (
    <div className={styles.modalWindow}>
      <Content
        gameState={gameState}
        visualState={visualState}
        facility={facility}
        controlRef={controlRef}
        onCloseClick={onCloseClick}
        closeWithoutApplying={onClose}
      />
      <ModalCloseButton onClick={onCloseClick} />
    </div>
  );
}

function Content({
  gameState,
  visualState,
  facility,
  controlRef,
  onCloseClick,
  closeWithoutApplying,
}: {
  gameState: GameState;
  visualState: VisualState;
  facility: Structure;
  controlRef: ControlRef;
  onCloseClick: () => void;
  closeWithoutApplying: () => void;
}) {
  if (facility.type === FacilityType.CITY) {
    return (
      <CityContent
        city={facility}
        onNewCityClick={() => {
          visualState.interactiveAction = {
            actionType: InteractiveActionType.CONSTRUCTION_PLANNING,
            facilityType: FacilityType.CITY,
            expeditionFromCity: facility,
          };
          visualState.onUpdate();
          onCloseClick();
        }}
      />
    );
  }

  if (facility.type === FacilityType.CONSTRUCTION) {
    return (
      <ConstructionContent
        gameState={gameState}
        visualState={visualState}
        construction={facility}
        onCloseClick={onCloseClick}
        closeWithoutApplying={closeWithoutApplying}
      />
    );
  }

  return (
    <FacilityContent
      visualState={visualState}
      gameState={gameState}
      facility={facility}
      controlRef={controlRef}
      onCloseClick={onCloseClick}
      closeWithoutApplying={closeWithoutApplying}
    />
  );
}

function CityContent({
  city,
  onNewCityClick,
}: {
  city: City;
  onNewCityClick: () => void;
}) {
  return (
    <div>
      <h2>City: {city.name}</h2>
      <div>People moving speed: {city.peopleDayPerCell}</div>
      <div>People carrying weight: {city.weightPerPeopleDay}</div>
      <div>People working modificator: {city.peopleWorkModifier}</div>
      <button
        type="button"
        onClick={() => {
          onNewCityClick();
        }}
      >
        Set up new City
      </button>
    </div>
  );
}

function ConstructionContent({
  gameState,
  visualState,
  construction,
  onCloseClick,
  closeWithoutApplying,
}: {
  gameState: GameState;
  visualState: VisualState;
  construction: Construction;
  onCloseClick: () => void;
  closeWithoutApplying: () => void;
}) {
  const forceUpdate = useForceUpdate();

  const iterationInfo = useMemo(
    () => facilitiesConstructionInfo[construction.buildingFacilityType],
    [construction.buildingFacilityType],
  );

  const alreadyToPaths = useAlreadyPathsState({
    availableResources: iterationInfo.input.map((item) => item.resourceType),
    actualPaths: gameState.carrierPathsToCellId.get(
      construction.position.cellId,
    ),
  });

  return (
    <div className={styles.contentBlock}>
      <h2>Under construction</h2>
      <div className={styles.content}>
        <SupplySection
          title="Input"
          storageType={StorateType.INPUT}
          storage={construction.input}
          alreadyPaths={alreadyToPaths}
          onAddPathClick={(resourceType) => {
            addPath(visualState, construction, 'to', resourceType);
            onCloseClick();
          }}
          forceUpdate={forceUpdate}
        />
      </div>
      <div className={styles.footer}>
        <button
          type="button"
          onClick={() => {
            construction.isPaused = !construction.isPaused;
            visualState.onUpdate();
          }}
        >
          {construction.isPaused ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={() => {
            removeFacility(gameState, construction);
            visualState.onUpdate();
            closeWithoutApplying();
          }}
        >
          Demolish
        </button>
      </div>
    </div>
  );
}

type ActualPathState = Map<
  ResourceType,
  { path: CarrierPath; inputValue: string; changed: boolean }[]
>;

function useAlreadyPathsState({
  availableResources,
  actualPaths,
}: {
  availableResources: ResourceType[];
  actualPaths: CarrierPath[] | undefined;
}): ActualPathState {
  return useMemo(() => {
    const state = new Map();

    for (const resourceType of availableResources) {
      state.set(resourceType, []);
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

function addPath(
  visualState: VisualState,
  facility: Structure,
  direction: 'from' | 'to',
  resourceType: ResourceType,
): void {
  visualState.interactiveAction = {
    actionType: InteractiveActionType.CARRIER_PATH_PLANNING,
    cell: facility.position,
    direction,
    resourceType,
  };
  visualState.onUpdate();
}

function FacilityContent({
  visualState,
  gameState,
  facility,
  controlRef,
  onCloseClick,
  closeWithoutApplying,
}: {
  visualState: VisualState;
  gameState: GameState;
  facility: Facility;
  controlRef: ControlRef;
  onCloseClick: () => void;
  closeWithoutApplying: () => void;
}) {
  const forceUpdate = useForceUpdate();
  useRenderOnGameTick();

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
      <div className={styles.footer}>
        <button
          type="button"
          onClick={() => {
            facility.isPaused = !facility.isPaused;
            visualState.onUpdate();
          }}
        >
          {facility.isPaused ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={() => {
            removeFacility(gameState, facility);
            visualState.onUpdate();
            closeWithoutApplying();
          }}
        >
          Demolish
        </button>
      </div>
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
                  <span>{humanFormat(storageResource?.quantity ?? 0)}</span>
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
                    {storageType === StorateType.INPUT
                      ? ` from ${formatCell(resourcePath.path.path.from)}`
                      : ` to ${formatCell(resourcePath.path.path.to)}`}
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

function formatCell(cell: CellPosition): string {
  return `(${cell.i},${cell.j})`;
}
