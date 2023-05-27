import { FacilityType } from './types';

export const facilitiesDescription = new Map<FacilityType, string>([
  [FacilityType.CITY, 'City'],
  [FacilityType.CONSTRUCTION, 'Building'],
  [FacilityType.LUMBERT, 'Lumbert'],
  [FacilityType.GATHERING, 'Gathering'],
  [FacilityType.CHOP_WOOD, 'Chop wood'],
]);
