import { useForceUpdate } from './forceUpdate';
import { useGameTick } from './useGameTick';

export function useRenderOnGameTick(): void {
  const forceUpdate = useForceUpdate();
  useGameTick(forceUpdate);
}
