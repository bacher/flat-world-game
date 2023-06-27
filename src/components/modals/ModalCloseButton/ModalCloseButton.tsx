import styles from './ModalCloseButton.module.scss';

type Props = {
  onClick: () => void;
};

export function ModalCloseButton({ onClick }: Props) {
  return (
    <button
      type="button"
      className={styles.closeButton}
      title="close"
      onClick={onClick}
    >
      x
    </button>
  );
}
