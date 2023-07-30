import { useRef } from 'react';
import cn from 'classnames';

import styles from './ModalsWrapper.module.scss';
import { UiState } from '@/app/logic/UiState';
import { ModalModeType, UiUpdateType } from '@/app/logic/types';
import { neverCall } from '@/utils/typeUtils';
import { ModalRef } from '@/app/modals/types';
import { FacilityModal } from '@/app/modals/FacilityModal';
import { ResearchModal } from '@/app/modals/ResearchModal';
import { GameMenu } from '@/app/modals/GameMenu';
import { ProductionVariantModal } from '@/app/modals/ProductionVariantModal';
import { ResourceChooseModal } from '@/app/modals/ResourceChooseModal';
import { useUiUpdate } from '@/app/logic/hook';
import { setHash } from '@/utils/url';
import { addConstructionStructure } from '@/game/gameState';

type Props = {
  uiState: UiState;
};

export function ModalsWrapper({ uiState }: Props) {
  const { visualState, gameState, modalState } = uiState;
  const { gameId } = gameState;

  useUiUpdate(uiState, UiUpdateType.MODAL);

  const modalRef = useRef<ModalRef>(null);
  uiState.modalRef = modalRef;

  if (!modalState) {
    return null;
  }

  function closeModal() {
    uiState.forceCloseCurrentModal();
  }

  return (
    <>
      <div
        className={cn(styles.modalShadow, {
          [styles.modalShadowFade]:
            modalState.modeType === ModalModeType.GAME_MENU,
        })}
        onClick={() => {
          modalRef.current?.close();
        }}
      />
      <div className={styles.modalWrapper}>
        {(() => {
          switch (modalState.modeType) {
            case ModalModeType.FACILITY:
              return (
                <FacilityModal
                  modalRef={modalRef}
                  uiState={uiState}
                  facility={modalState.facility}
                  onClose={closeModal}
                />
              );
            case ModalModeType.RESEARCH:
              return (
                <ResearchModal
                  modalRef={modalRef}
                  uiState={uiState}
                  onStartResearchClick={(research) => {
                    gameState.currentResearchId = research.researchId;
                    uiState.onUpdate(UiUpdateType.RESEARCH);
                    closeModal();
                  }}
                  onClose={closeModal}
                />
              );
            case ModalModeType.GAME_MENU:
              return (
                <GameMenu
                  currentGameId={gameId}
                  onResume={() => {
                    uiState.startGameLoop();
                    closeModal();
                  }}
                  onLoadGame={({ gameId, saveName }) => {
                    if (gameState.gameId !== gameId) {
                      setHash(`/g/${gameId}`, { replace: true });
                    } else {
                      uiState.loadGame(gameId, saveName);
                    }

                    uiState.startGameLoop();
                    closeModal();
                  }}
                  onSaveGame={({ saveName }) => {
                    uiState.saveGameAs({ saveName });
                    uiState.startGameLoop();
                    closeModal();
                  }}
                  onExit={() => {
                    location.hash = '';
                  }}
                />
              );
            case ModalModeType.PRODUCTION_VARIANT_CHOOSE: {
              const { facilityType, position } = modalState;

              return (
                <ProductionVariantModal
                  uiState={uiState}
                  facilityType={facilityType}
                  onClose={closeModal}
                  onProductionVariantChoose={(productionVariantId) => {
                    closeModal();
                    addConstructionStructure(gameState, {
                      facilityType,
                      position,
                      productionVariantId,
                    });
                    visualState.onUpdate();
                  }}
                />
              );
            }
            case ModalModeType.RESOURCE_CHOOSE: {
              const { facilityType, position } = modalState;

              return (
                <ResourceChooseModal
                  uiState={uiState}
                  onClose={closeModal}
                  onResourceTypeChoose={(resourceType) => {
                    closeModal();
                    addConstructionStructure(gameState, {
                      facilityType,
                      position,
                      productionVariantId: resourceType,
                    });
                    visualState.onUpdate();
                  }}
                />
              );
            }
            default:
              throw neverCall(modalState);
          }
        })()}
      </div>
    </>
  );
}
