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
