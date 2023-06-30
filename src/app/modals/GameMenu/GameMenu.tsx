import { useState } from 'react';

import { neverCall } from '../../../utils/typeUtils';

import { GameMenuMain } from '../GameMenuMain';
import { LoadModal } from '../LoadModal';
import { SaveModal } from '../SaveModal';

enum GameMenuScreen {
  MENU = 'MENU',
  LOAD = 'LOAD',
  SAVE = 'SAVE',
}

type Props = {
  currentGameId: string;
  onResume: () => void;
  onLoadGame: (params: {
    gameId: string;
    saveName: string | undefined;
  }) => void;
  onSaveGame: (params: { saveName: string }) => void;
  onExit: () => void;
};

export function GameMenu({
  currentGameId,
  onResume,
  onLoadGame,
  onSaveGame,
  onExit,
}: Props) {
  const [screen, setScreen] = useState(GameMenuScreen.MENU);

  switch (screen) {
    case GameMenuScreen.MENU:
      return (
        <GameMenuMain
          onResume={onResume}
          onLoadClick={() => {
            setScreen(GameMenuScreen.LOAD);
          }}
          onSaveClick={() => {
            setScreen(GameMenuScreen.SAVE);
          }}
          onExitClick={onExit}
        />
      );
    case GameMenuScreen.LOAD:
      return (
        <LoadModal
          currentGameId={currentGameId}
          onLoad={onLoadGame}
          onBackClick={() => {
            setScreen(GameMenuScreen.MENU);
          }}
        />
      );
    case GameMenuScreen.SAVE:
      return (
        <SaveModal
          currentGameId={currentGameId}
          onSave={onSaveGame}
          onBackClick={() => {
            setScreen(GameMenuScreen.MENU);
          }}
        />
      );
    default:
      throw neverCall(screen);
  }
}
