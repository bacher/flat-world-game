import { UiState } from '@/app/logic/UiState';
import { visualStateMoveToCell } from '@/game/visualState';
import { UiUpdateType } from '@/app/logic/types.ts';
import { useUiUpdate } from '@/app/logic/hook.ts';

type Props = {
  uiState: UiState;
};

export function CitiesPanel({ uiState }: Props) {
  const { visualState, gameState } = uiState;

  useUiUpdate(uiState, UiUpdateType.CANVAS);

  const citiesList = [...gameState.cities.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <div>
      <h2>Cities:</h2>
      <ul>
        {citiesList.map((city) => (
          <li key={city.cityId}>
            <button
              type="button"
              onClick={() => {
                visualStateMoveToCell(visualState, city.position);
              }}
            >
              {city.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
