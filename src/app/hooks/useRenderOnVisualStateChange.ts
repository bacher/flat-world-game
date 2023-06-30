import { useForceUpdate } from './forceUpdate';
import { useVisualStateChange } from './useVisualStateChange';

export function useRenderOnVisualStateChange(): void {
  const forceUpdate = useForceUpdate();
  useVisualStateChange(forceUpdate);
}
