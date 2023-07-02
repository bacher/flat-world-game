import {
  CellPosition,
  CellRect,
  ExactFacilityType,
  FacilityType,
  Point,
  StorageItem,
  citiesInputResourceTypes,
  City,
  Construction,
  Facility,
  Structure,
} from '../game/types';
import {
  convertCellToCellId,
  getStructureIterationStorageInfo,
} from '../game/gameState';
import { ResourceType, resourceLocalization } from '../game/resources';
import {
  InteractActionCarrierPlanning,
  InteractiveActionType,
  VisualState,
  isAllowToConstructAtPosition,
  isPointsSame,
} from '../game/visualState';
import { drawStructureObject } from './renderStructures';
import { drawResourceIcon } from './renderResource';

export function renderGameToCanvas(visualState: VisualState): void {
  const { ctx } = visualState;

  const [canvasWidth, canvasHeight] = visualState.canvasSize;
  const [halfWidth, halfHeight] = visualState.canvasHalfSize;
  const [offsetX, offsetY] = visualState.offset;

  ctx.save();

  ctx.rect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = 'white';
  ctx.fill();

  ctx.save();
  ctx.translate(offsetX + halfWidth, offsetY + halfHeight);

  drawHighlights(visualState);
  drawInteractiveAction(visualState);
  drawGrid(visualState);
  drawWorkingPaths(visualState);
  drawObjects(visualState);

  ctx.restore();

  drawTopOverlay(visualState);

  ctx.restore();
}

function drawInteractiveAction(visualState: VisualState): void {
  if (visualState.interactiveAction) {
    switch (visualState.interactiveAction.actionType) {
      case InteractiveActionType.CONSTRUCTION_PLANNING: {
        drawBuildingMode(visualState);
        break;
      }
      case InteractiveActionType.CARRIER_PATH_PLANNING: {
        drawCarrierPlanningMode(visualState, visualState.interactiveAction);

        break;
      }
      default:
      // do nothing
    }
  } else {
    highlightHoverCell(visualState);
  }
}

function drawCarrierPlanningMode(
  visualState: VisualState,
  action: InteractActionCarrierPlanning,
): void {
  if (!visualState.hoverCell) {
    return;
  }

  const cellId = convertCellToCellId(visualState.hoverCell);
  const hoverFacility = visualState.gameState.structuresByCellId.get(cellId);

  const isValid =
    hoverFacility &&
    isValidCarrierPlanningTarget(visualState, hoverFacility, action);

  highlightCell(visualState, visualState.hoverCell, isValid ? '#aea' : '#e99');
}

export function isExactFacility(type: FacilityType): type is ExactFacilityType {
  return type !== FacilityType.CITY && type !== FacilityType.CONSTRUCTION;
}

function extactResourceTypesFromStorageInfo(
  facility: Facility | Construction,
): { input: ResourceType[]; output: ResourceType[] } {
  const { input, output } = getStructureIterationStorageInfo(facility);

  return {
    input: input.map((item) => item.resourceType),
    output: output.map((item) => item.resourceType),
  };
}

export function isValidCarrierPlanningTarget(
  visualState: VisualState,
  hoverFacility: Structure,
  action: InteractActionCarrierPlanning,
): boolean {
  if (hoverFacility && !isPointsSame(visualState.hoverCell, action.cell)) {
    let input: ResourceType[];
    let output: ResourceType[];

    if (isCity(hoverFacility)) {
      input = citiesInputResourceTypes;
      output = [];
    } else {
      ({ input, output } = extactResourceTypesFromStorageInfo(hoverFacility));
    }

    const storage = action.direction === 'from' ? input : output;

    return storage.includes(action.resourceType);
  }

  return false;
}

