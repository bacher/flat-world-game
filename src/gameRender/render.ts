import clamp from 'lodash/clamp';

import {
  CarrierPath,
  CellCoordinates,
  CellPath,
  CellPosition,
  CellRect,
  ChunkIdentity,
  City,
  FacilityType,
  GameState,
  Point,
  Size,
  StorageItem,
  Structure,
} from '@/game/types';
import {
  getAllStructuresInArea,
  getStructureIterationStorageInfo,
} from '@/game/gameState';
import { resourceLocalization, ResourceType } from '@/game/resources';
import {
  calculateDistance,
  calculateDistanceSquare,
  extendArea,
  isPointInsideRect,
  isRectsCollade,
  isSameCellPoints,
  isSamePath,
  newCellPosition,
  newChunkIdentity,
} from '@/game/helpers';
import {
  InteractActionCarrierPlanning,
  InteractiveActionType,
  isAllowToConstructAtPosition,
  VisualState,
} from '@/game/visualState';
import { humanFormat } from '@/utils/format';
import { CITY_BORDER_RADIUS_SQUARE } from '@/game/consts';
import {
  facilitiesConstructionInfo,
  workAreaMap,
} from '@/game/facilityConstruction';

import {
  drawStructureObject,
  drawStructurePlaceholder,
} from './renderStructures';
import { drawResourceIcon } from './renderResource';
import { clearCanvas, drawText } from './canvasUtils';
import { getChunkDeposits } from '@/game/spawning.ts';
import { DepositType } from '@/game/depositType.ts';
import { neverCall } from '@/utils/typeUtils.ts';

const DRAW_RESOURCE_NAMES = false;
const RESOURCE_LINE_HEIGHT = 16;
const RESOURCE_COMPACT_LINE_HEIGHT = 12;

export function renderGameToCanvas(visualState: VisualState): void {
  const { ctx, canvasSize } = visualState;

  ctx.save();

  clearCanvas(ctx, canvasSize);

  ctx.save();

  moveViewport(visualState);

  drawViewportHighlights(visualState);
  drawInteractiveAction(visualState);
  drawGrid(visualState);
  drawObjects(visualState);
  drawCarrierPaths(visualState);
  drawDeposits(visualState);

  ctx.restore();

  drawTopOverlay(visualState);

  ctx.restore();
}

