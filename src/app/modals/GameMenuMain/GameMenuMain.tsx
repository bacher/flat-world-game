import { useMemo } from 'react';

import styles from './GameMenuMain.module.scss';

type Props = {
  onResume: () => void;
  onLoadClick: () => void;
  onSaveClick: () => void;
  onExitClick: () => void;
};

export function GameMenuMain({
  onResume,
  onLoadClick,
  onSaveClick,
  onExitClick,
}: Props) {
  const menuItems = useMemo(
    () => [
      { text: 'Resume', action: onResume },
      { text: 'Load game', action: onLoadClick },
      { text: 'Save game', action: onSaveClick },
      { text: 'To main menu', action: onExitClick },
    ],
    [],
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.menuHeader}>
        <h2 className={styles.menuTitle}>Flat World</h2>
        <div className={styles.menuSubTitle}>Game menu</div>
      </div>
      <nav>
        <ul className={styles.menuList}>
          {menuItems.map(({ text, action }, index) => (
            <li key={index}>
              <button
                type="button"
                className={styles.menuButton}
                onClick={action}
              >
                {text}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
