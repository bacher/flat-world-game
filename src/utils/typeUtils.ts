export function neverCall(_: never, silence?: boolean): any {
  if (!silence) {
    throw new Error('Invariant');
  }
}

declare const brand: unique symbol;

export type Branded<T, Brand> = T & { [brand]: Brand };
