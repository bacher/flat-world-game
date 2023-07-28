import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';

import styles from './Canvas.module.scss';

import type { Point } from '@/game/types';
import { visualStateMove, visualStateOnMouseMove } from '@/game/visualState';
import { UiState } from '@/app/logic/UiState';
import { useForceUpdate } from '@hooks/forceUpdate';
import { BuildingsPanel } from '@components/BuildingsPanel';
import { StatusText } from '@components/StatusText';
import { CitiesPanel } from '@components/CitiesPanel';
import { CurrentResearchIcon } from '@components/CurrentResearchIcon';
import { ModalsWrapper } from '@components/ModalsWrapper';
import { MenuOpener } from '@components/MenuOpener';

const INITIAL_CANVAS_WIDTH = 800;
const INITIAL_CANVAS_HEIGHT = 600;

type Props = {
  gameId: string;
};

export function Canvas({ gameId }: Props) {
  const forceUpdate = useForceUpdate();

  const uiStateRef = useRef<UiState | undefined>();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const mouseState = useMemo<{
    isMouseDown: boolean;
    isDrag: boolean;
    mouseDownPosition: Point | undefined;
    mousePos: Point;
  }>(
    () => ({
      isMouseDown: false,
      isDrag: false,
      mouseDownPosition: undefined,
      mousePos: { x: 0, y: 0 },
    }),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current!;

    const ctx = canvas.getContext('2d', {
      alpha: false,
      willReadFrequently: false,
    });

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvas.addEventListener('wheel', onCanvasWheel);

    const uiState = new UiState({
      gameId,
      ctx,
      mousePosition: mouseState.mousePos,
    });

    uiStateRef.current = uiState;

    uiState.renderCanvas();
    uiState.startGameLoop();

    forceUpdate();

    return () => {
      canvas.removeEventListener('wheel', onCanvasWheel);
      uiState.stopGameLoop();
    };
  }, []);

  useEffect(() => {
    const uiState = uiStateRef.current;

    if (uiState && uiState.gameId !== gameId) {
      uiState.loadGame(gameId);
    }
  }, [gameId]);

  function actualizeMouseState(event: MouseEvent | React.MouseEvent) {
    const uiState = uiStateRef.current;

    uiState?.markUserActivity();

    if (uiState?.modalState) {
      return;
    }

    mouseState.mousePos.x = event.pageX;
    mouseState.mousePos.y = event.pageY;

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
      const dx = mouseState.mouseDownPosition.x - mouseState.mousePos.x;
      const dy = mouseState.mouseDownPosition.y - mouseState.mousePos.y;

      if (Math.abs(dx) + Math.abs(dy) > 3) {
        mouseState.isDrag = true;
      }
    }

    if (uiState) {
      if (mouseState.isMouseDown) {
        visualStateMove(uiState.visualState, {
          x: event.movementX,
          y: event.movementY,
        });
      }

      visualStateOnMouseMove(uiState.visualState, mouseState.mousePos);
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    const uiState = uiStateRef.current;

    uiState?.markUserActivity();

    if (!uiState || event.defaultPrevented) {
      return;
    }

    switch (event.key) {
      case 'Escape':
        if (uiState.cancelCurrentAction()) {
          event.preventDefault();
        }
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

    mouseState.mousePos.x = event.pageX;
    mouseState.mousePos.y = event.pageY;

    mouseState.isMouseDown = true;
    mouseState.mouseDownPosition = {
      x: event.pageX,
      y: event.pageY,
    };
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

    const uiState = uiStateRef.current;

    if (uiState) {
      if (uiState.modalState) {
        uiState.askToCloseCurrentModal();
        return;
      }

      uiState.handleCanvasClick({
        x: event.pageX,
        y: event.pageY,
      });
    }
  }

  function onCanvasWheel(event: WheelEvent): void {
    event.preventDefault();

    actualizeMouseState(event);

    if (event.ctrlKey && uiStateRef.current) {
      uiStateRef.current.onCanvasZoom(event.deltaY);
    }
  }

  return (
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

        {uiStateRef.current && (
          <>
            <div className={styles.researchPanel}>
              <CurrentResearchIcon uiState={uiStateRef.current} />
            </div>
            <StatusText uiState={uiStateRef.current} />
            {uiStateRef.current && (
              <ModalsWrapper uiState={uiStateRef.current} />
            )}
          </>
        )}
      </div>

      <div className={styles.sidePanel}>
        {uiStateRef.current && (
          <>
            <MenuOpener uiState={uiStateRef.current} />
            <BuildingsPanel uiState={uiStateRef.current} />
            <CitiesPanel uiState={uiStateRef.current} />
          </>
        )}
      </div>
    </div>
  );
}
