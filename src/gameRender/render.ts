import {
  CellPosition,
  CellRect,
  FacilityType,
  Point,
  StorageItem,
  citiesInputResourceTypes,
  City,
  Construction,
  Facility,
  Structure,
  CellPath,
} from '@/game/types';
import { getStructureIterationStorageInfo } from '@/game/gameState';
import { ResourceType, resourceLocalization } from '@/game/resources';
import {
  newCellPosition,
  isSameCellPoints,
  calculateDistance,
} from '@/game/helpers';
import {
  InteractActionCarrierPlanning,
  InteractiveActionType,
  VisualState,
  isAllowToConstructAtPosition,
} from '@/game/visualState';

import { drawStructureObject } from './renderStructures';
import { drawResourceIcon } from './renderResource';
import { humanFormat } from '@/utils/format';
import { drawText } from './canvasUtils';

const DRAW_RESOURCE_NAMES = false;

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
  drawCarrierPaths(visualState);
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

  const hoverFacility = visualState.gameState.structuresByCellId.get(
    visualState.hoverCell.cellId,
  );

  const isValid =
    hoverFacility &&
    isValidCarrierPlanningTarget(visualState, hoverFacility, action);

  highlightCell(visualState, visualState.hoverCell, isValid ? '#aea' : '#e99');
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
  if (hoverFacility && !isSameCellPoints(visualState.hoverCell, action.cell)) {
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
  for (let i = start.i; i < end.i; i += 1) {
    ctx.moveTo(i * cellWidth, start.j * cellHeight);
    ctx.lineTo(i * cellWidth, end.j * cellWidth);
  }
  for (let j = start.j; j < end.j; j += 1) {
    ctx.moveTo(start.i * cellWidth, j * cellHeight);
    ctx.lineTo(end.i * cellWidth, j * cellWidth);
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

        for (let col = start.i; col < end.i; col += 1) {
          for (let row = start.j; row < end.j; row += 1) {
            const cell = newCellPosition({ i: col, j: row });

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

  const { i, j } = cellPosition;

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
  if (isCellInRectInclusive(visualState.viewportBounds, facility.position)) {
    const { ctx } = visualState;

    ctx.save();
    const cellCenter = getCellCenter(visualState, facility.position);
    ctx.translate(cellCenter[0], cellCenter[1]);

    drawStructureObject(visualState, facility);
    drawStructureInfo(visualState, facility);
    drawFacilityStorage(visualState, facility);

    ctx.restore();
  }
}

function getCellCenter(visualState: VisualState, cell: CellPosition): Point {
  return [cell.i * visualState.cellSize[0], cell.j * visualState.cellSize[1]];
}

function isCellInRectInclusive(rect: CellRect, point: CellPosition): boolean {
  return (
    point.i < rect.start.i ||
    point.i > rect.end.i ||
    point.j < rect.start.j ||
    point.j < rect.end.j
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

function getCarrierPathPoints(
  visualState: VisualState,
  path: CellPath,
): [Point, Point] {
  const fromCenter = getCellCenter(visualState, path.from);
  const toCenter = getCellCenter(visualState, path.to);
  return addGap(fromCenter, toCenter, 20);
}

function drawCarrierPath(
  visualState: VisualState,
  path: CellPath,
  { color, text }: { color: string; text?: string },
): void {
  const { ctx } = visualState;
  const [fromGapped, toGapped] = getCarrierPathPoints(visualState, path);
  const distance = calculateDistance(path.from, path.to);

  const center = {
    x: (fromGapped[0] + toGapped[0]) / 2,
    y: (fromGapped[1] + toGapped[1]) / 2,
  };

  const dx = fromGapped[0] - toGapped[0];
  const dy = fromGapped[1] - toGapped[1];

  const angle = Math.atan2(dy, dx) + Math.PI / 2;

  const bezierOffset = distance * 3;

  const bx = bezierOffset * Math.cos(angle);
  const by = bezierOffset * Math.sin(angle);

  const cp = {
    x: center.x + bx,
    y: center.y + by,
  };

  ctx.beginPath();
  ctx.moveTo(fromGapped[0], fromGapped[1]);
  // ctx.lineTo(toGapped[0], toGapped[1]);
  ctx.bezierCurveTo(cp.x, cp.y, cp.x, cp.y, toGapped[0], toGapped[1]);
  ctx.strokeStyle = color;
  ctx.stroke();

  if (text) {
    const textCenter = {
      x: center.x + bx / 2,
      y: center.y + by / 2,
    };

    drawText(ctx, text, textCenter, {
      align: 'center',
      baseline: 'middle',
      lineWidth: 2,
    });
  }
}

function drawCarrierPaths(visualState: VisualState): void {
  const { gameState } = visualState;

  // TODO: Optimize, draw only paths in viewport

  for (const city of gameState.cities.values()) {
    for (const { path } of city.carrierPaths) {
      drawCarrierPath(visualState, path, { color: '#a0a0a0' });
    }

    for (const { path, carriers } of city.lastTickReport.carrierPathReports) {
      drawCarrierPath(visualState, path, {
        text: humanFormat(carriers),
        color: 'black',
      });
    }
  }
}

function isCity(structure: Structure): structure is City {
  return structure.type === FacilityType.CITY;
}

function drawStructureInfo(
  visualState: VisualState,
  facility: Structure,
): void {
  const { ctx, gameState } = visualState;

  if (facility.type !== FacilityType.CITY) {
    const city = gameState.cities.get(facility.assignedCityId)!;

    const report = city.lastTickReport.facilityWorkerReports.find(
      (info) => info.facility === facility,
    );

    if (report) {
      drawText(
        ctx,
        humanFormat(report.workers),
        { x: 14, y: -14 },
        {
          align: 'right',
          baseline: 'middle',
          color: 'black',
        },
      );
    }
  }
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

    const value = quantity.toFixed(1);

    let text = value;

    if (DRAW_RESOURCE_NAMES) {
      const resourceName = resourceLocalization[resourceType] ?? 'Unknown';
      text += ` ${resourceName}`;
    }

    drawText(
      ctx,
      text,
      { x: align === 'left' ? 10 : -10, y: 0 },
      {
        align,
        baseline: 'middle',
        lineWidth: 3,
      },
    );

    ctx.restore();
  }
}

function drawTopOverlay(visualState: VisualState): void {
  if (visualState.hoverCell) {
    const { ctx } = visualState;
    const [x, y] = visualState.canvasSize;

    const text = `(${visualState.hoverCell.i},${visualState.hoverCell.j})`;

    drawText(
      ctx,
      text,
      { x, y },
      {
        align: 'right',
        baseline: 'bottom',
        lineWidth: 5,
        fontSize: 18,
      },
    );
  }
}
