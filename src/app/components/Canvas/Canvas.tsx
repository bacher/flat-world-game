import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import cn from 'classnames';

import styles from './Canvas.module.scss';

import {
  City,
  Facility,
  GameState,
  Structure,
  addCity,
  addCityCarrierPaths,
  addConstructionStructure,
  convertCellToCellId,
  getFacilityBindedCity,
  getNearestCity,
} from '../../../game/gameState';
import { loadGame, saveGame } from '../../../game/gameStatePersist';
import {
  isValidCarrierPlanningTarget,
  renderGameToCanvas,
} from '../../../gameRender/render';
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
  visualStateMoveToCell,
} from '../../../game/visualState';
import { FacilityType, Point } from '../../../game/types';
import { useForceUpdate } from '../../hooks/forceUpdate';
import { ModalRef } from '../../modals/types';
import { FacilityModal } from '../../modals/FacilityModal';
import {
  GameStateWatcherProvider,
  createGameStateWatcher,
} from '../../contexts/GameStateWatcher';
import { BuildingsPanel } from '../BuildingsPanel';
import { StatusText } from '../StatusText';
import { CitiesPanel } from '../CitiesPanel';
import { CurrentResearchIcon } from '../CurrentResearchIcon';
import { ResearchModal } from '../../modals/ResearchModal';
import { neverCall } from '../../../utils/typeUtils';
import { GameMenu } from '../../modals/GameMenu';
import { setHash } from '../../../utils/url';

const INITIAL_CANVAS_WIDTH = 800;
const INITIAL_CANVAS_HEIGHT = 600;

const enum ModalModeType {
  GAME_MENU = 'GAME_MENU',
  FACILITY = 'FACILITY',
  RESEARCH = 'RESEARCH',
}

type ModalMode =
  | {
      modeType: ModalModeType.FACILITY;
      facility: Structure;
    }
  | {
      modeType: ModalModeType.RESEARCH | ModalModeType.GAME_MENU;
    };

type Props = {
  gameId: string;
};

