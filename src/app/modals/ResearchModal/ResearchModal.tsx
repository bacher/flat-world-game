import { RefObject, useImperativeHandle, useState } from 'react';
import cn from 'classnames';

import styles from './ResearchModal.module.scss';

import { type Research, ExactFacilityType } from '@/game/types';
import { researchTranslations, researches } from '@/game/research';
import {
  facilitiesDescription,
  productVariantsTranslations,
} from '@/game/facilities';

import type { ModalRef } from '../types';
import { ModalCloseButton } from '../ModalCloseButton';
import { useUiUpdate } from '@/app/logic/hook';
import { UiUpdateType } from '@/app/logic/types';
import { UiState } from '@/app/logic/UiState';

// Enum should stay numerical because of sorting
enum ResearchStatus {
  COMPLETED,
  IN_PROGRESS,
  AVAILABLE,
  BLOCKED,
}

type Props = {
  modalRef: RefObject<ModalRef>;
  uiState: UiState;
  onStartResearchClick: (research: Research) => void;
  onClose: () => void;
};

export function ResearchModal({
  modalRef,
  uiState,
  onStartResearchClick,
  onClose,
}: Props) {
  useUiUpdate(uiState, UiUpdateType.CANVAS);

  useImperativeHandle(modalRef, () => ({
    close: onClose,
  }));

  const [isShowCompleted, setIsShowCompleted] = useState(false);

  const { completedResearches, currentResearchId } = uiState.gameState;

  let extendedResearches = Object.values(researches).map((research) => {
    let status: ResearchStatus;

    if (completedResearches.has(research.researchId)) {
      status = ResearchStatus.COMPLETED;
    } else if (currentResearchId && research.researchId === currentResearchId) {
      status = ResearchStatus.IN_PROGRESS;
    } else if (
      research.requires.some(
        (researchId) => !completedResearches.has(researchId),
      )
    ) {
      status = ResearchStatus.BLOCKED;
    } else {
      status = ResearchStatus.AVAILABLE;
    }

    return {
      research,
      status,
    };
  });

  if (!isShowCompleted) {
    extendedResearches = extendedResearches.filter(
      (research) => research.status !== ResearchStatus.COMPLETED,
    );
  }

  extendedResearches.sort(
    (research1, research2) => research1.status - research2.status,
  );

  return (
    <div className={styles.modal}>
      <h2>Researches</h2>
      <div className={styles.panel}>
        <label className={styles.panelElement}>
          <input
            type="checkbox"
            checked={isShowCompleted}
            onChange={(event) => {
              setIsShowCompleted(event.target.checked);
            }}
          />{' '}
          Show completed
        </label>
      </div>
      <ul className={styles.researchList}>
        {extendedResearches.map(({ research, status }) => (
          <li key={research.researchId} className={styles.researchItem}>
            <button
              type="button"
              className={cn(styles.researchButton, {
                [styles.researchButtonAvailable]:
                  status === ResearchStatus.AVAILABLE,
                [styles.researchButtonBlocked]:
                  status === ResearchStatus.BLOCKED,
                [styles.researchButtonCompleted]:
                  status === ResearchStatus.COMPLETED,
                [styles.researchButtonInProgress]:
                  status === ResearchStatus.IN_PROGRESS,
              })}
              onClick={() => {
                if (status === ResearchStatus.AVAILABLE) {
                  onStartResearchClick(research);
                }
              }}
            >
              <div className={styles.researchHeader}>
                <h3 className={styles.researchTitle}>
                  {researchTranslations[research.researchId]}
                </h3>
                <span className={styles.researchCost}>
                  Cost: {research.points}
                </span>
              </div>
              <div className={styles.block}>
                {research.unlockFacilities.length > 0 && (
                  <div>
                    <h4>Unlocks:</h4>
                    <ul>
                      {research.unlockFacilities.map((facilityType) => (
                        <li key={facilityType}>
                          {facilitiesDescription[facilityType]}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {research.unlockProductionVariants && (
                  <div>
                    <h4>Unlock recipes:</h4>
                    <ul>
                      {Object.entries(research.unlockProductionVariants).map(
                        ([facilityType, variants]) => (
                          <li key={facilityType}>
                            {
                              facilitiesDescription[
                                facilityType as ExactFacilityType
                              ]
                            }
                            {': '}
                            {variants
                              .map(
                                (variantId) =>
                                  productVariantsTranslations[variantId],
                              )
                              .join(', ')}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}
              </div>
              {status !== ResearchStatus.COMPLETED &&
                research.requires.length > 0 && (
                  <div className={styles.block}>
                    <h4>Requirements:</h4>
                    <ul>
                      {research.requires.map((researchId) => (
                        <li key={researchId}>
                          <span
                            className={cn({
                              [styles.completed]:
                                completedResearches.has(researchId),
                            })}
                          >
                            {researchTranslations[researchId]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </button>
          </li>
        ))}
      </ul>
      <ModalCloseButton onClick={onClose} />
    </div>
  );
}
