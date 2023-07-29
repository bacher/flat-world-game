import { useImperativeHandle, useState } from 'react';

import type { City } from '@/game/types';
import { UiState } from '@/app/logic/UiState';
import { ModalControlRef } from '@/app/modals/FacilityModal/types';
import { UiUpdateType } from '@/app/logic/types';
import { changeCityName } from '@/game/gameState';

import styles from './CityContent.module.scss';

type Props = {
  uiState: UiState;
  city: City;
  controlRef: ModalControlRef;
};

export function CityContent({ uiState, city, controlRef }: Props) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState(city.name);

  useImperativeHandle(controlRef, () => ({
    applyChanges: () => {
      if (isRenaming) {
        applyChanges();
      }
    },
  }));

  function applyChanges() {
    changeCityName(uiState.gameState, city, name);
    uiState.onUpdate(UiUpdateType.CANVAS);
  }

  return (
    <div>
      <h2 className={styles.header}>
        City:{' '}
        {isRenaming ? (
          <>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                applyChanges();
                setIsRenaming(false);
              }}
            >
              <input
                value={name}
                autoFocus
                onChange={(event) => {
                  setName(event.target.value);
                }}
              />{' '}
              <button
                type="button"
                className={styles.editButton}
                onClick={() => {
                  applyChanges();
                  setIsRenaming(false);
                }}
              >
                ✅
              </button>
            </form>
          </>
        ) : (
          <>
            {city.name}{' '}
            <button
              type="button"
              className={styles.editButton}
              onClick={() => {
                setIsRenaming(true);
              }}
            >
              ✏️
            </button>
          </>
        )}
      </h2>
      <div>People moving speed: {city.peopleDayPerCell}</div>
      <div>People carrying weight: {city.weightPerPeopleDay}</div>
      <div>People working modificator: {city.peopleWorkModifier}</div>
    </div>
  );
}