export function Canvas({ gameId }: Props) {
  const forceUpdate = useForceUpdate();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<GameState>(() =>
    loadGame(gameId, undefined),
  );

  useEffect(() => {
    if (gameState.gameId !== gameId) {
      const newGameState = loadGame(gameId, undefined);
      visualStateRef.current!.gameState = newGameState;
      setGameState(newGameState);
      renderGameToCanvas(visualStateRef.current!);
    }
  }, [gameId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      saveGame(gameState, undefined);
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
  const mousePos = useMemo<Point>(() => [0, 0], []);

  const visualStateRef = useRef<VisualState | undefined>();

  const modalModeRef = useRef<ModalMode | undefined>();

  const modalRef = useRef<ModalRef>(null);

  const gameStateWatcher = useMemo(createGameStateWatcher, []);

  const currentTickRef = useRef(0);
  const lastInteractionTick = useRef(0);

  const stopGameLoopRef = useRef<() => void>();

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

    startGameLoopLogic();

    return () => {
      stopGameLoopLogic();
    };
  }, []);

  function startGameLoopLogic() {
    if (stopGameLoopRef.current) {
      return;
    }

    const visualState = visualStateRef.current!;

    stopGameLoopRef.current = startGameLoop(visualState, () => {
      currentTickRef.current += 1;
      renderGameToCanvas(visualState);
      gameStateWatcher.emitTick();

      // TODO: While developing
      if (currentTickRef.current > lastInteractionTick.current + 200) {
        console.log('Game stopped');
        stopGameLoopLogic();
      }
    });
  }

  function stopGameLoopLogic() {
    if (stopGameLoopRef.current) {
      stopGameLoopRef.current();
      stopGameLoopRef.current = undefined;
    }
  }

  function actualizeMouseState(event: MouseEvent | React.MouseEvent) {
    lastInteractionTick.current = currentTickRef.current;

    if (modalModeRef.current) {
      return;
    }

    mousePos[0] = event.clientX;
    mousePos[1] = event.clientY;

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

        if (modalModeRef.current) {
          event.preventDefault();
          modalRef.current?.close();
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

    if (modalModeRef.current) {
      return;
    }

    mousePos[0] = event.clientX;
    mousePos[1] = event.clientY;

    mouseState.isMouseDown = true;
    mouseState.mouseDownPosition = [mousePos[0], mousePos[1]];
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

    if (modalModeRef.current) {
      modalRef.current?.close();
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
                const nearestCity = getNearestCity(gameState, cell);

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
                const bindCity = getFacilityBindedCity(gameState, fromFacility);

                addCityCarrierPaths(gameState, bindCity, [
                  {
                    assignedCityId: bindCity.cityId,
                    people: 1,
                    resourceType: action.resourceType,
                    path: {
                      from: fromFacility.position,
                      to: toFacility.position,
                    },
                  },
                ]);
                visualState.interactiveAction = undefined;
                visualState.onUpdate();
              }
            }
            break;
          }
        }
      } else {
        if (facility) {
          modalModeRef.current = {
            modeType: ModalModeType.FACILITY,
            facility,
          };
        } else {
          modalModeRef.current = undefined;
        }

        visualStateOnMouseMove(visualState, undefined);

        forceUpdate();
      }
    }
  }

  function closeModal() {
    modalModeRef.current = undefined;
    forceUpdate();
  }

  function onCityClick(city: City): void {
    visualStateMoveToCell(visualStateRef.current!, city.position);
  }

  function openGameMenu() {
    modalModeRef.current = {
      modeType: ModalModeType.GAME_MENU,
    };

    stopGameLoopLogic();

    forceUpdate();
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
                modalModeRef.current = {
                  modeType: ModalModeType.RESEARCH,
                };
                forceUpdate();
              }}
            />
          </div>

          {visualStateRef.current && (
            <>
              <StatusText visualState={visualStateRef.current} />
              {modalModeRef.current && (
                <>
                  <div
                    className={cn(styles.modalShadow, {
                      [styles.modalShadowFade]:
                        modalModeRef.current.modeType ===
                        ModalModeType.GAME_MENU,
                    })}
                    onClick={() => {
                      modalRef.current?.close();
                    }}
                  />
                  <div className={styles.modalWrapper}>
                    {(() => {
                      switch (modalModeRef.current.modeType) {
                        case ModalModeType.FACILITY:
                          return (
                            <FacilityModal
                              modalRef={modalRef}
                              gameState={gameState}
                              visualState={visualStateRef.current}
                              facility={modalModeRef.current.facility}
                              onClose={closeModal}
                            />
                          );
                        case ModalModeType.RESEARCH:
                          return (
                            <ResearchModal
                              modalRef={modalRef}
                              gameState={gameState}
                              onStartResearchClick={(research) => {
                                gameState.currentResearchId =
                                  research.researchId;
                                closeModal();
                                forceUpdate();
                              }}
                              onClose={closeModal}
                            />
                          );
                        case ModalModeType.GAME_MENU:
                          return (
                            <GameMenu
                              currentGameId={gameId}
                              onResume={() => {
                                startGameLoopLogic();
                                closeModal();
                              }}
                              onLoadGame={({ gameId, saveName }) => {
                                if (gameState.gameId !== gameId) {
                                  setHash(`/g/${gameId}`, { replace: true });
                                } else {
                                  const newGameState = loadGame(
                                    gameId,
                                    saveName,
                                  );
                                  visualStateRef.current!.gameState =
                                    newGameState;
                                  setGameState(newGameState);
                                  renderGameToCanvas(visualStateRef.current!);
                                }

                                startGameLoopLogic();
                                closeModal();
                              }}
                              onSaveGame={({ saveName }) => {
                                saveGame(gameState, saveName);
                                startGameLoopLogic();
                                closeModal();
                              }}
                              onExit={() => {
                                saveGame(gameState, undefined);
                                location.hash = '';
                              }}
                            />
                          );
                        default:
                          throw neverCall(modalModeRef.current);
                      }
                    })()}
                  </div>
                </>
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
