import sample from 'lodash/sample';

import { generateNewCityName } from './cityNameGenerator';
import type { CellPosition } from './types';

export type GameState = {
  cities: Extract<Facility, { type: FacilityType.CITY }>[];
  facilitiesByCityId: Record<CityId, Facility[]>;
};

export type CityId = string;

export enum FacilityType {
  CITY,
  LAMBERT,
  BUILDING,
  CHOP_WOOD,
}

export type CellPath = {
  from: CellPosition;
  to: CellPosition;
};

export enum ResourceType {
  LOG,
}

export type StorageItem = {
  resourceType: ResourceType;
  quantity: number;
};

export type CarrierPath = {
  path: CellPath;
  people: number;
  resourceType: ResourceType;
};

export type Facility = {
  position: CellPosition;
  input: StorageItem[];
  output: StorageItem[];
} & (
  | {
      cityId: CityId;
      type: FacilityType.CITY;
      name: string;
      popularity: number;
      carrierPaths: CarrierPath[];
      workingPaths: { path: CellPath; people: number }[];
    }
  | {
      type: FacilityType.BUILDING;
      buildingFacilityType: Exclude<
        FacilityType,
        FacilityType.CITY | FacilityType.BUILDING
      >;
      buildingStage: number;
      buildingTime: number;
    }
  | {
      type: FacilityType.LAMBERT;
    }
  | {
      type: FacilityType.CHOP_WOOD;
    }
);

export function startGame(): GameState {
  const alreadyCityNames = new Set<string>();

  return {
    cities: [
      {
        cityId: 'abc',
        type: FacilityType.CITY,
        name: generateNewCityName(alreadyCityNames, true),
        position: [0, 0],
        popularity: 3,
        carrierPaths: [
          {
            path: { from: [-2, -3], to: [3, -3] },
            resourceType: ResourceType.LOG,
            people: 4,
          },
        ],
        workingPaths: [],
        input: [],
        output: [],
      },
    ],
    facilitiesByCityId: {
      abc: [
        {
          type: FacilityType.BUILDING,
          position: [-2, -3],
          buildingFacilityType: FacilityType.LAMBERT,
          buildingStage: 0,
          buildingTime: 4,
          input: [],
          output: [],
        },
        {
          type: FacilityType.CHOP_WOOD,
          position: [3, -3],
          input: [],
          output: [],
        },
      ],
    },
  };
}

const MAX_BUILDING_PEOPLE = 4;

type JobObject =
  | { type: 'facility'; facility: Facility }
  | {
      type: 'carrier';
      carrierPath: CarrierPath;
      fromFacility: Facility;
      toFacility: Facility;
    };

