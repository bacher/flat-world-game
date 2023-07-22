import {
  makePersistanceStorageItem,
  makePersistanceParameterizedStorageItem,
} from '@/utils/persistentStorage';

import type { GameSave } from './types';

export const gameStateStorage =
  makePersistanceParameterizedStorageItem<GameSave>('game');

type GameMeta = {
  gameId: string;
  gameName: string;
  snapshotCreatedAt: number | undefined;
  lastSnapshotCreatedAt: number;
  saves: GameSaveMeta[];
};

type GameSaveMeta = {
  saveName: string;
  snapshotCreatedAt: number;
};

export type GamesListStorageItem = {
  games: GameMeta[];
};

export const gamesListStorage =
  makePersistanceStorageItem<GamesListStorageItem>('gamesList');
