import type { City } from '@/game/types';

export function CityContent({ city }: { city: City }) {
  return (
    <div>
      <h2>City: {city.name}</h2>
      <div>People moving speed: {city.peopleDayPerCell}</div>
      <div>People carrying weight: {city.weightPerPeopleDay}</div>
      <div>People working modificator: {city.peopleWorkModifier}</div>
    </div>
  );
}
