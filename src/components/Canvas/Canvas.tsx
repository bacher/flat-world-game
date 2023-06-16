import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';

import styles from './Canvas.module.scss';

import {
  Facility,
  Structure,
  addCity,
  addCityCarrierPaths,
  addConstructionStructure,
  convertCellToCellId,
  startGame,
} from '../../game/gameState';
import {
  isValidCarrierPlanningTarget,
  renderGameToCanvas,
} from '../../gameRender/render';
import {
  InteractiveActionType,
  VisualState,
  createVisualState,
  isAllowToConstructAtPosition,
  isPointsSame,
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

  const currentTickRef = useRef(0);
  const lastInteractionTick = useRef(0);

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

    const stopGameLoop = startGameLoop(visualStateRef.current, () => {
      currentTickRef.current += 1;
      renderGameToCanvas(visualState);
      gameStateWatcher.emitTick();

      // TODO: While developing
      if (currentTickRef.current > lastInteractionTick.current + 200) {
        console.log('Game stopped');
        stopGameLoop();
      }
    });

    return stopGameLoop;
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

      if (Math.abs(dx) + Math.abs(dy) > 3) {
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
    lastInteractionTick.current = currentTickRef.current;

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

      if (visualState.interactiveAction) {
        switch (visualState.interactiveAction.actionType) {
          case InteractiveActionType.CONSTRUCTION_PLANNING: {
            const isAllow = isAllowToConstructAtPosition(visualState, cell);

            if (isAllow) {
              if (
                visualState.interactiveAction.facilityType === FacilityType.CITY
              ) {
                addCity(gameState, { position: cell });
              } else {
                const nearestCity = [...gameState.cities.values()][0];

                addConstructionStructure(
                  gameState,
                  {
                    facilityType: visualState.interactiveAction.facilityType,
                    position: cell,
                  },
                  nearestCity,
                );
              }

              visualState.interactiveAction = undefined;
              visualState.onUpdate();
            }
            break;
          }
          case InteractiveActionType.CARRIER_PATH_PLANNING: {
            const facility = gameState.structuresByCellId.get(cellId);

            if (
              facility &&
              isValidCarrierPlanningTarget(
                visualState,
                facility,
                visualState.interactiveAction,
              )
            ) {
              const cellId = convertCellToCellId(
                visualState.interactiveAction.cell,
              );

              const originFacility = gameState.structuresByCellId.get(
                cellId,
              ) as Facility;

              const action = visualState.interactiveAction;
              const { direction } = action;

              const fromFacility =
                direction === 'from' ? originFacility : facility;
              const toFacility =
                direction === 'from' ? facility : originFacility;

              const alreadyCarrierPaths = gameState.carrierPathsFromCellId.get(
                fromFacility.cellId,
              );

              if (
                alreadyCarrierPaths &&
                alreadyCarrierPaths.some(
                  (path) =>
                    path.resourceType === action.resourceType &&
                    isPointsSame(path.path.from, fromFacility.position) &&
                    isPointsSame(path.path.to, toFacility.position),
                )
              ) {
                console.log('already path, do nothing');
              } else {
                addCityCarrierPaths(
                  gameState,
                  [...gameState.cities.values()][0],
                  [
                    {
                      path: {
                        from: fromFacility.position,
                        to: toFacility.position,
                      },
                      people: 1,
                      resourceType: action.resourceType,
                    },
                  ],
                );
                visualState.interactiveAction = undefined;
                visualState.onUpdate();
              }
            }
            break;
          }
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
            visualStateRef.current!.interactiveAction = {
              actionType: InteractiveActionType.CONSTRUCTION_PLANNING,
              facilityType,
            };
          }}
        />
      </div>
    </div>
  );
}
