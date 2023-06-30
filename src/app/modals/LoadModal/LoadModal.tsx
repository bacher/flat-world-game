import { useMemo, useState } from 'react';
import cn from 'classnames';

import shareStyles from '../share.module.scss';
import styles from './LoadModal.module.scss';

import { gamesListStorage } from '../../../game/persist';

type Props = {
  currentGameId: string;
  onLoad: (param: { gameId: string; saveName: string | undefined }) => void;
  onBackClick: () => void;
};

export function LoadModal({ currentGameId, onLoad, onBackClick }: Props) {
  const gamesList = useMemo(() => {
    const gamesList = gamesListStorage.get();
    if (gamesList) {
      for (const game of gamesList.games) {
        if (game.saves.length) {
          if (game.snapshotCreatedAt === game.lastSnapshotCreatedAt) {
            game.saves.push({
              saveName: '',
              snapshotCreatedAt: game.lastSnapshotCreatedAt,
            });
          }

          game.saves.sort(
            (save1, save2) => save2.snapshotCreatedAt - save1.snapshotCreatedAt,
          );
        }
      }

      gamesList.games.sort(
        (game1, game2) =>
          game2.lastSnapshotCreatedAt - game1.lastSnapshotCreatedAt,
      );
    }
    return gamesList;
  }, []);
  const games = gamesList?.games ?? [];

  const [selectedSave, setSelectedSave] = useState<{
    gameId: string;
    saveName: string | undefined;
  }>();

  return (
    <form
      className={shareStyles.modalWindow}
      onSubmit={(event) => {
        event.preventDefault();

        if (selectedSave) {
          onLoad(selectedSave);
        }
      }}
    >
      <div className={shareStyles.modalHeader}>
        <h2 className={shareStyles.modalTitle}>Load game</h2>
      </div>
      <div className={styles.gamesBlock}>
        <h3>Choose game:</h3>
        <ul className={styles.gamesList}>
          {games.map(({ gameId, gameName, lastSnapshotCreatedAt, saves }) => (
            <li key={gameId}>
              <button
                type="button"
                className={cn(styles.gameButton, {
                  [styles.gameButtonSelected]: gameId === selectedSave?.gameId,
                })}
                onClick={() => {
                  setSelectedSave({
                    gameId,
                    saveName: undefined,
                  });
                }}
              >
                <span className={styles.gameName}>{gameName}</span>{' '}
                {saves.length === 0 &&
                  new Date(lastSnapshotCreatedAt).toLocaleString()}
              </button>
              {saves.length > 0 && (
                <ul>
                  {saves.map(({ saveName, snapshotCreatedAt }, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        className={cn(styles.snapshotButton, {
                          [styles.snapshotButtonSelected]:
                            selectedSave &&
                            gameId === selectedSave.gameId &&
                            ((!saveName && !selectedSave.saveName) ||
                              saveName == selectedSave.saveName),
                        })}
                        onClick={() => {
                          setSelectedSave({
                            gameId,
                            saveName,
                          });
                        }}
                      >
                        <span className={styles.snapshotName}>
                          {saveName || (
                            <span className={styles.latestSave}>
                              Latest
                              {currentGameId === gameId && (
                                <>
                                  {' '}
                                  <span>(Current game)</span>
                                </>
                              )}
                            </span>
                          )}
                        </span>{' '}
                        {new Date(snapshotCreatedAt).toLocaleString()}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
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
          disabled={
            !selectedSave ||
            (currentGameId === selectedSave.gameId && !selectedSave.saveName)
          }
        >
          Load
        </button>
      </div>
    </form>
  );
}