function drawGrid(visualState: VisualState): void {
  const { ctx } = visualState;

  const [cellWidth, cellHeight] = visualState.cellSize;
  const { start, end } = visualState.viewportBounds;

  ctx.save();
  ctx.beginPath();
  ctx.translate(-cellWidth / 2, -cellHeight / 2);
  for (let i = start[0]; i < end[0]; i += 1) {
    ctx.moveTo(i * cellWidth, start[1] * cellHeight);
    ctx.lineTo(i * cellWidth, end[1] * cellWidth);
  }
  for (let j = start[1]; j < end[1]; j += 1) {
    ctx.moveTo(start[0] * cellWidth, j * cellHeight);
    ctx.lineTo(end[0] * cellWidth, j * cellWidth);
  }
  ctx.stroke();
  ctx.restore();
}

function drawHighlights(visualState: VisualState): void {
  if (!visualState.interactiveAction) {
    return;
  }

  switch (visualState.interactiveAction.actionType) {
    case InteractiveActionType.CONSTRUCTION_PLANNING: {
      if (visualState.interactiveAction.facilityType === FacilityType.CITY) {
        const { start, end } = visualState.viewportBounds;

        for (let col = start[0]; col < end[0]; col += 1) {
          for (let row = start[1]; row < end[1]; row += 1) {
            const cell = [col, row] as CellPosition;

            if (isAllowToConstructAtPosition(visualState, cell)) {
              highlightCell(visualState, cell, '#aea');
            }
          }
        }
      }
      break;
    }
  }
}

function highlightHoverCell(visualState: VisualState): void {
  if (visualState.hoverCell) {
    highlightCell(visualState, visualState.hoverCell, 'azure');
  }
}

function highlightCell(
  visualState: VisualState,
  cellPosition: CellPosition,
  cellColor: string,
): void {
  const { ctx } = visualState;
  const [cellWidth, cellHeight] = visualState.cellSize;

  ctx.save();
  ctx.beginPath();
  ctx.translate(-cellWidth / 2, -cellHeight / 2);

  const [i, j] = cellPosition;

  ctx.rect(i * cellWidth, j * cellHeight, cellWidth, cellHeight);
  ctx.fillStyle = cellColor;
  ctx.fill();
  ctx.restore();
}

function drawBuildingMode(visualState: VisualState): void {
  const { hoverCell } = visualState;
  if (!hoverCell) {
    return;
  }

  const isAllow = isAllowToConstructAtPosition(visualState, hoverCell);

  if (isAllow) {
    highlightCell(visualState, hoverCell, '#9c9');
  } else {
    highlightCell(visualState, hoverCell, '#e99');
  }
}

function drawObjects(visualState: VisualState): void {
  const { gameState } = visualState;

  for (const city of gameState.cities.values()) {
    drawObject(visualState, city);
  }

  for (const facilities of gameState.facilitiesByCityId.values()) {
    for (const facility of facilities) {
      drawObject(visualState, facility);
    }
  }
}

function drawObject(visualState: VisualState, facility: Structure): void {
  if (isCellInRectInclsive(visualState.viewportBounds, facility.position)) {
    const { ctx } = visualState;

    ctx.save();
    const cellCenter = getCellCenter(visualState, facility.position);
    ctx.translate(cellCenter[0], cellCenter[1]);

    drawStructureObject(visualState, facility);
    drawFacilityStorage(visualState, facility);

    ctx.restore();
  }
}

function getCellCenter(visualState: VisualState, cell: CellPosition): Point {
  return [cell[0] * visualState.cellSize[0], cell[1] * visualState.cellSize[1]];
}

function isCellInRectInclsive(rect: CellRect, point: CellPosition): boolean {
  return (
    point[0] < rect.start[0] ||
    point[0] > rect.end[0] ||
    point[1] < rect.start[1] ||
    point[1] < rect.end[1]
  );
}

function addGap(point1: Point, point2: Point, gap: number): [Point, Point] {
  const x = point2[0] - point1[0];
  const y = point2[1] - point1[1];

  const distance = Math.sqrt(x ** 2 + y ** 2);
  const modifier1 = Math.min(0.4, gap / distance);
  const modifier2 = 1 - modifier1;

  return [
    [point1[0] + x * modifier1, point1[1] + y * modifier1],
    [point1[0] + x * modifier2, point1[1] + y * modifier2],
  ];
}

