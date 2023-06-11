import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';

import styles from './Canvas.module.scss';

import {
  Structure,
  addCity,
  addConstructionStructure,
  convertCellToCellId,
  startGame,
} from '../../game/gameState';
import { renderGameToCanvas } from '../../gameRender/render';
import {
  VisualState,
  createVisualState,
  isAllowToConstructAtPosition,
  lookupGridByPoint,
  startGameLoop,
  visualStateMove,
  visualStateOnMouseMove,
} from '../../game/visualState';
import { FacilityType, Point } from '../../game/types';
import { useForceUpdate } from '../hooks/forceUpdate';
import { FacilityModal, FacilityModalRef } from '../FacilityModal';
import {
  GameStateWatcherProvider,
  createGameStateWatcher,
} from '../contexts/GameStateWatcher';
import { BuildingsPanel } from '../BuildingsPanel';
import { StatusText } from '../StatusText';

const INITIAL_CANVAS_WIDTH = 800;
const INITIAL_CANVAS_HEIGHT = 600;

export function Canvas() {
  const forceUpdate = useForceUpdate();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const gameState = useMemo(() => startGame(), []);

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
  const mousePos = useMemo<Point>(() => [0, 0], []);

  const visualStateRef = useRef<VisualState | undefined>();

  const showDialogForFacilityRef = useRef<Structure | undefined>();

  const facilityModalRef = useRef<FacilityModalRef>(null);

  const gameStateWatcher = useMemo(createGameStateWatcher, []);

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d', {
      alpha: false,
      willReadFrequently: false,
    });

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const visualState = createVisualState(gameState, ctx, () => {
      gameStateWatcher.emitVisualStateChange();
    });

    visualStateRef.current = visualState;

    // TODO: Debug
    (window as any).visualState = visualState;
    (window as any).gameState = visualState.gameState;

    visualStateOnMouseMove(visualStateRef.current, mousePos);
    renderGameToCanvas(visualStateRef.current);

    forceUpdate();

    return startGameLoop(visualStateRef.current, () => {
      renderGameToCanvas(visualState);
      gameStateWatcher.emitTick();
    });
  }, []);

  function actualizeMouseState(event: MouseEvent | React.MouseEvent) {
    if (showDialogForFacilityRef.current) {
      return;
    }

    mousePos[0] = event.clientX;
    mousePos[1] = event.clientY;

    if (!mouseState.isMouseDown && event.buttons === 1) {
      mouseState.isMouseDown = true;
      mouseState.mouseDownPosition = [mousePos[0], mousePos[1]];
      forceUpdate();
    } else if (mouseState.isMouseDown && event.buttons !== 1) {
      mouseState.isMouseDown = false;
      mouseState.mouseDownPosition = undefined;
      forceUpdate();
    }

    if (
      !mouseState.isDrag &&
      mouseState.mouseDownPosition &&
      mouseState.isMouseDown
    ) {
      const dx = mouseState.mouseDownPosition[0] - mousePos[0];
      const dy = mouseState.mouseDownPosition[1] - mousePos[1];

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        mouseState.isDrag = true;
      }
    }

    const visualState = visualStateRef.current;

    if (visualState) {
      if (mouseState.isMouseDown) {
        visualStateMove(visualState, [event.movementX, event.movementY]);
      }

      visualStateOnMouseMove(visualState, mousePos);
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (!visualStateRef.current || event.defaultPrevented) {
      return;
    }

    const visualState = visualStateRef.current;

    switch (event.key) {
      case 'Escape':
        if (visualState.planingBuildingMode) {
          event.preventDefault();
          visualState.planingBuildingMode = undefined;
          visualState.onUpdate();
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

    if (showDialogForFacilityRef.current) {
      facilityModalRef.current?.close();
      return;
    }

    const visualState = visualStateRef.current!;

    const cell = lookupGridByPoint(visualState, [event.clientX, event.clientY]);

    if (cell) {
      const cellId = convertCellToCellId(cell);
      const facility = gameState.structuresByCellId.get(cellId);

      if (visualState.planingBuildingMode) {
        const isAllow = isAllowToConstructAtPosition(visualState, cell);

        if (isAllow) {
          if (
            visualState.planingBuildingMode.facilityType === FacilityType.CITY
          ) {
            addCity(gameState, { position: cell });
          } else {
            const nearestCity = [...gameState.cities.values()][0];

            addConstructionStructure(
              gameState,
              {
                facilityType: visualState.planingBuildingMode.facilityType,
                position: cell,
              },
              nearestCity,
            );
          }

          visualState.planingBuildingMode = undefined;
          visualState.onUpdate();
        }
      } else {
        showDialogForFacilityRef.current = facility;
        visualStateOnMouseMove(visualState, undefined);

        forceUpdate();
      }
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
        <GameStateWatcherProvider value={gameStateWatcher}>
          {visualStateRef.current && (
            <>
              <StatusText visualState={visualStateRef.current} />
              {showDialogForFacilityRef.current && (
                <>
                  <div
                    className={styles.modalShadow}
                    onClick={() => {
                      facilityModalRef.current?.close();
                    }}
                  />
                  <div className={styles.modalWrapper}>
                    <FacilityModal
                      ref={facilityModalRef}
                      gameState={gameState}
                      visualState={visualStateRef.current}
                      facility={showDialogForFacilityRef.current}
                      onClose={() => {
                        showDialogForFacilityRef.current = undefined;
                        forceUpdate();
                      }}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </GameStateWatcherProvider>
      </div>
      <div className={styles.sidePanel}>
        <BuildingsPanel
          onBuildingClick={({ facilityType }) => {
            visualStateRef.current!.planingBuildingMode = {
              facilityType,
            };
          }}
        />
      </div>
    </div>
  );
}
