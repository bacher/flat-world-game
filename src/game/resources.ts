export enum ResourceType {
  LOG,
  ROUTH_LUMBER,
  FOOD,
  AGRICULTURAL_TOOLS,
  HAY,
  HORSE,
}

export const resourceLocalization: Record<ResourceType, string> = {
  [ResourceType.LOG]: 'Log',
  [ResourceType.ROUTH_LUMBER]: 'Rough Lumber',
  [ResourceType.FOOD]: 'Food',
  [ResourceType.AGRICULTURAL_TOOLS]: 'Agricultural tools',
  [ResourceType.HAY]: 'Hay',
  [ResourceType.HORSE]: 'Horse',
};
