// TODO: Make numerical enum for production builds
export enum ResourceType {
  LOG = 'LOG',
  LUMBER_ROUGH = 'LUMBER_ROUGH',
  FOOD = 'FOOD',
  FRUIT = 'FRUIT',
  VEGETABLE = 'VEGETABLE',
  MEAT = 'MEAT',
  NUT = 'NUT',
  FRIED_MEAT = 'FRIED_MEAT',
  VEGAN_MEAL = 'VEGAN_MEAL',
  COMPLEX_MEAL = 'COMPLEX_MEAL',
  AGRICULTURAL_TOOLS = 'AGRICULTURAL_TOOLS',
  AGRICULTURAL_TOOLS_STONE = 'AGRICULTURAL_TOOLS_STONE',
  HAY = 'HAY',
  HORSE = 'HORSE',
  HORSE_WITH_CART = 'HORSE_WITH_CART',
  REED = 'REED',
  PAPYRUS = 'PAPYRUS',
  TEA_LEAVES = 'TEA_LEAVES',
  TEA = 'TEA',
  BASKET = 'BASKET',
  WOODEN_BOW = 'WOODEN_BOW',
  HOUSING = 'HOUSING',
  WICKIUP = 'WICKIUP',
  HOVEL = 'HOVEL',
  STONE = 'STONE',
  IRON_ORE = 'IRON_ORE',
  IRON = 'IRON',
  COAL = 'COAL',
  OIL = 'OIL',
  COTTAGE = 'COTTAGE',
  AXE_STONE = 'AXE_STONE',
}

export type FoodResourceTypes =
  | ResourceType.FOOD
  | ResourceType.VEGAN_MEAL
  | ResourceType.COMPLEX_MEAL;

export const foodNutritionlValue: Record<FoodResourceTypes, number> = {
  [ResourceType.FOOD]: 1,
  [ResourceType.VEGAN_MEAL]: 1.6,
  [ResourceType.COMPLEX_MEAL]: 2.3,
};

export const foodResourceTypes: Set<ResourceType> = new Set(
  Object.keys(foodNutritionlValue) as FoodResourceTypes[],
);

export function isFoodResourceType(
  resourceType: ResourceType,
): resourceType is FoodResourceTypes {
  return foodResourceTypes.has(resourceType);
}

export type HouseResourceTypes =
  | ResourceType.HOUSING
  | ResourceType.WICKIUP
  | ResourceType.HOVEL
  | ResourceType.COTTAGE;

export const houseCapacities: Record<HouseResourceTypes, number> = {
  [ResourceType.HOUSING]: 1,
  [ResourceType.WICKIUP]: 0.1,
  [ResourceType.HOVEL]: 0.7,
  [ResourceType.COTTAGE]: 2.0,
};

export const houseResourceTypes: Set<ResourceType> = new Set(
  Object.keys(houseCapacities) as HouseResourceTypes[],
);

export function isHouseResourceType(
  resourceType: ResourceType,
): resourceType is HouseResourceTypes {
  return houseResourceTypes.has(resourceType);
}

export type CarrierBoosterResourceType =
  | ResourceType.HORSE
  | ResourceType.HORSE_WITH_CART;

export const carrierBoosters: Record<
  CarrierBoosterResourceType,
  { perWorker: number; boost: number }
> = {
  [ResourceType.HORSE]: {
    perWorker: 0.05,
    boost: 1,
  },
  [ResourceType.HORSE_WITH_CART]: {
    perWorker: 0.05,
    boost: 2,
  },
};

export const carrierBoosterResourceTypes = new Set(
  Object.keys(carrierBoosters) as CarrierBoosterResourceType[],
);

export const carrierBoostersByPower: CarrierBoosterResourceType[] = [
  ...carrierBoosterResourceTypes,
].sort((a, b) => carrierBoosters[b].boost - carrierBoosters[a].boost);

export const privilegedResourcesTypes = new Set<ResourceType>([
  ...foodResourceTypes,
  ...houseResourceTypes,
  ...carrierBoosterResourceTypes,
]);

export const resourceLocalization: Record<ResourceType, string> = {
  [ResourceType.LOG]: 'Log',
  [ResourceType.LUMBER_ROUGH]: 'Rough Lumber',
  [ResourceType.FOOD]: 'Food',
  [ResourceType.FRUIT]: 'Fruit',
  [ResourceType.VEGETABLE]: 'Vegetables',
  [ResourceType.NUT]: 'Nuts',
  [ResourceType.MEAT]: 'Meat',
  [ResourceType.FRIED_MEAT]: 'Fried meat',
  [ResourceType.AGRICULTURAL_TOOLS]: 'Agricultural tools',
  [ResourceType.AGRICULTURAL_TOOLS_STONE]: 'Stone agricultural tools',
  [ResourceType.HAY]: 'Hay',
  [ResourceType.HORSE]: 'Horse',
  [ResourceType.HORSE_WITH_CART]: 'Horse with cart',
  [ResourceType.REED]: 'Reed',
  [ResourceType.PAPYRUS]: 'Papyrus',
  [ResourceType.TEA_LEAVES]: 'Tea leaves',
  [ResourceType.TEA]: 'Tea',
  [ResourceType.COMPLEX_MEAL]: 'Complex meal',
  [ResourceType.VEGAN_MEAL]: 'Vegan meal',
  [ResourceType.BASKET]: 'Basket',
  [ResourceType.WOODEN_BOW]: 'Wooden bow',
  [ResourceType.HOUSING]: 'Housing',
  [ResourceType.WICKIUP]: 'Wickiup',
  [ResourceType.HOVEL]: 'Hovel',
  [ResourceType.STONE]: 'Stone',
  [ResourceType.IRON_ORE]: 'Iron ore',
  [ResourceType.IRON]: 'Iron',
  [ResourceType.COAL]: 'Coal',
  [ResourceType.OIL]: 'Oil',
  [ResourceType.COTTAGE]: 'Cottage',
  [ResourceType.AXE_STONE]: 'Stone Axe',
};
