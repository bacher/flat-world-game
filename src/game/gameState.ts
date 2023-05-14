import sample from 'lodash/sample';

import { generateNewCityName } from './cityNameGenerator';
import type { CellPosition } from './types';

const PEOPLE_DAY_PER_CELL = 0.02;
const WEIGHT_PER_PEOPLE_DAY = 2.5;
const BUFFER_DAYS = 2;

export type GameState = {
  cities: Extract<Facility, { type: FacilityType.CITY }>[];
  facilitiesByCityId: Record<CityId, FacilityNoCity[]>;
};

export type CityId = string;

export enum FacilityType {
  CITY,
  LAMBERT,
  BUILDING,
  CHOP_WOOD,
  GATHERING,
}

export type CellPath = {
  from: CellPosition;
  to: CellPosition;
};

export enum ResourceType {
  LOG,
  ROUTH_LUMBER,
  FOOD,
}

export const resourceLocalization: Record<ResourceType, string> = {
  [ResourceType.LOG]: 'Log',
  [ResourceType.ROUTH_LUMBER]: 'Rough Lumber',
  [ResourceType.FOOD]: 'Food',
};

type FacilityIterationInfo = {
  iterationPeopleDays: number;
  maximumPeopleAtWork: number;
  input: StorageItem[];
  output: StorageItem[];
};

const facilitiesIterationInfo: Map<FacilityType, FacilityIterationInfo> =
  new Map([
    [
      FacilityType.GATHERING,
      {
        iterationPeopleDays: 1,
        maximumPeopleAtWork: 3,
        input: [],
        output: [
          {
            resourceType: ResourceType.FOOD,
            quantity: 1,
          },
        ],
      },
    ],
    [
      FacilityType.LAMBERT,
      {
        iterationPeopleDays: 1,
        maximumPeopleAtWork: 4,
        input: [],
        output: [
          {
            resourceType: ResourceType.LOG,
            quantity: 1,
          },
        ],
      },
    ],
    [
      FacilityType.CHOP_WOOD,
      {
        iterationPeopleDays: 1,
        maximumPeopleAtWork: 4,
        input: [
          {
            resourceType: ResourceType.LOG,
            quantity: 1,
          },
        ],
        output: [
          {
            resourceType: ResourceType.ROUTH_LUMBER,
            quantity: 2,
          },
        ],
      },
    ],
  ]);

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
      inProcess: number;
    }
  | {
      type: FacilityType.CHOP_WOOD;
      inProcess: number;
    }
  | {
      type: FacilityType.GATHERING;
      inProcess: number;
    }
);

export type FacilityNoCity = Exclude<Facility, { type: FacilityType.CITY }>;

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
            people: 3,
          },
          {
            path: { from: [-3, 2], to: [0, 0] },
            resourceType: ResourceType.FOOD,
            people: 1,
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
          inProcess: 0,
        },
        {
          type: FacilityType.GATHERING,
          position: [-3, 2],
          input: [],
          output: [],
          inProcess: 0,
        },
      ],
    },
  };
}

const MAX_BUILDING_PEOPLE = 4;

type JobObject =
  | { type: 'facility'; facility: FacilityNoCity; distance: number }
  | {
      type: 'carrier';
      carrierPath: CarrierPath;
      fromFacility: Facility;
      toFacility: Facility;
      commingDistance: number;
      moveDistance: number;
    };

