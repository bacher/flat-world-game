import type { RefObject } from 'react';

export type ModalControl = {
  applyChanges: () => void;
};

export type ModalControlRef = RefObject<ModalControl | undefined>;
