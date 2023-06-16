import { Structure } from '../game/gameState';
import { FacilityType } from '../game/types';
import { VisualState } from '../game/visualState';

export function drawStructureObject(
  visualState: VisualState,
  structure: Structure,
): void {
  const { ctx, cellSize } = visualState;
  let drawFacilityType = structure.type;

  if (structure.type === FacilityType.CONSTRUCTION) {
    drawFacilityType = structure.buildingFacilityType;
  }

  switch (drawFacilityType) {
    case FacilityType.CITY:
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, 2 * Math.PI, true);
      ctx.fillStyle = 'black';
      ctx.fill();
      break;
    case FacilityType.LUMBERT:
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
    case FacilityType.WORK_SHOP:
      ctx.beginPath();
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
      ctx.beginPath();
      ctx.rect(-12, -12, 24, 24);
      ctx.fillStyle = 'orange';
      ctx.fill();
      break;
    case FacilityType.HORSE_HOUSE:
      ctx.beginPath();
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

  if (structure.type === FacilityType.CONSTRUCTION) {
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
    const needPopulationText = city.lastTickNeedPopulation.toString();
    const text = `${needPopulationText}/${populationText}`;
    if (city.population >= city.lastTickNeedPopulation) {
      ctx.fillStyle = 'green';
    } else {
      ctx.fillStyle = 'red';
    }
    ctx.textAlign = 'right';
    ctx.strokeText(text, 18, 14);
    ctx.fillText(text, 18, 14);

    ctx.lineWidth = 1;
  }
}
