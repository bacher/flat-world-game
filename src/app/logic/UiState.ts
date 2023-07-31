import { RefObject } from 'react';
import clamp from 'lodash/clamp';

import { ModalMode, ModalModeType, UiUpdateType } from '@/app/logic/types';
import {
  CanvasParams,
  createVisualState,
  InteractiveActionType,
  isAllowToConstructAtPosition,
  lookupGridByPoint,
  startGameLoop,
  VisualState,
  visualStateApplyViewportState,
  visualStateGetViewportState,
  visualStateOnMouseMove,
  visualStateUpdateScale,
} from '@/game/visualState';
import {
  CarrierPathType,
  Facility,
  FacilityType,
  GameState,
  Point,
  ProductVariantId,
} from '@/game/types';
import { loadGame, saveGame } from '@/game/gameStatePersist';
import { ModalRef } from '@/app/modals/types';
import {
  addCarrierPath,
  addCity,
  addConstructionStructure,
  getChunkByCell,
  getFacilityBindedCity,
} from '@/game/gameState';
import {
  depositToProductVariant,
  facilitiesIterationInfo,
} from '@/game/facilities';
import {
  isValidCarrierPlanningTarget,
  renderGameToCanvas,
} from '@/gameRender/render';
import { isSameCellPoints } from '@/game/helpers';
import { INTERACTION_MIN_SCALE } from '@/game/consts';

type Callback = () => void;

const MINIMUM_SCALE = 0.01;
const MAXIMUM_SCALE = 1.5;
const AUTOSAVE_EVERY = 60 * 1000;

const allUpdateTypes: UiUpdateType[] = [
  UiUpdateType.MODAL,
  UiUpdateType.RESEARCH,
  UiUpdateType.CANVAS,
];

export class UiState {
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
  private requestAnimationId: number | undefined;
  private autoSaveIntervalId: number | undefined;

  constructor({
    gameId,
    ctx,
    canvasParams,
    mousePosition,
  }: {
    gameId: string;
    ctx: CanvasRenderingContext2D;
    canvasParams: CanvasParams;
    mousePosition: Point;
  }) {
    const { gameState, viewportState } = loadGame(gameId, undefined);

    const visualState = createVisualState(gameState, ctx, canvasParams, () => {
      this.onUpdate([UiUpdateType.CANVAS, UiUpdateType.MODAL]);
    });

    visualStateApplyViewportState(visualState, viewportState);
    visualStateOnMouseMove(visualState, mousePosition);

    this.visualState = visualState;
    this.gameState = visualState.gameState;

    // TODO: Debug
    (window as any).visualState = this.visualState;
    (window as any).gameState = this.gameState;
  }

  renderCanvas() {
    renderGameToCanvas(this.visualState);
  }

  replaceGameState(gameState: GameState): void {
    this.gameState = gameState;
    this.visualState.gameState = gameState;

    // TODO: Debug
    (window as any).gameState = this.gameState;

    this.onUpdate(UiUpdateType.CANVAS);
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
    this.autoSaveGame();

    const { gameState, viewportState } = loadGame(gameId, saveName);

    this.replaceGameState(gameState);
    visualStateApplyViewportState(this.visualState, viewportState);
    this.onUpdate();
  }

  autoSaveGame(): void {
    saveGame(
      this.gameState,
      visualStateGetViewportState(this.visualState),
      undefined,
    );
  }