function drawWorkingPaths(visualState: VisualState): void {
  const { ctx, gameState } = visualState;

  for (const city of gameState.cities.values()) {
    for (const { path, workers, carriers } of city.lastTickWorkingPaths) {
      // Have to check viewport

      const fromCenter = getCellCenter(visualState, path.from);
      const toCenter = getCellCenter(visualState, path.to);

      const [fromGapped, toGapped] = addGap(fromCenter, toCenter, 20);

      ctx.beginPath();
      ctx.moveTo(fromGapped[0], fromGapped[1]);
      ctx.lineTo(toGapped[0], toGapped[1]);
      ctx.strokeStyle = 'black';
      ctx.stroke();

      const lineCenter = [
        (fromCenter[0] + toCenter[0]) / 2,
        (fromCenter[1] + toCenter[1]) / 2,
      ];

      const peopleTextParts: string[] = [];

      if (workers) {
        peopleTextParts.push(`${workers}w`);
      }
      if (carriers) {
        peopleTextParts.push(`${carriers}c`);
      }

      const peopleText = peopleTextParts.join(' + ');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeText(peopleText, lineCenter[0], lineCenter[1]);
      ctx.lineWidth = 1;
      ctx.fillStyle = 'black';
      ctx.fillText(peopleText, lineCenter[0], lineCenter[1]);
    }
  }
}

function isCity(structure: Structure): structure is City {
  return structure.type === FacilityType.CITY;
}

function drawFacilityStorage(
  visualState: VisualState,
  facility: Structure,
): void {
  const iterationInfo = isCity(facility)
    ? undefined
    : getStructureIterationStorageInfo(facility);

  const planInput = iterationInfo?.input;

  const input = planInput
    ? combineStorageWithIteration(planInput, facility.input)
    : facility.input;

  if (input.length) {
    drawStorage(visualState, input, 'right');
  }

  const output = iterationInfo
    ? combineStorageWithIteration(iterationInfo.output, facility.output)
    : facility.output;

  if (output.length) {
    drawStorage(visualState, output, 'left');
  }
}

function combineStorageWithIteration(
  iterationStorage: StorageItem[],
  storage: StorageItem[],
): StorageItem[] {
  return iterationStorage.map((item) => ({
    resourceType: item.resourceType,
    quantity:
      storage.find(({ resourceType }) => resourceType === item.resourceType)
        ?.quantity ?? 0,
  }));
}

function drawStorage(
  visualState: VisualState,

  storage: StorageItem[],
  align: 'left' | 'right',
): void {
  const { ctx } = visualState;
  for (let i = 0; i < storage.length; i += 1) {
    ctx.save();

    if (align === 'left') {
      ctx.translate(15, 5 + i * 16);
    } else {
      ctx.translate(-15, 5 + i * 16);
    }

    const { resourceType, quantity } = storage[i];

    drawResourceIcon(ctx, resourceType);

    ctx.textBaseline = 'middle';
    const value = quantity.toFixed(1);
    const resourceName = resourceLocalization[resourceType] ?? 'Unknown';

    ctx.fillStyle = 'black';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    const text = `${value} ${resourceName}`;

    if (align === 'left') {
      ctx.textAlign = 'left';
      ctx.strokeText(text, 10, 0);
      ctx.fillText(text, 10, 0);
    } else {
      ctx.textAlign = 'right';
      ctx.strokeText(text, -10, 0);
      ctx.fillText(text, -10, 0);
    }

    ctx.restore();
  }
}

function drawTopOverlay(visualState: VisualState): void {
  if (visualState.hoverCell) {
    const { ctx } = visualState;
    const drawText = `(${visualState.hoverCell.join(',')})`;
    const [x, y] = visualState.canvasSize;

    ctx.save();
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 5;
    ctx.strokeText(drawText, x, y);
    ctx.fillStyle = 'black';
    ctx.fillText(drawText, x, y);
    ctx.restore();
  }
}
