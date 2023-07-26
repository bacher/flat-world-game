import { ResourceType } from '@/game/resources';
import { neverCall } from '@/utils/typeUtils';

export function drawResourceIcon(
  ctx: CanvasRenderingContext2D,
  resourceType: ResourceType,
): void {
  ctx.beginPath();

  switch (resourceType) {
    case ResourceType.LOG:
      ctx.moveTo(-5, -3);
      ctx.lineTo(5, -3);
      ctx.lineTo(5, 3);
      ctx.lineTo(-5, 3);
      ctx.fillStyle = 'brown';
      ctx.fill();
      break;
    case ResourceType.ROUTH_LUMBER:
      ctx.fillStyle = 'brown';
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
      ctx.arc(0, 0, 5, 0, Math.PI * 2, true);
      ctx.fillStyle = 'orange';
      ctx.fill();
      break;
    case ResourceType.FRUIT:
      ctx.arc(0, 0, 5, 0, Math.PI * 2, true);
      ctx.fillStyle = 'red';
      ctx.fill();
      ctx.beginPath();
      ctx.rect(2, -6, 2, 4);
      ctx.fillStyle = 'green';
      ctx.fill();
      break;
    case ResourceType.VEGETABLE:
      ctx.strokeStyle = '#fff';
      ctx.fillStyle = 'green';
      ctx.ellipse(0, 2, 6, 2, 0, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 2, Math.PI / 4, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fill();
      break;
    case ResourceType.NUT:
      ctx.arc(0, 0, 5, 0, Math.PI * 2, true);
      ctx.fillStyle = '#be633b';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, -2, 6, 4, 0, Math.PI, 2 * Math.PI);
      ctx.fillStyle = 'brown';
      ctx.fill();
      break;
    case ResourceType.MEAT:
      ctx.arc(0, 0, 4, 0, 2 * Math.PI, true);
      ctx.fillStyle = 'red';
      ctx.fill();
      ctx.beginPath();
      ctx.rect(-1, -1, 2, 7);
      ctx.fillStyle = 'lightgray';
      ctx.fill();
      break;
    case ResourceType.FRIED_MEAT:
      ctx.arc(0, 0, 5, 0, Math.PI * 2, true);
      ctx.fillStyle = 'brown';
      ctx.fill();
      ctx.rect(0, -3, 2, 7);
      ctx.fillStyle = '#fff';
      ctx.fill();
      break;
    case ResourceType.VEGAN_MEAL:
      ctx.arc(0, 0, 5, 0, Math.PI, true);
      ctx.fillStyle = 'brown';
      ctx.fill();
      ctx.beginPath();
      ctx.beginPath();
      ctx.arc(0, 0, 5, Math.PI, 2 * Math.PI, true);
      ctx.fillStyle = 'green';
      ctx.fill();
      break;
    case ResourceType.COMPLEX_MEAL:
      ctx.arc(0, 0, 5, 0, Math.PI, true);
      ctx.fillStyle = 'brown';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 5, Math.PI, 1.5 * Math.PI, true);
      ctx.fillStyle = 'red';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 5, 1.5 * Math.PI, 2 * Math.PI, true);
      ctx.fillStyle = 'green';
      ctx.fill();
      break;
    case ResourceType.BASKET:
      ctx.moveTo(-5, -2);
      ctx.lineTo(-4, 4);
      ctx.lineTo(4, 4);
      ctx.lineTo(5, -2);
      ctx.closePath();
      ctx.rect(-1, -6, 2, 4);
      ctx.fillStyle = 'brown';
      ctx.fill();
      break;
    case ResourceType.AGRICULTURAL_TOOLS:
      ctx.moveTo(0, 6);
      ctx.lineTo(0, -2);
      ctx.lineTo(-3, -5);
      ctx.moveTo(0, -2);
      ctx.lineTo(0, -5);
      ctx.moveTo(0, -2);
      ctx.lineTo(3, -5);
      ctx.strokeStyle = '#000';
      ctx.stroke();
      break;
    case ResourceType.HAY:
      ctx.rect(-5, -5, 10, 10);
      ctx.fillStyle = 'orange';
      ctx.fill();
      break;
    case ResourceType.HORSE:
      ctx.moveTo(-5, -4);
      ctx.lineTo(5, -4);
      ctx.lineTo(3, 2);
      ctx.lineTo(-3, 2);
      ctx.fillStyle = 'brown';
      ctx.fill();
      break;
    case ResourceType.REED:
      ctx.rect(-1, -4, 2, 12);
      ctx.closePath();
      ctx.fillStyle = 'black';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, -4, 3, 4, 0, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = 'green';
      ctx.fill();
      break;
    case ResourceType.PAPYRUS:
      ctx.rect(-4, -4, 8, 8);
      ctx.closePath();
      ctx.fillStyle = 'yellow';
      ctx.fill();
      ctx.strokeStyle = 'black';
      ctx.stroke();
      break;
    case ResourceType.TEA_LEAVES:
      ctx.ellipse(-1, 0, 3, 5, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = 'green';
      ctx.fill();
      break;
    case ResourceType.TEA:
      ctx.moveTo(-5, -5);
      ctx.lineTo(-2, 5);
      ctx.lineTo(2, 5);
      ctx.lineTo(5, -5);
      ctx.closePath();
      ctx.fillStyle = 'orange';
      ctx.fill();
      break;
    case ResourceType.WOODEN_BOW:
      ctx.arc(-3, 0, 5, -0.4 * Math.PI, 0.4 * Math.PI);
      ctx.strokeStyle = 'brown';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-2, -5);
      ctx.lineTo(-2, 5);
      ctx.strokeStyle = 'gray';
      ctx.stroke();
      break;
    case ResourceType.HOUSING:
      ctx.moveTo(-5, -1);
      ctx.lineTo(0, -4);
      ctx.lineTo(5, -1);
      ctx.closePath();
      ctx.fillStyle = 'brown';
      ctx.fill();
      ctx.beginPath();
      ctx.rect(-4, -1, 8, 5);
      ctx.fillStyle = 'gray';
      ctx.fill();
      break;
    case ResourceType.WICKIUP:
      ctx.moveTo(-6, 4);
      ctx.lineTo(0, -4);
      ctx.lineTo(6, 4);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'brown';
      ctx.stroke();
      ctx.lineWidth = 1;
      break;
    case ResourceType.HOVEL:
    case ResourceType.COTTAGE:
      ctx.moveTo(-6, 4);
      ctx.lineTo(0, -4);
      ctx.lineTo(6, 4);
      ctx.closePath();
      if (resourceType === ResourceType.COTTAGE) {
        ctx.fillStyle = 'gray';
      } else {
        ctx.fillStyle = 'brown';
      }
      ctx.fill();
      break;
    case ResourceType.STONE:
      ctx.arc(0, 0, 5, 0, 2 * Math.PI);
      ctx.fillStyle = 'gray';
      ctx.fill();
      break;
    case ResourceType.IRON_ORE:
      ctx.arc(0, 0, 5, 0, 2 * Math.PI);
      ctx.fillStyle = 'blue';
      ctx.fill();
      break;
    case ResourceType.IRON:
      ctx.rect(-4, -3, 8, 6);
      ctx.fillStyle = 'blue';
      ctx.fill();
      break;
    case ResourceType.COAL:
    case ResourceType.OIL:
      ctx.arc(0, 0, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#000';
      ctx.fill();
      break;
    default:
      ctx.arc(0, 0, 5, 0, Math.PI * 2, true);
      ctx.fillStyle = 'black';
      ctx.fill();
      console.warn(`No render function for resource ${resourceType}`);
      neverCall(resourceType, true);
  }
}
