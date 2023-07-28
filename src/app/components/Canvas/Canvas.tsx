import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import clamp from 'lodash/clamp';

import styles from './Canvas.module.scss';

import { City, GameState, Point, ViewportState } from '@/game/types';

import { loadGame, saveGame } from '@/game/gameStatePersist';
import { renderGameToCanvas } from '@/gameRender/render';
import {
  createVisualState,
  InteractiveActionType,
  VisualState,
  visualStateApplyViewportState,
  visualStateGetViewportState,
  visualStateMove,
  visualStateMoveToCell,
  visualStateOnMouseMove,
  visualStateUpdateZoom,
} from '@/game/visualState';

import { useForceUpdate } from '@hooks/forceUpdate';
import {
  createGameStateWatcher,
  GameStateWatcherProvider,
} from '@/app/contexts/GameStateWatcher';
import { BuildingsPanel } from '@components/BuildingsPanel';
import { StatusText } from '@components/StatusText';
import { CitiesPanel } from '@components/CitiesPanel';
import { CurrentResearchIcon } from '@components/CurrentResearchIcon';
import { ModalsWrapper } from '@components/ModalsWrapper';
import { ModalModeType } from '@/app/logic/types';
import { UiState } from '@/app/logic/UiState';

const INITIAL_CANVAS_WIDTH = 800;
const INITIAL_CANVAS_HEIGHT = 600;
const MAXIMUM_ZOOM = 1.5;

type Props = {
  gameId: string;
};

