import {
  CellPosition,
  ExactFacilityType,
  FacilityType,
  Structure,
} from '@/game/types';

export const enum ModalModeType {
  GAME_MENU = 'GAME_MENU',
  FACILITY = 'FACILITY',
  RESEARCH = 'RESEARCH',
  PRODUCTION_VARIANT_CHOOSE = 'PRODUCTION_VARIANT_CHOOSE',
  RESOURCE_CHOOSE = 'RESOURCE_CHOOSE',
}

export type ModalMode =
  | {
      modeType: ModalModeType.FACILITY;
      facility: Structure;
    }
  | {
      modeType: ModalModeType.RESEARCH | ModalModeType.GAME_MENU;
    }
  | {
      modeType: ModalModeType.PRODUCTION_VARIANT_CHOOSE;
      facilityType: ExactFacilityType;
      position: CellPosition;
    }
  | {
      modeType: ModalModeType.RESOURCE_CHOOSE;
      facilityType:
        | FacilityType.INTERCITY_SENDER
        | FacilityType.INTERCITY_RECEIVER;
      position: CellPosition;
    };

export const enum UiUpdateType {
  RESEARCH = 'RESEARCH',
  MODAL = 'MODAL',
  CANVAS = 'CANVAS',
}
