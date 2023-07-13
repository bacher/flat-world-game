// TODO: Make numerical enum for production builds
export enum ResourceType {
  LOG = 'LOG',
  ROUTH_LUMBER = 'ROUTH_LUMBER',
  FOOD = 'FOOD',
  FRUIT = 'FRUIT',
  VEGETABLE = 'VEGETABLE',
  MEAT = 'MEAT',
  NUT = 'NUT',
  FRIED_MEAT = 'FRIED_MEAT',
  VEGAN_MEAL = 'VEGAN_MEAL',
  COMPLEX_MEAL = 'COMPLEX_MEAL',
  AGRICULTURAL_TOOLS = 'AGRICULTURAL_TOOLS',
  HAY = 'HAY',
  HORSE = 'HORSE',
  REED = 'REED',
  PAPYRUS = 'PAPYRUS',
  TEA_LEAVES = 'TEA_LEAVES',
  TEA = 'TEA',
  BASKET = 'BASKET',
  WOODEN_BOW = 'WOODEN_BOW',
}

export type FoodResourceTypes =
  | ResourceType.FOOD
  | ResourceType.FRUIT
  | ResourceType.VEGETABLE
  | ResourceType.NUT
  | ResourceType.MEAT
  | ResourceType.FRIED_MEAT
  | ResourceType.VEGAN_MEAL
  | ResourceType.COMPLEX_MEAL;

export const foodNutritionlValue: Record<FoodResourceTypes, number> = {
  [ResourceType.FOOD]: 1,
  [ResourceType.FRUIT]: 0.5,
  [ResourceType.VEGETABLE]: 0.3,
  [ResourceType.NUT]: 0.1,
  [ResourceType.MEAT]: 0.3,
  [ResourceType.FRIED_MEAT]: 0.9,
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

export const resourceLocalization: Record<ResourceType, string> = {
  [ResourceType.LOG]: 'Log',
  [ResourceType.ROUTH_LUMBER]: 'Rough Lumber',
  [ResourceType.FOOD]: 'Food',
  [ResourceType.FRUIT]: 'Fruit',
  [ResourceType.VEGETABLE]: 'Vegetables',
  [ResourceType.NUT]: 'Nuts',
  [ResourceType.MEAT]: 'Meat',
  [ResourceType.FRIED_MEAT]: 'Fried meat',
  [ResourceType.AGRICULTURAL_TOOLS]: 'Agricultural tools',
  [ResourceType.HAY]: 'Hay',
  [ResourceType.HORSE]: 'Horse',
  [ResourceType.REED]: 'Reed',
  [ResourceType.PAPYRUS]: 'Papyrus',
  [ResourceType.TEA_LEAVES]: 'Tea leaves',
  [ResourceType.TEA]: 'Tea',
  [ResourceType.COMPLEX_MEAL]: 'Complex meal',
  [ResourceType.VEGAN_MEAL]: 'Vegan meal',
  [ResourceType.BASKET]: 'Basket',
  [ResourceType.WOODEN_BOW]: 'Wooden bow',
};
