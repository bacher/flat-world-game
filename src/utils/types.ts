export function neverCall(x: never) {
  throw new Error('Invariant');
}
