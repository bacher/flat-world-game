import { RefObject } from 'react';

import { ModalMode, UiUpdateType } from '@/app/logic/types';
import {
  startGameLoop,
  VisualState,
  visualStateApplyViewportState,
  visualStateGetViewportState,
} from '@/game/visualState';
import { GameState } from '@/game/types';
import { loadGame, saveGame } from '@/game/gameStatePersist';
import { ModalRef } from '@/app/modals/types';

type Callback = () => void;

const allUpdateTypes: UiUpdateType[] = [
  UiUpdateType.MODAL,
  UiUpdateType.RESEARCH,
  UiUpdateType.CANVAS,
];

export class UiState {
  public gameId: string;
  public visualState: VisualState;
  public gameState: GameState;
  public modalState: ModalMode | undefined;
  public modalRef: RefObject<ModalRef> = { current: null };
  public isInGameLoop = false;
  public currentTick = 0;
  public lastInteractionTick = -1;

  private listeners: Record<UiUpdateType, Callback[]> = {
    [UiUpdateType.MODAL]: [],
    [UiUpdateType.RESEARCH]: [],
    [UiUpdateType.CANVAS]: [],
  };
  private stopGameLoopCallback: Callback | undefined;
  private readonly onTickCallback: Callback;

  constructor({
    gameId,
    visualState,
    onTick,
  }: {
    gameId: string;
    visualState: VisualState;
    onTick: Callback;
  }) {
    this.gameId = gameId;
    this.visualState = visualState;
    this.gameState = visualState.gameState;
    this.onTickCallback = onTick;
  }

  openModal(modalMode: ModalMode) {
    this.modalState = modalMode;
    this.onUpdate(UiUpdateType.MODAL);
  }

  askToCloseCurrentModal() {
    if (this.modalRef.current) {
      this.modalRef.current.close();
    } else {
      this.forceCloseCurrentModal();
    }
  }

  forceCloseCurrentModal() {
    this.modalState = undefined;
    this.onUpdate(UiUpdateType.MODAL);
  }

  loadGame(gameId: string, saveName?: string): void {
    const { gameState: newGameState, viewportState } = loadGame(
      gameId,
      saveName,
    );

    this.visualState.gameState = newGameState;
    this.gameState = newGameState;
    visualStateApplyViewportState(this.visualState, viewportState);

    this.onUpdate();
  }

  saveGame({ saveName }: { saveName?: string } = {}): void {
    saveGame(
      this.gameState,
      visualStateGetViewportState(this.visualState),
      saveName,
    );
    this.startGameLoop();
  }

  startGameLoop() {
    if (this.isInGameLoop) {
      return;
    }

    this.isInGameLoop = true;

    const visualState = this.visualState;

    this.stopGameLoopCallback = startGameLoop(visualState, () => {
      this.currentTick += 1;
      this.onUpdate(UiUpdateType.CANVAS);
      this.onTickCallback();

      // TODO: While developing
      if (this.currentTick > this.lastInteractionTick + 200) {
        console.log('Game stopped');
        this.stopGameLoop();
      }
    });
  }

  stopGameLoop() {
    if (this.stopGameLoopCallback) {
      this.stopGameLoopCallback();
      this.stopGameLoopCallback = undefined;
      this.isInGameLoop = false;
    }
  }

  markUserActivity(): void {
    this.lastInteractionTick = this.currentTick;
  }

  onUpdate(updateType?: UiUpdateType | UiUpdateType[]): void {
    const updateTypes = Array.isArray(updateType)
      ? updateType
      : updateType
      ? [updateType]
      : allUpdateTypes;

    const alreadyCalled = new Set<Callback>();

    for (const type of updateTypes) {
      for (const callback of this.listeners[type]) {
        if (!alreadyCalled.has(callback)) {
          alreadyCalled.add(callback);
          callback();
        }
      }
    }
  }

  addListener(updateType: UiUpdateType, callback: Callback) {
    this.listeners[updateType].push(callback);
  }

  removeListener(updateType: UiUpdateType, callback: Callback) {
    const listeners = this.listeners[updateType];

    const index = listeners.indexOf(callback);

    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }
}
