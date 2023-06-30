const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateNewRandomId(): string {
  const id = [];
  for (let i = 0; i < 12; i += 1) {
    id.push(ALPHABET.at(Math.floor(Math.random() * ALPHABET.length)));
  }
  return id.join('');
}
