import type { City, GameState } from '../../../game/gameState';
import { useRenderOnGameTick } from '../../hooks/useRenderOnGameTick';

type Props = {
  gameState: GameState;
  onCityClick: (city: City) => void;
};

export function CitiesPanel({ gameState, onCityClick }: Props) {
  useRenderOnGameTick();

  const citiesList = [...gameState.cities.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <div>
      <h2>Cities</h2>
      <ul>
        {citiesList.map((city) => (
          <li key={city.cityId}>
            <button
              type="button"
              onClick={() => {
                onCityClick(city);
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
