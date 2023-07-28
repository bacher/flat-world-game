import { UiState } from '@/app/logic/UiState';
import { ModalModeType } from '@/app/logic/types';

type Props = {
  uiState: UiState;
};

export function MenuOpener({ uiState }: Props) {
  function openGameMenu() {
    uiState.stopGameLoop();
    uiState.openModal({
      modeType: ModalModeType.GAME_MENU,
    });
  }

  return (
    <button type="button" onClick={openGameMenu}>
      Menu
    </button>
  );
}
