import sample from 'lodash/sample';

const first = [
  'Scarlet',
  'Red',
  'New',
  'Old',
  'Blue',
  'Last',
  'Green',
  'Solid',
  'Sunny',
  'Rainy',
  'Ill',
  'Sick',
  'Lucky',
];

const second = [
  'River',
  'Lake',
  'Mist',
  'Cape',
  'Fist',
  'Room',
  'Tree',
  'Rock',
  'Horn',
  'Pickaxe',
  'Coin',
];

const threshold = (first.length * second.length) / 2;

export function generateNewCityName(
  alreadyCityNames: Set<string>,
  addInAlreadyList?: boolean,
): string {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const cityName = `${sample(first)} ${sample(second)}`;

    if (!alreadyCityNames.has(cityName)) {
      if (addInAlreadyList) {
        alreadyCityNames.add(cityName);
      }
      return cityName;
    }

    if (alreadyCityNames.size > threshold) {
      for (let i = 2; ; i += 1) {
        const iterated = `${cityName} ${i}`;

        if (!alreadyCityNames.has(iterated)) {
          if (addInAlreadyList) {
            alreadyCityNames.add(cityName);
          }
          return iterated;
        }
      }
    }
  }
}
