import { FacilityType } from './types';

export const facilitiesDescription = new Map<FacilityType, string>([
  [FacilityType.CITY, 'City'],
  [FacilityType.BUILDING, 'Building'],
  [FacilityType.LAMBERT, 'Lambert'],
  [FacilityType.GATHERING, 'Gathering'],
  [FacilityType.CHOP_WOOD, 'Chop wood'],
]);
