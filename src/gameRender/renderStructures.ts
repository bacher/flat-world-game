import { FacilityLikeType, FacilityType, Structure } from '@/game/types';
import { VisualState } from '@/game/visualState';
import { neverCall } from '@/utils/typeUtils';

const SQRT2 = Math.sqrt(2);
const SQRT2_R = 1 / SQRT2;

export function drawStructureObject(
  visualState: VisualState,
  structure: Structure,
): void {
  const { ctx, cellSize } = visualState;
  let drawFacilityType: FacilityLikeType | FacilityType.CITY;

  if (structure.type === FacilityType.CONSTRUCTION) {
    drawFacilityType = structure.buildingFacilityType;
  } else {
    drawFacilityType = structure.type;
  }

  ctx.beginPath();

  switch (drawFacilityType) {
    case FacilityType.CITY:
      ctx.arc(0, 0, 14, 0, 2 * Math.PI, true);
      ctx.fillStyle = 'black';
      ctx.fill();
      break;
    case FacilityType.LUMBER:
      ctx.moveTo(0, -15);
      ctx.lineTo(-15, 12);
      ctx.lineTo(15, 12);
      ctx.closePath();
      ctx.fillStyle = 'green';
      ctx.fill();
      break;
    case FacilityType.CHOP_WOOD:
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
    case FacilityType.GATHERING_2:
      ctx.moveTo(-12, -4);
      ctx.lineTo(-9, 8);
      ctx.lineTo(9, 8);
      ctx.lineTo(12, -4);
      ctx.closePath();
      ctx.rect(-2, -12, 4, 8);
      ctx.fillStyle = 'brown';
      ctx.fill();

      if (drawFacilityType === FacilityType.GATHERING_2) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText('II', 0, 2);
      }
      break;
    case FacilityType.KITCHEN:
      ctx.moveTo(-12, -8);
      ctx.lineTo(-9, 8);
      ctx.lineTo(9, 8);
      ctx.lineTo(12, -8);
      ctx.closePath();
      ctx.rect(-2, -12, 4, 8);
      ctx.fillStyle = 'gray';
      ctx.fill();
      break;
    case FacilityType.HUNTERS_BOOTH:
    case FacilityType.HUNTERS_BOOTH_2:
      ctx.arc(-9, 0, 15, -0.4 * Math.PI, 0.4 * Math.PI);
      ctx.strokeStyle = 'brown';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-4, -15);
      ctx.lineTo(-4, 15);
      ctx.strokeStyle = 'gray';
      ctx.stroke();

      if (drawFacilityType === FacilityType.HUNTERS_BOOTH_2) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000';
        ctx.fillText('II', 0, 1);
      }
      break;
    case FacilityType.WORK_SHOP:
      ctx.moveTo(-10, -7);
      ctx.lineTo(-10, 8);
      ctx.lineTo(10, 8);
      ctx.lineTo(10, -7);
      ctx.lineTo(0, -11);
      ctx.closePath();
      ctx.fillStyle = 'brown';
      ctx.fill();
      break;
    case FacilityType.FIELD:
      ctx.rect(-12, -12, 24, 24);
      ctx.fillStyle = 'orange';
      ctx.fill();
      break;
    case FacilityType.STABLE:
      ctx.rect(-10, -5, 20, 9);
      ctx.rect(-12, -12, 5, 7);
      ctx.rect(-10, 4, 2, 6);
      ctx.rect(-6, 4, 2, 6);
      ctx.rect(6, 4, 2, 6);
      ctx.rect(10, 4, 2, 6);
      ctx.rect(10, -5, 4, 2);
      ctx.fillStyle = 'brown';
      ctx.fill();
      break;
    case FacilityType.ANCIENT_FACTORY:
    case FacilityType.HOUSING_FACTORY:
      ctx.moveTo(-10, 10);
      ctx.lineTo(-10, -5);
      ctx.lineTo(-5, -10);
      ctx.lineTo(-5, -5);
      ctx.lineTo(0, -10);
      ctx.lineTo(0, -5);
      ctx.lineTo(5, -10);
      ctx.lineTo(5, -5);
      ctx.lineTo(10, -10);
      ctx.lineTo(10, -5);
      ctx.lineTo(10, 10);
      ctx.closePath();
      if (drawFacilityType === FacilityType.ANCIENT_FACTORY) {
        ctx.fillStyle = '#8e4ee8';
      } else {
        ctx.fillStyle = 'brown';
      }
      ctx.fill();
      break;
    case FacilityType.INTERCITY_SENDER:
    case FacilityType.INTERCITY_RECEIVER: {
      const colors =
        drawFacilityType === FacilityType.INTERCITY_SENDER
          ? {
              main: 'blue',
              second: 'orange',
            }
          : {
              main: 'orange',
              second: 'blue',
            };

      ctx.arc(0, -2, 9, 0, Math.PI);
      ctx.lineWidth = 3;
      ctx.strokeStyle = colors.main;
      ctx.stroke();
      ctx.lineWidth = 1;

      ctx.beginPath();
      if (drawFacilityType === FacilityType.INTERCITY_SENDER) {
        ctx.moveTo(-4, -5);
        ctx.lineTo(0, 1);
        ctx.lineTo(4, -5);
      } else {
        ctx.moveTo(-4, 0);
        ctx.lineTo(0, -6);
        ctx.lineTo(4, 0);
      }
      ctx.closePath();
      ctx.fillStyle = colors.second;
      ctx.fill();
      break;
    }
    case FacilityType.QUARRY:
      ctx.moveTo(-10, -4);
      ctx.lineTo(-8, 4);
      ctx.lineTo(8, 4);
      ctx.lineTo(10, -4);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000';
      ctx.stroke();
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
      neverCall(drawFacilityType, true);
  }

  if (structure.type === FacilityType.CONSTRUCTION) {
    ctx.beginPath();
    ctx.rect(
      -cellSize.width / 2 + 1,
      -cellSize.height / 2 + 1,
      cellSize.width - 2,
      cellSize.height - 2,
    );
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();
  }

  if (structure.type === FacilityType.CITY) {
    const city = structure;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.strokeStyle = 'white';
    ctx.fillStyle = 'black';
    ctx.lineWidth = 3;

    ctx.strokeText(city.name, 0, 28);
    ctx.fillText(city.name, 0, 28);

    const populationText = Math.floor(city.population).toString();
    const needPopulationText = city.cityReport.population.lastTick.toString();
    const rest = `/${populationText}`;
    const text = `${needPopulationText}${rest}`;
    if (city.population >= city.cityReport.population.lastTick) {
      ctx.fillStyle = 'green';
    } else {
      ctx.fillStyle = 'red';
    }
    ctx.textAlign = 'right';
    ctx.strokeText(text, 18, 14);
    ctx.fillText(text, 18, 14);

    ctx.fillStyle = '#000';
    ctx.strokeText(rest, 18, 14);
    ctx.fillText(rest, 18, 14);

    ctx.lineWidth = 1;
  }
}

