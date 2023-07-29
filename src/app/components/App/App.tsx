import styles from './App.module.scss';
import { GameRoot } from '@components/GameRoot';

export function App() {
  return (
    <div className={styles.root}>
      <GameRoot />
    </div>
  );
}
