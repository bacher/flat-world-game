import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';

import styles from './Canvas.module.scss';

import type { Point } from '@/game/types';
import {
  visualStateMove,
  visualStateOnMouseMove,
  visualStateOnResize,
  visualStateSetCanvasActive,
} from '@/game/visualState';
import { UiState } from '@/app/logic/UiState';
import { useForceUpdate } from '@hooks/forceUpdate';
import { BuildingsPanel } from '@components/BuildingsPanel';
import { StatusText } from '@components/StatusText';
import { CitiesPanel } from '@components/CitiesPanel';
import { CurrentResearchIcon } from '@components/CurrentResearchIcon';
import { ModalsWrapper } from '@components/ModalsWrapper';
import { MenuOpener } from '@components/MenuOpener';
import { CursorLocation } from '@components/CursorLocation';

type Props = {
  gameId: string;
};

export function Canvas({ gameId }: Props) {
  const forceUpdate = useForceUpdate();

  const uiStateRef = useRef<UiState | undefined>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);

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

  function fitCanvasSize() {
    const canvas = canvasRef.current!;
    const canvasWrapper = canvasWrapperRef.current!;

    const width = canvasWrapper.clientWidth;
    const height = canvasWrapper.clientHeight;

    const factor = window.devicePixelRatio ?? 1;

    canvas.width = width * factor;
    canvas.height = height * factor;

    (canvas as any).style = `width: ${width}px; height: ${height}px;`;

    return {
      width,
      height,
      pixelRatio: factor,
    };
  }

  useEffect(() => {
    const canvasParams = fitCanvasSize();

    const canvas = canvasRef.current!;

    const ctx = canvas.getContext('2d', {
      alpha: false,
      willReadFrequently: false,
    });

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const uiState = new UiState({
      gameId,
      ctx,
      canvasParams,
      mousePosition: mouseState.mousePos,
    });

    uiStateRef.current = uiState;

    uiState.renderCanvas();
    uiState.startGameLoop();

    forceUpdate();

    return () => {
      uiState.stopGameLoop();
    };
  }, []);

  useEffect(() => {
    const uiState = uiStateRef.current;

    if (uiState && uiState.gameState.gameId !== gameId) {
      uiState.loadGame(gameId);
    }
  }, [gameId]);

  function actualizeMouseState(event: MouseEvent | React.MouseEvent) {
    const uiState = uiStateRef.current;

    if (uiState) {
      visualStateSetCanvasActive(
        uiState.visualState,
        event.target === canvasRef.current,
      );
    }

    uiState?.markUserActivity();

    if (uiState?.modalState) {
      return;
    }

    mouseState.mousePos.x = event.pageX;
    mouseState.mousePos.y = event.pageY;

    if (mouseState.isMouseDown && event.buttons !== 1) {
      mouseState.isMouseDown = false;
      mouseState.mouseDownPosition = undefined;
      toggleDragStyle(false);
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
    const canvas = canvasRef.current!;

    window.addEventListener('mousemove', actualizeMouseState, {
      passive: true,
    });
    window.addEventListener('mouseup', actualizeMouseState, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('beforeunload', onBeforeUnload);
    canvas.addEventListener('wheel', onCanvasWheel);

    return () => {
      canvas.removeEventListener('wheel', onCanvasWheel);
      window.removeEventListener('mousemove', actualizeMouseState);
      window.removeEventListener('mouseup', actualizeMouseState);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  function onResize() {
    const canvasParams = fitCanvasSize();
    const uiState = uiStateRef.current;
    if (uiState) {
      visualStateOnResize(uiState.visualState, canvasParams);
      uiState.renderCanvas();
    }
  }

  function onBeforeUnload() {
    uiStateRef.current?.autoSaveGame();
  }

  function toggleDragStyle(enable: boolean): void {
    if (canvasRef.current) {
      if (enable) {
        canvasRef.current.dataset['drag'] = '';
      } else {
        delete canvasRef.current.dataset['drag'];
      }
    }
  }

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

    toggleDragStyle(true);
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

    const uiState = uiStateRef.current;

    if (uiState) {
      if (event.ctrlKey) {
        uiState.onCanvasZoom(event.deltaY);
      } else {
        visualStateMove(uiState.visualState, {
          x: -event.deltaX * 0.8,
          y: -event.deltaY * 0.8,
        });
      }
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.canvasWrapper} ref={canvasWrapperRef}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          width="10"
          height="10"
          onMouseDown={onMouseDown}
          onClick={onClick}
        />

        {uiStateRef.current && (
          <>
            <CurrentResearchIcon uiState={uiStateRef.current} />
            <StatusText uiState={uiStateRef.current} />
            <CursorLocation uiState={uiStateRef.current} />
            {uiStateRef.current && (
              <ModalsWrapper uiState={uiStateRef.current} />
            )}
          </>
        )}
      </div>

      <div className={styles.sidePanel}>
        {uiStateRef.current && (
          <>
            <div className={styles.sidePanelMenu}>
              <MenuOpener uiState={uiStateRef.current} />
            </div>
            <div className={styles.sidePanelBuildings}>
              <BuildingsPanel uiState={uiStateRef.current} />
            </div>
            <div className={styles.sidePanelCities}>
              <CitiesPanel uiState={uiStateRef.current} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