export function tick(gameState: GameState): void {
  for (const city of gameState.cities) {
    const facilities = gameState.facilitiesByCityId[city.cityId];

    //        [temp, current, maximum, facility]
    let jobs: [number, number, number, JobObject][] = [];
    let needPeople = 0;
    let maxRatio = -Infinity;

    function registerJob(
      item: JobObject,
      people: number,
      maxPeople: number,
    ): void {
      const nextRatio = (people - 1) / maxPeople;
      jobs.push([nextRatio, people, maxPeople, item]);
      needPeople += people;

      if (nextRatio > maxRatio) {
        maxRatio = nextRatio;
      }
    }

    for (const facility of facilities) {
      const distance = calculateDistance(city.position, facility.position);

      if (facility.type === FacilityType.BUILDING) {
        registerJob(
          { type: 'facility', facility, distance },
          MAX_BUILDING_PEOPLE,
          MAX_BUILDING_PEOPLE,
        );
      } else {
        const iterationInfo = facilitiesIterationInfo.get(facility.type)!;

        if (iterationInfo) {
          let needPeople = 0;

          if (facility.inProcess > 0) {
            needPeople +=
              (1 - facility.inProcess) * iterationInfo.iterationPeopleDays;
          }

          const resourcesForIterations = getMaximumIterationsByResources(
            iterationInfo,
            facility,
          );

          const iterationsUntilOverDone = getIterationsUntilOverDone(
            iterationInfo,
            facility,
          );

          needPeople +=
            Math.min(
              resourcesForIterations,
              Math.max(
                0,
                iterationsUntilOverDone + (facility.inProcess > 0 ? -1 : 0),
              ),
            ) * iterationInfo.iterationPeopleDays;

          if (needPeople > 0) {
            const max = iterationInfo.maximumPeopleAtWork;

            const onePersonWork = 1 - distance * 0.05;
            const people = Math.min(max, Math.ceil(needPeople / onePersonWork));

            registerJob({ type: 'facility', facility, distance }, people, max);
          }
        }
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

      const toIterationInfo = facilitiesIterationInfo.get(toFacility.type)!;

      const resourceIterationInfo = toIterationInfo.input.find(
        (input) => input.resourceType === carrierPath.resourceType,
      )!;

      const maxInput =
        resourceIterationInfo.quantity *
        (toIterationInfo.maximumPeopleAtWork /
          toIterationInfo.iterationPeopleDays) *
        BUFFER_DAYS;

      if (toCount >= maxInput) {
        continue;
      }

      const commingDistance =
        calculateDistance(city.position, fromFacility.position) +
        calculateDistance(toFacility.position, city.position);

      const moveDistance = calculateDistance(
        fromFacility.position,
        toFacility.position,
      );

      const needToMove = maxInput - toCount;

      const remains = 1 - commingDistance * PEOPLE_DAY_PER_CELL;

      const needPeople = Math.ceil(
        ((needToMove / WEIGHT_PER_PEOPLE_DAY) * moveDistance) / remains,
      );

      registerJob(
        {
          type: 'carrier',
          carrierPath,
          fromFacility,
          toFacility,
          commingDistance,
          moveDistance,
        },
        Math.min(needPeople, carrierPath.people),
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
          const { facility, distance } = jobObject;

          const peopleAfterWalk = people * (1 - distance * 0.05);

          if (facility.type === FacilityType.BUILDING) {
            const progress = peopleAfterWalk / facility.buildingTime;
            facility.buildingStage += progress;

            if (facility.buildingStage >= 1) {
              const index = facilities.indexOf(facility);

              facilities[index] = {
                type: facility.buildingFacilityType,
                position: facility.position,
                input: [],
                output: [],
                inProcess: 0,
              };
            }
          } else {
            const iterationInfo = facilitiesIterationInfo.get(facility.type);

            if (iterationInfo) {
              const wasInProcess = facility.inProcess > 0;

              facility.inProcess +=
                peopleAfterWalk / iterationInfo.iterationPeopleDays;

              let inprogressDone = 0;

              if (wasInProcess && facility.inProcess >= 1) {
                facility.inProcess -= 1;
                inprogressDone += 1;
              }

              const resourceForIterations = getMaximumIterationsByResources(
                iterationInfo,
                facility,
              );

              const peopleForIterations = Math.ceil(facility.inProcess);

              const iterationsUntilOverDone = Math.max(
                0,
                getIterationsUntilOverDone(iterationInfo, facility) -
                  inprogressDone,
              );

              const resourceIterations = Math.min(
                iterationsUntilOverDone,
                resourceForIterations,
                peopleForIterations,
              );

              if (resourceIterations > 0) {
                removeIterationInput(
                  iterationInfo,
                  facility,
                  resourceIterations,
                );
              }

              let doneIterations = inprogressDone;

              if (resourceIterations === peopleForIterations) {
                doneIterations += Math.floor(facility.inProcess);
                facility.inProcess = facility.inProcess % 1;
              } else {
                doneIterations += resourceIterations;
                facility.inProcess = 0;
              }

              if (doneIterations > 0) {
                addIterationOutput(iterationInfo, facility, doneIterations);
              }
            }
          }

          break;
        }
        case 'carrier': {
          const {
            carrierPath,
            fromFacility,
            toFacility,
            commingDistance,
            moveDistance,
          } = jobObject;

          const remains = 1 - commingDistance * PEOPLE_DAY_PER_CELL;

          const power = remains * people;

          let movedWeight = (power / moveDistance) * WEIGHT_PER_PEOPLE_DAY;
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

function getMaximumIterationsByResources(
  iterationInfo: FacilityIterationInfo,
  facility: Facility,
): number {
  let minIterations = Infinity;

  for (let resource of iterationInfo.input) {
    const iterations = Math.floor(
      getCountOf(facility.input, resource.resourceType) / resource.quantity,
    );

    if (iterations < minIterations) {
      minIterations = iterations;
    }
  }

  return minIterations;
}

function getIterationsUntilOverDone(
  iterationInfo: FacilityIterationInfo,
  facility: Facility,
): number {
  let minIterations = Infinity;

  for (let resource of iterationInfo.output) {
    const maxPerDay =
      resource.quantity *
      (iterationInfo.maximumPeopleAtWork / iterationInfo.iterationPeopleDays);

    const iterations = Math.ceil(
      (maxPerDay * BUFFER_DAYS -
        getCountOf(facility.output, resource.resourceType)) /
        resource.quantity,
    );

    if (iterations < minIterations) {
      minIterations = iterations;
    }
  }

  return Math.max(0, minIterations);
}

function removeIterationInput(
  iterationInfo: FacilityIterationInfo,
  facility: Facility,
  iterationCount: number,
): void {
  for (const resource of iterationInfo.input) {
    const quantity = iterationCount * resource.quantity;

    const grabbedResource = grabResource(facility.input, {
      resourceType: ResourceType.LOG,
      quantity,
    });

    if (grabbedResource.quantity !== quantity) {
      throw new Error();
    }
  }
}

function addIterationOutput(
  iterationInfo: FacilityIterationInfo,
  facility: Facility,
  iterationCount: number,
): void {
  for (const resource of iterationInfo.output) {
    addResource(facility.output, {
      resourceType: resource.resourceType,
      quantity: iterationCount * resource.quantity,
    });
  }
}
