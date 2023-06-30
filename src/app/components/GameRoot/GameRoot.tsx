import { useState } from 'react';

import { generateNewRandomId } from '../../../utils/id';
import { getNewGameSnapshot } from '../../../game/gameStatePersist';
import { gameStateStorage, gamesListStorage } from '../../../game/persist';
import { setHash } from '../../../utils/url';
import { useWindowEvent } from '../../hooks/useWindowEvent';

import { Canvas } from '../Canvas';
import { MainMenu } from '../MainMenu';

const enum GameRoute {
  MAIN_MENU = 'MAIN_MENU',
  IN_GAME = 'IN_GAME',
}

type GameRouteState =
  | {
      type: GameRoute.MAIN_MENU;
    }
  | {
      type: GameRoute.IN_GAME;
      gameId: string;
    };

function getGameRouteState(): GameRouteState {
  const hash = window.location.hash.replace(/^#/, '');

  if (hash && hash.startsWith('/')) {
    const [, route, ...params] = hash.split('/');

    switch (route) {
      case 'g': {
        const [gameId] = params;

        if (gameId && /[\w\d]+/.test(gameId)) {
          const gamesList = gamesListStorage.get();

          if (
            gamesList &&
            gamesList.games.some((game) => game.gameId === gameId)
          ) {
            return {
              type: GameRoute.IN_GAME,
              gameId,
            };
          }
        }

        setHash(undefined, { replace: true });
        break;
      }
    }
  }

  return {
    type: GameRoute.MAIN_MENU,
  };
}

export function GameRoot() {
  const [gameRouteState, setGameRouteState] =
    useState<GameRouteState>(getGameRouteState);

  useWindowEvent('hashchange', () => {
    setGameRouteState(getGameRouteState());
  });

  function onNewGame({ gameName }: { gameName: string }) {
    const gameId = generateNewRandomId();

    const newGame = getNewGameSnapshot({ gameId });

    gameStateStorage.set(gameId, newGame);
    const gamesListInfo = gamesListStorage.get() ?? { games: [] };

    const now = Date.now();

    gamesListInfo.games.unshift({
      gameId,
      gameName,
      snapshotCreatedAt: now,
      lastSnapshotCreatedAt: now,
      saves: [],
    });
    gamesListStorage.set(gamesListInfo);

    setHash(`/g/${gameId}`);
  }

  function onLoadGame({ gameId }: { gameId: string }) {
    setHash(`/g/${gameId}`);
  }

  switch (gameRouteState.type) {
    case GameRoute.MAIN_MENU:
      return <MainMenu onNewGame={onNewGame} onLoadGame={onLoadGame} />;
    case GameRoute.IN_GAME:
      return <Canvas gameId={gameRouteState.gameId} />;
  }
}