  saveGameAs({ saveName }: { saveName: string }): void {
    saveGame(
      this.gameState,
      visualStateGetViewportState(this.visualState),
      saveName,
    );
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

      // TODO: While developing
      if (this.currentTick > this.lastInteractionTick + 200) {
        console.log('Game stopped');
        this.stopGameLoop();
      }
    });

    this.enableAutoSave();
  }

  stopGameLoop() {
    if (this.stopGameLoopCallback) {
      this.stopGameLoopCallback();
      this.stopGameLoopCallback = undefined;
      this.isInGameLoop = false;

      this.disableAutoSave();
      this.autoSaveGame();
    }
  }

  enableAutoSave() {
    if (!this.autoSaveIntervalId) {
      this.autoSaveIntervalId = window.setInterval(() => {
        this.autoSaveGame();
      }, AUTOSAVE_EVERY);
    }
  }

  disableAutoSave() {
    window.clearInterval(this.autoSaveIntervalId);
    this.autoSaveIntervalId = undefined;
  }

  markUserActivity(): void {
    this.lastInteractionTick = this.currentTick;
  }

  handleCanvasClick(position: Point): void {
    const { visualState, gameState } = this;

    const cell = lookupGridByPoint(visualState, position);

    if (!cell) {
      return;
    }

    const facility = gameState.structuresByCellId.get(cell.cellId);

    if (
      visualState.interactiveAction &&
      visualState.scale >= INTERACTION_MIN_SCALE
    ) {
      switch (visualState.interactiveAction.actionType) {
        case InteractiveActionType.CONSTRUCTION_PLANNING: {
          const isAllow = isAllowToConstructAtPosition(visualState, cell);

          if (isAllow) {
            const { facilityType } = visualState.interactiveAction;

            if (facilityType === FacilityType.CITY) {
              addCity(gameState, { position: cell });
            } else {
              if (
                facilityType === FacilityType.INTERCITY_SENDER ||
                facilityType === FacilityType.INTERCITY_RECEIVER
              ) {
                this.openModal({
                  modeType: ModalModeType.RESOURCE_CHOOSE,
                  facilityType,
                  position: cell,
                });
              } else {
                const facilityInfo = facilitiesIterationInfo[facilityType];

                if (facilityType === FacilityType.QUARRY) {
                  const chunk = getChunkByCell(gameState.worldParams, cell);
                  const depositType = gameState.depositsMapCache
                    .get(chunk.chunkId)!
                    .map.get(cell.cellId);

                  if (!depositType) {
                    return;
                  }

                  const variantId = depositToProductVariant[depositType];
                  if (!variantId) {
                    return;
                  }

                  const unlockedVariants =
                    gameState.unlockedProductionVariants.get(facilityType);
                  if (!unlockedVariants || !unlockedVariants.has(variantId)) {
                    return;
                  }

                  addConstructionStructure(gameState, {
                    facilityType,
                    position: cell,
                    productionVariantId: variantId,
                  });
                } else if (
                  facilityInfo.productionVariants.length > 1 ||
                  (facilityInfo.productionVariants[0].id !==
                    ProductVariantId.BASIC &&
                    !gameState.unlockedProductionVariants
                      .get(facilityType)
                      ?.has(facilityInfo.productionVariants[0].id))
                ) {
                  this.openModal({
                    modeType: ModalModeType.PRODUCTION_VARIANT_CHOOSE,
                    facilityType,
                    position: cell,
                  });
                } else {
                  addConstructionStructure(gameState, {
                    facilityType,
                    position: cell,
                    productionVariantId: facilityInfo.productionVariants[0].id,
                  });
                }
              }
            }

            visualState.interactiveAction = undefined;
            visualState.onUpdate();
          }
          break;
        }
        case InteractiveActionType.CARRIER_PATH_PLANNING: {
          const facility = gameState.structuresByCellId.get(cell.cellId);

          if (
            facility &&
            isValidCarrierPlanningTarget(
              visualState,
              facility,
              visualState.interactiveAction,
            )
          ) {
            const originFacility = gameState.structuresByCellId.get(
              visualState.interactiveAction.cell.cellId,
            ) as Facility;

            const action = visualState.interactiveAction;
            const { direction } = action;

            const fromFacility =
              direction === 'from' ? originFacility : facility;
            const toFacility = direction === 'from' ? facility : originFacility;

            const alreadyCarrierPaths = gameState.carrierPathsFromCellId.get(
              fromFacility.position.cellId,
            );

            if (
              alreadyCarrierPaths &&
              alreadyCarrierPaths.some(
                (path) =>
                  path.resourceType === action.resourceType &&
                  isSameCellPoints(path.path.from, fromFacility.position) &&
                  isSameCellPoints(path.path.to, toFacility.position),
              )
            ) {
              console.log('already path, do nothing');
            } else {
              const bindCity = getFacilityBindedCity(gameState, fromFacility);

              addCarrierPath(gameState, {
                assignedCityId: bindCity.cityId,
                people: 1,
                resourceType: action.resourceType,
                pathType: CarrierPathType.EXPLICIT,
                path: {
                  from: fromFacility.position,
                  to: toFacility.position,
                },
              });
              visualState.interactiveAction = undefined;
              visualState.onUpdate();
            }
          }
          break;
        }
      }
    } else {
      if (facility) {
        this.openModal({
          modeType: ModalModeType.FACILITY,
          facility,
        });
      } else {
        this.forceCloseCurrentModal();
      }

      visualStateOnMouseMove(visualState, undefined);

      // TODO: Only canvas?
      this.onUpdate(UiUpdateType.CANVAS);
    }
  }

  onCanvasZoom(delta: number): void {
    const scale = clamp(
      this.visualState.scale * (1 - delta / 100),
      MINIMUM_SCALE,
      MAXIMUM_SCALE,
    );
    visualStateUpdateScale(this.visualState, scale);
  }

  cancelCurrentAction(): boolean {
    if (this.modalState) {
      this.askToCloseCurrentModal();
      return true;
    }

    if (this.visualState.interactiveAction) {
      this.visualState.interactiveAction = undefined;
      this.visualState.onUpdate();
      return true;
    }

    return false;
  }

  onUpdate(updateType?: UiUpdateType | UiUpdateType[]): void {
    const updateTypes = Array.isArray(updateType)
      ? updateType
      : updateType
      ? [updateType]
      : allUpdateTypes;

    const alreadyCalled = new Set<Callback>();

    for (const type of updateTypes) {
      if (type === UiUpdateType.CANVAS && !this.requestAnimationId) {
        this.requestAnimationId = window.requestAnimationFrame(() => {
          this.requestAnimationId = undefined;
          this.renderCanvas();
        });
      }

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
