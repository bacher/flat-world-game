import { RefObject, useImperativeHandle, useState } from 'react';
import cn from 'classnames';

import styles from './ResearchModal.module.scss';

import type { GameState, Research } from '@/game/types';
import { researchTranslations, researches } from '@/game/research';
import { facilitiesDescription } from '@/game/facilities';

import { useRenderOnGameTick } from '@hooks/useRenderOnGameTick';

import { ModalRef } from '../types';
import { ModalCloseButton } from '../ModalCloseButton';

// Enum should stay numerical because of sorting
enum ResearchStatus {
  COMPLETED,
  IN_PROGRESS,
  AVAILABLE,
  BLOCKED,
}

type Props = {
  modalRef: RefObject<ModalRef>;
  gameState: GameState;
  onStartResearchClick: (research: Research) => void;
  onClose: () => void;
};

export function ResearchModal({
  modalRef,
  gameState,
  onStartResearchClick,
  onClose,
}: Props) {
  useRenderOnGameTick();

  useImperativeHandle(modalRef, () => ({
    close: onClose,
  }));

  const [isShowCompleted, setIsShowCompleted] = useState(false);

  const { completedResearches, currentResearchId } = gameState;

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
                <h4>Unlocks:</h4>
                {research.unlockFacilities.length ? (
                  <ul>
                    {research.unlockFacilities.map((facilityType) => (
                      <li key={facilityType}>
                        {facilitiesDescription[facilityType]}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span>Nothing</span>
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