function moveViewport(visualState: VisualState): void {
  const { ctx, canvasHalfSize, cellSize, viewportCenter } = visualState;

  ctx.translate(
    -viewportCenter.i * cellSize.width + canvasHalfSize.width,
    -viewportCenter.j * cellSize.height + canvasHalfSize.height,
  );
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

// TODO:
//function extactResourceTypesFromStorageInfo(
//  facility: Facility | Construction,
//): { input: ResourceType[]; output: ResourceType[] } {
//  const { input, output } = getStructureIterationStorageInfo(facility);
//
//  return {
//    input: input.map((item) => item.resourceType),
//    output: output.map((item) => item.resourceType),
//  };
//}

export function isValidCarrierPlanningTarget(
  visualState: VisualState,
  hoverFacility: Structure,
  action: InteractActionCarrierPlanning,
): boolean {
  if (hoverFacility && !isSameCellPoints(visualState.hoverCell, action.cell)) {
    return (
      hoverFacility.type === FacilityType.INTERCITY_RECEIVER &&
      hoverFacility.resourceType === action.resourceType
    );

    // TODO:
    //    let input: ResourceType[];
    //    let output: ResourceType[];
    //    if (isCity(hoverFacility)) {
    //      input = cityResourcesInput;
    //      output = [];
    //    } else {
    //      ({ input, output } = extactResourceTypesFromStorageInfo(hoverFacility));
    //    }
    //
    //    const storage = action.direction === 'from' ? input : output;
    //
    //    return storage.includes(action.resourceType);
  }

  return false;
}

function drawGrid(visualState: VisualState): void {
  const { ctx, cellSize, zoom } = visualState;
  const { start, end } = visualState.viewportBounds;

  ctx.save();

  ctx.translate(-cellSize.width / 2, -cellSize.height / 2);

  if (zoom >= 0.3) {
    ctx.beginPath();
    schemeGrid(ctx, cellSize, start, start, end, 1);
    ctx.strokeStyle = makeAlphaBlackColor((zoom - 0.3) * 3);
    ctx.stroke();
  }

  if (zoom < 1.3) {
    const globalStart = {
      i: Math.ceil(start.i * 0.1) * 10,
      j: Math.ceil(start.j * 0.1) * 10,
    };
    ctx.beginPath();
    schemeGrid(ctx, cellSize, globalStart, start, end, 10);
    ctx.strokeStyle = '#000';
    ctx.stroke();
  }

  ctx.restore();
}

function makeAlphaBlackColor(intense: number): string {
  const alpha = clamp(intense, 0, 1);
  return `rgba(0,0,0,${alpha})`;
}

function schemeGrid(
  ctx: CanvasRenderingContext2D,
  cellSize: Size,
  globalStart: CellCoordinates,
  start: CellCoordinates,
  end: CellCoordinates,
  increment: number,
) {
  const y1 = start.j * cellSize.height;
  const y2 = (end.j + 1) * cellSize.width;
  for (let i = globalStart.i; i <= end.i + 1; i += increment) {
    ctx.moveTo(i * cellSize.width, y1);
    ctx.lineTo(i * cellSize.width, y2);
  }
  const x1 = start.i * cellSize.width;
  const x2 = (end.i + 1) * cellSize.width;
  for (let j = globalStart.j; j <= end.j + 1; j += increment) {
    ctx.moveTo(x1, j * cellSize.height);
    ctx.lineTo(x2, j * cellSize.width);
  }
}

function drawViewportHighlights(visualState: VisualState): void {
  const { interactiveAction, gameState } = visualState;

  if (interactiveAction) {
    switch (interactiveAction.actionType) {
      case InteractiveActionType.CONSTRUCTION_PLANNING: {
        if (interactiveAction.facilityType === FacilityType.CITY) {
          iterateOverViewportCells(visualState, (cell) => {
            let isInsideNewCity = false;
            let isPartOfAnotherCity = false;

            for (const city of gameState.cities.values()) {
              if (isCellInsideCityBorder(city.position, cell)) {
                isPartOfAnotherCity = true;
                break;
              }
            }

            if (visualState.hoverCell) {
              isInsideNewCity = isCellInsideCityBorder(
                visualState.hoverCell,
                cell,
              );
            }

            let color: string | undefined;

            if (isPartOfAnotherCity && isInsideNewCity) {
              color = '#e5c0c0';
            } else if (isPartOfAnotherCity) {
              color = '#e0e0e0';
            } else if (isInsideNewCity) {
              color = '#aea';
            }

            if (color) {
              highlightCell(visualState, cell, color);
            }
          });
        } else {
          iterateOverViewportCells(visualState, (cell) => {
            const isInsideCity = isCellInsideSomeCity(gameState, cell);
            let color: string | undefined;

            if (!isInsideCity) {
              color = '#ffbdbd';
            } else if (!gameState.structuresByCellId.has(cell.cellId)) {
              color = '#d8ffd8';
            }

            if (color) {
              highlightCell(visualState, cell, color);
            }
          });

          const constructionInfo =
            facilitiesConstructionInfo[interactiveAction.facilityType];

          if (constructionInfo.workArea) {
            const facilitiesTypes =
              workAreaMap[constructionInfo.workArea.areaType];

            for (const structure of getAllStructuresInArea(
              gameState,
              extendArea(
                visualState.viewportBounds,
                constructionInfo.workArea.radius,
              ),
            )) {
              if (structure.type !== FacilityType.CITY) {
                const effectiveFacilityType =
                  structure.type === FacilityType.CONSTRUCTION
                    ? structure.buildingFacilityType
                    : structure.type;

                if (facilitiesTypes.facilities.has(effectiveFacilityType)) {
                  const structureInfo =
                    facilitiesConstructionInfo[effectiveFacilityType];

                  if (structureInfo.workArea) {
                    drawBoundingRectAround(visualState, {
                      cell: structure.position,
                      radius: structureInfo.workArea.radius,
                      color: 'gray',
                      gapped: true,
                    });
                  }
                }
              }
            }
          }
        }
        break;
      }
    }
  } else {
    iterateOverViewportCells(visualState, (cell) => {
      if (isCellInsideSomeCity(gameState, cell)) {
        highlightCell(visualState, cell, '#fff1d6');
      }
    });
  }
}

function isCellInsideSomeCity(
  gameState: GameState,
  cell: CellPosition,
): boolean {
  for (const city of gameState.cities.values()) {
    if (isCellInsideCityBorder(city.position, cell)) {
      return true;
    }
  }
  return false;
}

function drawBoundingRectAround(
  visualState: VisualState,
  {
    cell,
    radius,
    color = 'black',
    gapped = false,
  }: {
    cell: CellPosition;
    radius: number;
    color?: string;
    gapped?: boolean;
  },
): void {
  const { ctx, cellSize } = visualState;

  const gap = gapped ? 10 : 0;
  ctx.beginPath();
  ctx.rect(
    (cell.i - radius - 0.5) * cellSize.width + gap,
    (cell.j - radius - 0.5) * cellSize.height + gap,
    cellSize.width * (radius * 2 + 1) - 2 * gap,
    cellSize.height * (radius * 2 + 1) - 2 * gap,
  );

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(128,128,200,0.2)';
  ctx.fill();
}

function iterateOverViewportCells(
  visualState: VisualState,
  callback: (cell: CellPosition) => void,
): void {
  const { start, end } = visualState.viewportBounds;

  for (let col = start.i; col <= end.i; col += 1) {
    for (let row = start.j; row <= end.j; row += 1) {
      const cell = newCellPosition({ i: col, j: row });
      callback(cell);
    }
  }
}

function isCellInsideCityBorder(
  cityCell: CellPosition,
  cell: CellPosition,
): boolean {
  return calculateDistanceSquare(cityCell, cell) < CITY_BORDER_RADIUS_SQUARE;
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
  const { cellSize } = visualState;
  const { i, j } = cellPosition;

  ctx.beginPath();
  ctx.rect(
    (i - 0.5) * cellSize.width,
    (j - 0.5) * cellSize.height,
    cellSize.width,
    cellSize.height,
  );
  ctx.fillStyle = cellColor;
  ctx.fill();
}

function drawBuildingMode(visualState: VisualState): void {
  const { hoverCell, interactiveAction } = visualState;
  if (!hoverCell) {
    return;
  }

  const isAllow = isAllowToConstructAtPosition(visualState, hoverCell);

  if (isAllow) {
    highlightCell(visualState, hoverCell, '#9c9');
  } else {
    highlightCell(visualState, hoverCell, '#e99');
  }

  if (
    interactiveAction &&
    interactiveAction.actionType ===
      InteractiveActionType.CONSTRUCTION_PLANNING &&
    interactiveAction.facilityType !== FacilityType.CITY
  ) {
    const constructionInfo =
      facilitiesConstructionInfo[interactiveAction.facilityType];

    if (constructionInfo.workArea) {
      drawBoundingRectAround(visualState, {
        cell: hoverCell,
        radius: constructionInfo.workArea.radius,
      });
    }
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
    const { ctx, zoom } = visualState;

    ctx.save();
    const cellCenter = getCellCenter(visualState, facility.position);
    ctx.translate(cellCenter.x, cellCenter.y);

    if (zoom >= 0.5) {
      drawStructureObject(visualState, facility);
      drawStructureInfo(visualState, facility);
      drawFacilityStorage(visualState, facility);
    } else {
      drawStructurePlaceholder(visualState, facility);
    }

    ctx.restore();
  }
}

function getCellCenter({ cellSize }: VisualState, cell: CellPosition): Point {
  return {
    x: cell.i * cellSize.width,
    y: cell.j * cellSize.height,
  };
}

function isCellInRectInclusive(rect: CellRect, point: CellPosition): boolean {
  return !(
    point.i < rect.start.i ||
    point.i > rect.end.i ||
    point.j < rect.start.j ||
    point.j > rect.end.j
  );
}

function addGap(point1: Point, point2: Point, gap: number): [Point, Point] {
  const x = point2.x - point1.x;
  const y = point2.y - point1.y;

  const distance = Math.sqrt(x ** 2 + y ** 2);
  const modifier1 = Math.min(0.4, gap / distance);
  const modifier2 = 1 - modifier1;

  return [
    { x: point1.x + x * modifier1, y: point1.y + y * modifier1 },
    { x: point1.x + x * modifier2, y: point1.y + y * modifier2 },
  ];
}

function getCarrierPathPoints(
  visualState: VisualState,
  path: CellPath,
): [Point, Point] {
  const fromCenter = getCellCenter(visualState, path.from);
  const toCenter = getCellCenter(visualState, path.to);
  return addGap(fromCenter, toCenter, visualState.zoom * 30);
}

function drawCarrierPath(
  visualState: VisualState,
  path: CellPath,
  { color, text }: { color: string; text?: string },
): void {
  const { ctx, zoom } = visualState;
  const [fromGapped, toGapped] = getCarrierPathPoints(visualState, path);
  const distance = calculateDistance(path.from, path.to) * zoom;

  const center = {
    x: (fromGapped.x + toGapped.x) / 2,
    y: (fromGapped.y + toGapped.y) / 2,
  };

  const dx = fromGapped.x - toGapped.x;
  const dy = fromGapped.y - toGapped.y;

  const angle = Math.atan2(dy, dx) + Math.PI / 2;

  const bezierOffset = distance * 3;

  const bx = bezierOffset * Math.cos(angle);
  const by = bezierOffset * Math.sin(angle);

  const cp = {
    x: center.x + bx,
    y: center.y + by,
  };

  ctx.beginPath();
  ctx.moveTo(fromGapped.x, fromGapped.y);
  // ctx.lineTo(toGapped.x, toGapped.y);
  ctx.bezierCurveTo(cp.x, cp.y, cp.x, cp.y, toGapped.x, toGapped.y);
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
  const { gameState, hoverCell } = visualState;

  if (!hoverCell) {
    return;
  }

  const structure = gameState.structuresByCellId.get(hoverCell.cellId);

  if (!structure) {
    return;
  }

  const inputPaths = gameState.carrierPathsToCellId.get(
    structure.position.cellId,
  );
  const outputPaths = gameState.carrierPathsFromCellId.get(
    structure.position.cellId,
  );

  if (inputPaths) {
    for (const carrierPath of inputPaths) {
      drawHoverCarrierPath(visualState, carrierPath, {
        idleColor: 'rgba(255,165,0,0.5)',
        activeColor: 'rgb(255,165,0)',
      });
    }
  }

  if (outputPaths) {
    for (const carrierPath of outputPaths) {
      drawHoverCarrierPath(visualState, carrierPath, {
        idleColor: 'rgba(94,94,237,0.7)',
        activeColor: 'rgb(94,94,237)',
      });
    }
  }
}

function drawHoverCarrierPath(
  visualState: VisualState,
  carrierPath: CarrierPath,
  {
    idleColor,
    activeColor,
  }: {
    idleColor: string;
    activeColor: string;
  },
): void {
  const { gameState } = visualState;
  const city = gameState.cities.get(carrierPath.assignedCityId)!;
  const pathReport = city.cityReport.lastTick.carrierPathReports.find(
    (pathReport) => isSamePath(pathReport.path, carrierPath.path),
  );

  const params = pathReport
    ? {
        text: humanFormat(pathReport.carriers),
        color: activeColor,
      }
    : { color: idleColor };

  drawCarrierPath(visualState, carrierPath.path, params);
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

    const report = city.cityReport.lastTick.facilityWorkerReports.find(
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

const cityDefaultInput: StorageItem[] = [
  {
    resourceType: ResourceType.FOOD,
    quantity: 0,
  },
  {
    resourceType: ResourceType.HOUSING,
    quantity: 0,
  },
];

function drawFacilityStorage(
  visualState: VisualState,
  facility: Structure,
): void {
  let planInput: StorageItem[];
  let planOutput: StorageItem[] | undefined;

  if (isCity(facility)) {
    planInput = cityDefaultInput;
  } else {
    const iterationInfo = getStructureIterationStorageInfo(facility);
    planInput = iterationInfo.input;
    planOutput = iterationInfo.output;
  }

  const input = combineStorageWithIteration(planInput, facility.input);

  if (input.length) {
    drawStorage(visualState, input, 'right');
  }

  const output = planOutput
    ? combineStorageWithIteration(planOutput, facility.output)
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
  const { ctx, zoom } = visualState;
  const center = (storage.length - 1) / 2;
  const isCompactMode = zoom < 1;

  const resourceLineHeight = isCompactMode
    ? RESOURCE_COMPACT_LINE_HEIGHT
    : RESOURCE_LINE_HEIGHT;

  for (let i = 0; i < storage.length; i += 1) {
    ctx.save();

    const offset = (i - center) * resourceLineHeight;

    if (align === 'left') {
      ctx.translate(18, offset);
    } else {
      ctx.translate(-18, offset);
    }

    const { resourceType, quantity } = storage[i];

    drawResourceIcon(ctx, resourceType);

    if (!isCompactMode) {
      let text = quantity.toFixed(1);

      if (DRAW_RESOURCE_NAMES) {
        const resourceName = resourceLocalization[resourceType] ?? 'Unknown';
        text += ` ${resourceName}`;
      }

      drawText(
        ctx,
        text,
        { x: align === 'left' ? 7 : -7, y: 1 },
        {
          align,
          baseline: 'middle',
          lineWidth: 3,
        },
      );
    }

    ctx.restore();
  }
}

function drawTopOverlay(visualState: VisualState): void {
  if (visualState.hoverCell) {
    const { ctx, canvasSize } = visualState;

    const text = `(${visualState.hoverCell.i},${visualState.hoverCell.j})`;

    drawText(
      ctx,
      text,
      { x: canvasSize.width, y: canvasSize.height },
      {
        align: 'right',
        baseline: 'bottom',
        lineWidth: 5,
        fontSize: 18,
      },
    );
  }
}

function drawDeposits(visualState: VisualState): void {
  const { gameState, viewportBounds } = visualState;

  for (const chunk of getBoundedChunks(gameState, visualState.viewportBounds)) {
    const depositsInfo = getChunkDeposits(gameState, chunk);

    for (const deposit of depositsInfo.deposits) {
      if (isRectsCollade(viewportBounds, deposit.boundingRect)) {
        for (const cellPosition of deposit.shape.cells) {
          drawDepositCell(visualState, cellPosition, deposit.depositType);
        }
      }
    }
  }
}

function drawDepositCell(
  visualState: VisualState,
  position: CellPosition,
  depositType: DepositType,
): void {
  const { ctx, viewportBounds, cellSize } = visualState;

  if (isPointInsideRect(viewportBounds, position)) {
    ctx.save();
    const cellCenter = getCellCenter(visualState, position);
    ctx.translate(cellCenter.x, cellCenter.y);

    const side = cellSize.height;

    ctx.beginPath();
    ctx.rect(-side * 0.5, -side * 0.5, side, side);
    switch (depositType) {
      case DepositType.STONE:
        ctx.fillStyle = 'gray';
        break;
      case DepositType.IRON:
        ctx.fillStyle = 'blue';
        break;
      case DepositType.COAL:
      case DepositType.OIL:
        ctx.fillStyle = 'black';
        break;
      default:
        throw neverCall(depositType);
    }

    ctx.fill();

    ctx.restore();
  }
}

function getBoundedChunks(
  gameState: GameState,
  bound: CellRect,
): ChunkIdentity[] {
  const { worldParams } = gameState;
  const { chunkSize } = worldParams;

  const results: ChunkIdentity[] = [];

  const startI = Math.floor(bound.start.i / chunkSize);
  const startJ = Math.floor(bound.start.j / chunkSize);
  const endI = Math.floor(bound.end.i / chunkSize);
  const endJ = Math.floor(bound.end.j / chunkSize);

  for (let j = startJ; j <= endJ; j += 1) {
    for (let i = startI; i <= endI; i += 1) {
      results.push(newChunkIdentity({ i: i * chunkSize, j: j * chunkSize }));
    }
  }

  return results;
}
