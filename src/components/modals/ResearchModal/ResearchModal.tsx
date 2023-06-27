import { RefObject, useImperativeHandle, useState } from 'react';
import cn from 'classnames';

import { ModalRef } from '../types';

import styles from './ResearchModal.module.scss';
import {
  Research,
  researchTranslations,
  researches,
} from '../../../game/research';
import type { GameState } from '../../../game/gameState';
import { useRenderOnGameTick } from '../../hooks/useRenderOnGameTick';

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
          <li key={research.researchId}>
            <button
              type="button"
              className={cn(styles.researchItem, {
                [styles.researchItemAvailable]:
                  status === ResearchStatus.AVAILABLE,
                [styles.researchItemBlocked]: status === ResearchStatus.BLOCKED,
                [styles.researchItemCompleted]:
                  status === ResearchStatus.COMPLETED,
                [styles.researchItemInProgress]:
                  status === ResearchStatus.IN_PROGRESS,
              })}
              onClick={() => {
                if (status === ResearchStatus.AVAILABLE) {
                  onStartResearchClick(research);
                }
              }}
            >
              <h3>{researchTranslations[research.researchId]}</h3>
              {research.requires.length > 0 && (
                <>
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
                </>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
