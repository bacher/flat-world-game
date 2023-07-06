// @ts-expect-error
export function neverCall(x: never, silence?: boolean) {
  if (!silence) {
    throw new Error('Invariant');
  }
}

declare const brand: unique symbol;

export type Branded<T, Brand> = T & { [brand]: Brand };
