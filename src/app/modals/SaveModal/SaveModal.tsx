import { useMemo, useState } from 'react';
import cn from 'classnames';

import shareStyles from '../share.module.scss';
import styles from './SaveModal.module.scss';

import { gamesListStorage } from '@/game/persist';

type Props = {
  currentGameId: string;
  onSave: (param: { saveName: string }) => void;
  onBackClick: () => void;
};

export function SaveModal({ currentGameId, onSave, onBackClick }: Props) {
  const currentSaves = useMemo(() => {
    const gamesList = gamesListStorage.get();

    if (gamesList) {
      const currentSaves =
        gamesList.games.find((game) => game.gameId === currentGameId)?.saves ??
        [];

      currentSaves.sort(
        (save1, save2) => save2.snapshotCreatedAt - save1.snapshotCreatedAt,
      );
      return currentSaves;
    }

    return [];
  }, [currentGameId]);

  const [saveGameName, setSaveGameName] = useState('');
  const saveGameNameTrimmed = saveGameName.trim();

  return (
    <form
      className={shareStyles.modalWindow}
      onSubmit={(event) => {
        event.preventDefault();

        const saveName = saveGameName.trim();

        if (saveName) {
          onSave({ saveName });
        }
      }}
    >
      <div className={shareStyles.modalHeader}>
        <h2 className={shareStyles.modalTitle}>Save game</h2>
      </div>
      <div className={styles.gamesBlock}>
        <h3>Override existing saving:</h3>
        <ul className={styles.gamesList}>
          {!currentSaves.length && (
            <li>
              <span className={styles.noSavesText}>
                No named saves created yet...
              </span>
            </li>
          )}
          {currentSaves.map(({ saveName, snapshotCreatedAt }, index) => (
            <li key={index}>
              <button
                type="button"
                className={cn(styles.snapshotButton, {
                  [styles.snapshotButtonSelected]:
                    saveName === saveGameNameTrimmed,
                })}
                onClick={() => {
                  setSaveGameName(saveName);
                }}
              >
                <span className={styles.snapshotName}>{saveName}</span>{' '}
                {new Date(snapshotCreatedAt).toLocaleString()}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.saveGameBlock}>
        <label className={styles.saveNameControl}>
          <span>Save name:</span>{' '}
          <input
            className={styles.gameNameInput}
            value={saveGameName}
            autoFocus
            onChange={(event) => {
              setSaveGameName(event.target.value);
            }}
          />
        </label>
      </div>
      <div className={shareStyles.footer}>
        <button
          type="button"
          className={shareStyles.footerButton}
          onClick={onBackClick}
        >
          Cancel
        </button>
        <button
          className={cn(
            shareStyles.footerButton,
            shareStyles.footerButtonPrimary,
          )}
          disabled={!saveGameName.trim()}
        >
          Save
        </button>
      </div>
    </form>
  );
}
