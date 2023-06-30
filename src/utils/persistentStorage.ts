type Param = string | number;

const PERSISTANCE_PREFIX = 'fw.';

function persistenceSystemRead(item: string): any | undefined {
  const value = window.localStorage.getItem(`${PERSISTANCE_PREFIX}${item}`);

  if (value) {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error('Invalid persistente value format', error);
    }
  }

  return undefined;
}

function persistenceSystemWrite(item: string, value: any): void {
  window.localStorage.setItem(
    `${PERSISTANCE_PREFIX}${item}`,
    JSON.stringify(value),
  );
}

function persistenceSystemClear(item: string): void {
  window.localStorage.removeItem(`${PERSISTANCE_PREFIX}${item}`);
}

export function makePersistanceStorageItem<T>(item: string) {
  return {
    get: (): T | undefined => {
      return persistenceSystemRead(item);
    },
    set: (value: T): void => {
      persistenceSystemWrite(item, value);
    },
    clear: (): void => {
      persistenceSystemClear(item);
    },
  };
}

export function makePersistanceParameterizedStorageItem<T>(item: string) {
  return {
    get: (param: Param): T | undefined => {
      return persistenceSystemRead(`${item}[${param}]`);
    },
    set: (param: Param, value: T): void => {
      persistenceSystemWrite(`${item}[${param}]`, value);
    },
    clear: (param: Param): void => {
      persistenceSystemClear(`${item}[${param}]`);
    },
  };
}
