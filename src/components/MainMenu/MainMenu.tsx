import { useMemo } from 'react';

import styles from './MainMenu.module.scss';
import { gamesListStorage } from '../../game/persist';

type Props = {
  onNewGame: (params: { gameName: string }) => void;
  onLoadGame: (params: { gameId: string }) => void;
};

export function MainMenu({ onNewGame, onLoadGame }: Props) {
  const { games } = useMemo(() => gamesListStorage.get() ?? { games: [] }, []);

  function onNewGameClick() {
    const gameName = window.prompt('Enter the name of the new game:')?.trim();

    if (gameName) {
      onNewGame({
        gameName,
      });
    }
  }

  return (
    <div>
      <h1>Flat World</h1>
      {games.length > 0 ? (
        <div className={styles.currentGames}>
          <h2>Current games:</h2>
          <ul>
            {games.map(({ gameId, gameName }) => (
              <li key={gameId}>
                <button
                  type="button"
                  onClick={() => {
                    onLoadGame({ gameId });
                  }}
                >
                  {gameName}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>No games yet</p>
      )}
      <div>
        <button
          type="button"
          className={styles.newGameButton}
          onClick={onNewGameClick}
        >
          New Game
        </button>
      </div>
    </div>
  );
}