export function tick(gameState: GameState): void {
  for (const city of gameState.cities) {
    const facilities = gameState.facilitiesByCityId[city.cityId];

    //        [temp, current, maximum, facility]
    let jobs: [number, number, number, JobObject][] = [];
    let needPeople = 0;
    let maxRatio = -Infinity;

    function registerJob(item: JobObject, count: number): void {
      const nextRatio = (count - 1) / count;
      jobs.push([nextRatio, count, count, item]);
      needPeople += count;

      if (nextRatio > maxRatio) {
        maxRatio = nextRatio;
      }
    }

    for (const facility of facilities) {
      switch (facility.type) {
        case FacilityType.BUILDING:
          registerJob({ type: 'facility', facility }, MAX_BUILDING_PEOPLE);
          break;
        case FacilityType.LAMBERT:
          if (getCountOf(facility.output, ResourceType.LOG) < 4) {
            registerJob({ type: 'facility', facility }, 4);
          }
          break;
      }
    }

    for (const carrierPath of city.carrierPaths) {
      const fromFacility = facilities.find((facility) =>
        isSamePos(facility.position, carrierPath.path.from),
      );
      const toFacility = facilities.find((facility) =>
        isSamePos(facility.position, carrierPath.path.to),
      );

      if (!fromFacility || !toFacility) {
        console.error('No facility found!');
        continue;
      }

      const fromCount = getCountOf(
        fromFacility.output,
        carrierPath.resourceType,
      );

      if (fromCount === 0) {
        continue;
      }

      // TODO: Calculate how many people we need based on input and needed output

      const toCount = getCountOf(toFacility.input, carrierPath.resourceType);

      // TODO: GET MAXIMUM INPUT STORAGE SIZE
      if (toCount >= 4) {
        continue;
      }

      registerJob(
        {
          type: 'carrier',
          carrierPath,
          fromFacility,
          toFacility,
        },
        carrierPath.people,
      );
    }

    while (city.popularity < needPeople) {
      const cutJobs = jobs.filter((job) => job[0] === maxRatio);

      const cutJob = sample(cutJobs)!;
      cutJob[1] -= 1;
      cutJob[0] = (cutJob[1] - 1) / cutJob[2];
      needPeople -= 1;

      if (cutJobs.length === 1) {
        maxRatio = -Infinity;
        for (const job of jobs) {
          if (job[0] > maxRatio) {
            maxRatio = job[0];
          }
        }
      }
    }

    jobs = jobs.filter((job) => job[1] > 0);

    for (const [, people, , jobObject] of jobs) {
      switch (jobObject.type) {
        case 'facility': {
          const { facility } = jobObject;
          const distance = calculateDistance(city.position, facility.position);
          const peopleAfterWalk = people * (1 - distance * 0.05);

          switch (facility.type) {
            case FacilityType.BUILDING: {
              const progress = peopleAfterWalk / facility.buildingTime;
              facility.buildingStage += progress;

              if (facility.buildingStage >= 1) {
                const index = facilities.indexOf(facility);

                facilities[index] = {
                  type: facility.buildingFacilityType,
                  position: facility.position,
                  input: [],
                  output: [],
                };
              }
              break;
            }
            case FacilityType.LAMBERT: {
              const PEOPLE_PER_LOG = 1;

              const logsCount = Math.floor(peopleAfterWalk / PEOPLE_PER_LOG);

              addResource(facility.output, {
                resourceType: ResourceType.LOG,
                quantity: logsCount,
              });
              break;
            }
          }
          break;
        }
        case 'carrier': {
          const { carrierPath, fromFacility, toFacility } = jobObject;

          const comming =
            calculateDistance(city.position, fromFacility.position) +
            calculateDistance(toFacility.position, city.position);

          const remains = 1 - comming * 0.02;

          const power = remains * people;

          const moveDistance = calculateDistance(
            fromFacility.position,
            toFacility.position,
          );

          let movedWeight = (power / moveDistance) * 2.5;
          movedWeight = Math.floor(movedWeight * 10) / 10;

          const grabbedItem = grabResource(fromFacility.output, {
            resourceType: carrierPath.resourceType,
            quantity: movedWeight,
          });

          addResource(toFacility.input, grabbedItem);

          break;
        }
      }
    }

    city.workingPaths = jobs.map((job) => {
      switch (job[3].type) {
        case 'facility': {
          const facility = job[3].facility;
          return {
            path: { from: city.position, to: facility.position },
            people: job[1],
          };
        }
        case 'carrier': {
          const { from, to } = job[3].carrierPath.path;
          return {
            path: { from, to },
            people: job[1],
          };
        }
      }
    });
  }
}

function calculateDistance(cell1: CellPosition, cell2: CellPosition): number {
  const x = cell1[0] - cell2[0];
  const y = cell1[1] - cell2[1];

  return Math.sqrt(x ** 2 + y ** 2);
}

function addResource(storage: StorageItem[], addItem: StorageItem): void {
  if (addItem.quantity === 0) {
    return;
  }

  const alreadyResource = storage.find(
    (item) => item.resourceType === addItem.resourceType,
  );

  if (alreadyResource) {
    alreadyResource.quantity += addItem.quantity;
  } else {
    storage.push(addItem);
  }
}

function grabResource(
  storage: StorageItem[],
  grabItem: StorageItem,
): StorageItem {
  const foundResource = storage.find(
    (item) => item.resourceType === grabItem.resourceType,
  );

  if (!foundResource) {
    return {
      resourceType: grabItem.resourceType,
      quantity: 0,
    };
  }

  if (foundResource.quantity <= grabItem.quantity) {
    const index = storage.indexOf(foundResource);
    storage.splice(index, 1);
    return {
      resourceType: grabItem.resourceType,
      quantity: foundResource.quantity,
    };
  }

  foundResource.quantity -= grabItem.quantity;
  return grabItem;
}

function getCountOf(
  storage: StorageItem[],
  resourceType: ResourceType,
): number {
  return (
    storage.find((item) => item.resourceType === resourceType)?.quantity ?? 0
  );
}

function isSamePos(cell1: CellPosition, cell2: CellPosition): boolean {
  return cell1[0] === cell2[0] && cell1[1] === cell2[1];
}
