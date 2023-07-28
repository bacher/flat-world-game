import { ReactNode, useRef } from 'react';
import cn from 'classnames';

import type { ResearchId } from '@/game/types';
import { researches, researchTranslations } from '@/game/research';
import { UiState } from '@/app/logic/UiState';
import { ModalModeType, UiUpdateType } from '@/app/logic/types';
import { useUiUpdate } from '@/app/logic/hook.ts';

import styles from './CurrentResearchIcon.module.scss';

type Props = {
  uiState: UiState;
};

export function CurrentResearchIcon({ uiState }: Props) {
  const { gameState } = uiState;

  useUiUpdate(uiState, UiUpdateType.CANVAS);

  const lastResearchRef = useRef<ResearchId | undefined>();
  if (gameState.currentResearchId) {
    lastResearchRef.current = gameState.currentResearchId;
  }

  let content: ReactNode;
  let additionalClassName: string | undefined;

  if (gameState.currentResearchId) {
    const researchInfo = researches[gameState.currentResearchId];
    const researchPoints =
      gameState.inProgressResearches.get(gameState.currentResearchId)?.points ??
      0;

    content = (
      <>
        <span className={styles.researchTitle}>
          {researchTranslations[gameState.currentResearchId]}
        </span>
        <span className={styles.researchProgress}>
          {(
            Math.floor((researchPoints * 1000) / researchInfo.points) / 10
          ).toFixed(1)}
          %
        </span>
      </>
    );
  } else if (
    lastResearchRef.current &&
    gameState.completedResearches.has(lastResearchRef.current)
  ) {
    additionalClassName = styles.buttonDone;
    content = (
      <span className={styles.researchTitle}>
        {researchTranslations[lastResearchRef.current]}
      </span>
    );
  } else {
    content = (
      <>
        <span className={styles.researchTitle}>Research</span>
        <span>is not set</span>
      </>
    );
  }

  return (
    <button
      className={cn(styles.button, additionalClassName)}
      type="button"
      onClick={() => {
        uiState.openModal({
          modeType: ModalModeType.RESEARCH,
        });
      }}
    >
      {content}
    </button>
  );
}