export function Canvas({ gameId }: Props) {
  const forceUpdate = useForceUpdate();

  const uiStateRef = useRef<UiState | undefined>();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const initialViewportStateRef = useRef<ViewportState | undefined>();

  const [gameState, setGameState] = useState<GameState>(() => {
    const { gameState, viewportState } = loadGame(gameId, undefined);
    initialViewportStateRef.current = viewportState;

    return gameState;
  });

  useEffect(() => {
    if (gameState.gameId !== gameId) {
      const { gameState: newGameState, viewportState } = loadGame(
        gameId,
        undefined,
      );
      const visualState = visualStateRef.current!;

      visualState.gameState = newGameState;
      visualStateApplyViewportState(visualState, viewportState);
      setGameState(newGameState);
      renderGameToCanvas(visualState);
    }
  }, [gameId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      saveGame(
        gameState,
        visualStateGetViewportState(visualStateRef.current!),
        undefined,
      );
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [gameState]);

  const mouseState = useMemo<{
    isMouseDown: boolean;
    isDrag: boolean;
    mouseDownPosition: Point | undefined;
  }>(
    () => ({
      isMouseDown: false,
      isDrag: false,
      mouseDownPosition: undefined,
    }),
    [],
  );
  const [mousePos] = useState<Point>(() => ({ x: 0, y: 0 }));

  const visualStateRef = useRef<VisualState | undefined>();

  const gameStateWatcher = useMemo(createGameStateWatcher, []);

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d', {
      alpha: false,
      willReadFrequently: false,
    });

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvasRef.current!.addEventListener('wheel', onCanvasWheel);

    const visualState = createVisualState(gameState, ctx, () => {
      renderGameToCanvas(visualState);
      gameStateWatcher.emitVisualStateChange();
    });

    if (initialViewportStateRef.current) {
      visualStateApplyViewportState(
        visualState,
        initialViewportStateRef.current,
      );
    }

    uiStateRef.current = new UiState({
      gameId,
      visualState,
      onTick: () => {
        gameStateWatcher.emitTick();
      },
    });

    visualStateRef.current = visualState;

    // TODO: Debug
    (window as any).visualState = visualState;
    (window as any).gameState = visualState.gameState;

    visualStateOnMouseMove(visualStateRef.current, mousePos);
    renderGameToCanvas(visualStateRef.current);

    forceUpdate();

    uiStateRef.current?.startGameLoop();

    return () => {
      canvasRef.current!.removeEventListener('wheel', onCanvasWheel);
      uiStateRef.current?.stopGameLoop();
    };
  }, []);

  function actualizeMouseState(event: MouseEvent | React.MouseEvent) {
    uiStateRef.current?.markUserActivity();

    if (uiStateRef.current?.modalState) {
      return;
    }

    mousePos.x = event.pageX;
    mousePos.y = event.pageY;

    if (mouseState.isMouseDown && event.buttons !== 1) {
      mouseState.isMouseDown = false;
      mouseState.mouseDownPosition = undefined;
      forceUpdate();
    }

    if (
      !mouseState.isDrag &&
      mouseState.mouseDownPosition &&
      mouseState.isMouseDown
    ) {
      const dx = mouseState.mouseDownPosition.x - mousePos.x;
      const dy = mouseState.mouseDownPosition.y - mousePos.y;

      if (Math.abs(dx) + Math.abs(dy) > 3) {
        mouseState.isDrag = true;
      }
    }

    const visualState = visualStateRef.current;

    if (visualState) {
      if (mouseState.isMouseDown) {
        visualStateMove(visualState, {
          x: event.movementX,
          y: event.movementY,
        });
      }

      visualStateOnMouseMove(visualState, mousePos);
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    uiStateRef.current?.markUserActivity();

    if (!visualStateRef.current || event.defaultPrevented) {
      return;
    }

    const visualState = visualStateRef.current;

    switch (event.key) {
      case 'Escape':
        if (visualState.interactiveAction) {
          event.preventDefault();
          visualState.interactiveAction = undefined;
          visualState.onUpdate();
        }

        if (uiStateRef.current?.modalState) {
          event.preventDefault();
          uiStateRef.current?.askToCloseCurrentModal();
        }

        break;
    }
  }

  useEffect(() => {
    window.addEventListener('mousemove', actualizeMouseState, {
      passive: true,
    });
    window.addEventListener('mouseup', actualizeMouseState, { passive: true });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('mousemove', actualizeMouseState);
      window.removeEventListener('mouseup', actualizeMouseState);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  function onMouseDown(event: React.MouseEvent) {
    event.preventDefault();

    if (uiStateRef.current?.modalState) {
      return;
    }

    mousePos.x = event.pageX;
    mousePos.y = event.pageY;

    mouseState.isMouseDown = true;
    mouseState.mouseDownPosition = { x: mousePos.x, y: mousePos.y };
    forceUpdate();
  }

  function onClick(event: React.MouseEvent) {
    const isDragMode = mouseState.isDrag;

    if (mouseState.isDrag) {
      mouseState.isDrag = false;
      mouseState.mouseDownPosition = undefined;
    }

    if (event.button !== 0) {
      return;
    }

    event.preventDefault();

    if (isDragMode) {
      return;
    }

    if (uiStateRef.current?.modalState) {
      uiStateRef.current?.askToCloseCurrentModal();
      return;
    }

    uiStateRef.current?.handleCanvasClick({
      x: event.pageX,
      y: event.pageY,
    });
  }

  function onCityClick(city: City): void {
    visualStateMoveToCell(visualStateRef.current!, city.position);
  }

  function openGameMenu() {
    uiStateRef.current?.openModal({
      modeType: ModalModeType.GAME_MENU,
    });
    uiStateRef.current?.stopGameLoop();
  }

  function onCanvasWheel(event: WheelEvent): void {
    event.preventDefault();
    const visualState = visualStateRef.current!;

    actualizeMouseState(event);
    visualStateOnMouseMove(visualState, mousePos);

    if (event.ctrlKey) {
      const zoom = clamp(
        visualState.zoom * (1 - event.deltaY / 100),
        0.1,
        MAXIMUM_ZOOM,
      );
      visualStateUpdateZoom(visualState, zoom);
    }
  }

  return (
    <GameStateWatcherProvider value={gameStateWatcher}>
      <div className={styles.wrapper}>
        <div className={styles.canvasWrapper}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            data-drag={mouseState.isMouseDown || undefined}
            width={INITIAL_CANVAS_WIDTH}
            height={INITIAL_CANVAS_HEIGHT}
            onMouseDown={onMouseDown}
            onClick={onClick}
          />

          <div className={styles.researchPanel}>
            <CurrentResearchIcon
              gameState={gameState}
              onChooseResearchClick={() => {
                uiStateRef.current?.openModal({
                  modeType: ModalModeType.RESEARCH,
                });
              }}
            />
          </div>

          {visualStateRef.current && (
            <>
              <StatusText visualState={visualStateRef.current} />
              {uiStateRef.current && (
                <ModalsWrapper uiState={uiStateRef.current} />
              )}
            </>
          )}
        </div>

        <div className={styles.sidePanel}>
          <button type="button" onClick={openGameMenu}>
            Menu
          </button>
          <BuildingsPanel
            gameState={gameState}
            onBuildingClick={({ facilityType }) => {
              visualStateRef.current!.interactiveAction = {
                actionType: InteractiveActionType.CONSTRUCTION_PLANNING,
                facilityType,
              };
            }}
          />
          <CitiesPanel gameState={gameState} onCityClick={onCityClick} />
        </div>
      </div>
    </GameStateWatcherProvider>
  );
}