export function drawStructurePlaceholder(
  visualState: VisualState,
  structure: Structure,
): void {
  const { ctx, cellSize } = visualState;
  const w = Math.min(cellSize.width, cellSize.height);
  const w2 = w * 0.5;

  ctx.beginPath();

  switch (structure.type) {
    case FacilityType.CITY:
      ctx.arc(0, 0, w2 * 0.6, 0, 2 * Math.PI);
      ctx.fillStyle = '#000';
      ctx.fill();
      break;
    case FacilityType.INTERCITY_SENDER: {
      const y1 = -0.2 * w;
      const y2 = 0.6 * SQRT2_R * w - 0.2 * w;
      ctx.moveTo(-0.3 * w, y1);
      ctx.lineTo(0, y2);
      ctx.lineTo(0.3 * w, y1);
      ctx.closePath();
      ctx.fillStyle = 'orange';
      ctx.fill();
      break;
    }
    case FacilityType.INTERCITY_RECEIVER: {
      const y1 = 0.6 * SQRT2_R * w - 0.25 * w;
      const y2 = -0.25 * w;
      ctx.moveTo(-0.3 * w, y1);
      ctx.lineTo(0, y2);
      ctx.lineTo(0.3 * w, y1);
      ctx.closePath();
      ctx.fillStyle = 'blue';
      ctx.fill();
      break;
    }
    default:
      ctx.rect(-w2 * 0.5, -w2 * 0.5, w * 0.5, w * 0.5);
      ctx.fillStyle = 'gray';
      ctx.fill();
  }
}
