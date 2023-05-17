import {
  Facility,
  FacilityType,
  ResourceType,
  StorageItem,
  resourceLocalization,
} from '../game/gameState';
import type { CellPosition, CellRect, Point } from '../game/types';
import type { VisualState } from '../game/visualState';
import { neverCall } from '../utils/types';

export function renderGameToCanvas(visualState: VisualState): void {
  const { ctx } = visualState;

  const [canvasWidth, canvasHeight] = visualState.canvasSize;
  const [halfWidth, halfHeight] = visualState.canvasHalfSize;

  ctx.save();

  ctx.rect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = 'white';
  ctx.fill();

  ctx.translate(halfWidth, halfHeight);

  highlightHoverCell(visualState);
  drawGrid(visualState);
  drawWorkingPaths(visualState);
  drawObjects(visualState);

  ctx.restore();
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

function highlightHoverCell(visualState: VisualState): void {
  if (visualState.hoverCell) {
    const { ctx } = visualState;
    const [cellWidth, cellHeight] = visualState.cellSize;

    ctx.save();
    ctx.beginPath();
    ctx.translate(-cellWidth / 2, -cellHeight / 2);

    const [i, j] = visualState.hoverCell;

    ctx.rect(i * cellWidth, j * cellHeight, cellWidth, cellHeight);
    ctx.fillStyle = 'azure';
    ctx.fill();
    ctx.restore();
  }
}

function drawObjects(visualState: VisualState): void {
  const { gameState } = visualState;

  for (const city of gameState.cities) {
    drawObject(visualState, city);
  }

  // TODO: Object.values is not performant way
  for (const facilities of Object.values(gameState.facilitiesByCityId)) {
    for (const facility of facilities) {
      drawObject(visualState, facility);
    }
  }
}

function drawObject(visualState: VisualState, facility: Facility): void {
  if (isCellInRectInclsive(visualState.viewportBounds, facility.position)) {
    const { ctx, cellSize } = visualState;

    ctx.save();
    const cellCenter = getCellCenter(visualState, facility.position);
    ctx.translate(cellCenter[0], cellCenter[1]);

    let drawFacilityType = facility.type;

    if (facility.type === FacilityType.BUILDING) {
      drawFacilityType = facility.buildingFacilityType;
    }

    switch (drawFacilityType) {
      case FacilityType.CITY:
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, 2 * Math.PI, true);
        ctx.fillStyle = 'black';
        ctx.fill();
        break;
      case FacilityType.LAMBERT:
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(-15, 12);
        ctx.lineTo(15, 12);
        ctx.closePath();
        ctx.fillStyle = 'green';
        ctx.fill();
        break;
      case FacilityType.CHOP_WOOD:
        ctx.beginPath();
        ctx.moveTo(-12, -8);
        ctx.lineTo(-8, -12);
        ctx.lineTo(12, 8);
        ctx.lineTo(8, 12);
        ctx.closePath();
        ctx.fillStyle = 'black';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-12, -8);
        ctx.lineTo(-15, 6);
        ctx.lineTo(2, 6);
        ctx.closePath();
        ctx.fillStyle = 'gray';
        ctx.fill();
        break;
      case FacilityType.GATHERING:
        ctx.beginPath();
        ctx.moveTo(-12, -4);
        ctx.lineTo(-9, 8);
        ctx.lineTo(9, 8);
        ctx.lineTo(12, -4);
        ctx.closePath();
        ctx.fillStyle = 'brown';
        ctx.fill();
        ctx.rect(-2, -12, 4, 8);
        ctx.fill();
        break;

      default:
        ctx.beginPath();
        ctx.moveTo(-10, -10);
        ctx.lineTo(10, 10);
        ctx.moveTo(10, -10);
        ctx.lineTo(-10, 10);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'black';
        ctx.stroke();
        ctx.lineWidth = 1;
        console.warn(`No render function for facility ${drawFacilityType}`);
    }

    if (facility.type === FacilityType.BUILDING) {
      ctx.beginPath();
      ctx.rect(
        -cellSize[0] / 2 + 1,
        -cellSize[1] / 2 + 1,
        cellSize[0] - 2,
        cellSize[1] - 2,
      );
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fill();
    }

    if (facility.type === FacilityType.CITY) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.strokeStyle = 'white';
      ctx.fillStyle = 'black';
      ctx.lineWidth = 3;

      ctx.strokeText(facility.name, 0, 28);
      ctx.fillText(facility.name, 0, 28);

      const populatityText = facility.popularity.toString();
      ctx.strokeText(populatityText, 12, 14);
      ctx.fillText(populatityText, 12, 14);

      ctx.lineWidth = 1;
    }

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

  for (const city of gameState.cities) {
    for (const { path, people } of city.workingPaths) {
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

      const peopleText = people.toString();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 4;
      ctx.strokeText(peopleText, lineCenter[0], lineCenter[1]);
      ctx.fillStyle = 'black';
      ctx.fillText(peopleText, lineCenter[0], lineCenter[1]);
      ctx.lineWidth = 1;
    }
  }
}

function drawFacilityStorage(
  visualState: VisualState,
  facility: Facility,
): void {
  if (facility.input.length) {
    drawStorage(visualState, facility.input, 'right');
  }

  if (facility.output.length) {
    drawStorage(visualState, facility.output, 'left');
  }
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

    const item = storage[i];

    switch (item.resourceType) {
      case ResourceType.LOG:
        ctx.beginPath();
        ctx.moveTo(-5, -3);
        ctx.lineTo(5, -3);
        ctx.lineTo(5, 3);
        ctx.lineTo(-5, 3);
        ctx.fillStyle = 'brown';
        ctx.fill();
        break;
      case ResourceType.ROUTH_LUMBER:
        ctx.fillStyle = 'brown';
        ctx.beginPath();
        ctx.moveTo(-4, -6);
        ctx.lineTo(-6, -4);
        ctx.lineTo(4, 6);
        ctx.lineTo(6, 4);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-4, 6);
        ctx.lineTo(-6, 4);
        ctx.lineTo(4, -6);
        ctx.lineTo(6, -4);
        ctx.closePath();
        ctx.fill();
        break;
      case ResourceType.FOOD:
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2, true);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.beginPath();
        ctx.rect(2, -6, 2, 4);
        ctx.fillStyle = 'green';
        ctx.fill();
        break;
      default:
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2, true);
        ctx.fillStyle = 'black';
        ctx.fill();
        console.warn(`No render function for resource ${item.resourceType}`);
    }

    ctx.textBaseline = 'middle';
    const value = item.quantity.toFixed(1);
    const resourceName = resourceLocalization[item.resourceType] ?? 'Unknown';

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
