import { useMemo } from 'react';

import { CarrierPath, Structure } from '@/game/types';
import { InteractiveActionType, VisualState } from '@/game/visualState';
import { ResourceType } from '@/game/resources';

export type ActualPathState = Map<
  ResourceType,
  {
    path: CarrierPath;
    inputValue: string;
    changed: boolean;
  }[]
>;

export function useAlreadyPathsState({
  availableResources,
  actualPaths,
}: {
  availableResources: ResourceType[];
  actualPaths: CarrierPath[] | undefined;
}): ActualPathState {
  return useMemo(() => {
    const state = new Map();

    for (const resourceType of availableResources) {
      state.set(resourceType, []);
    }

    if (actualPaths) {
      for (const actualPath of actualPaths) {
        let alreadyPaths = state.get(actualPath.resourceType);
        if (!alreadyPaths) {
          alreadyPaths = [];
          state.set(actualPath.resourceType, alreadyPaths);
        }

        alreadyPaths.push({
          path: actualPath,
          inputValue: actualPath.people.toString(),
          changed: false,
        });
      }
    }

    return state;
  }, []);
}

export function addPath(
  visualState: VisualState,
  facility: Structure,
  direction: 'from' | 'to',
  resourceType: ResourceType,
): void {
  visualState.interactiveAction = {
    actionType: InteractiveActionType.CARRIER_PATH_PLANNING,
    cell: facility.position,
    direction,
    resourceType,
  };
  visualState.onUpdate();
}
