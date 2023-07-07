import { ResourceType } from '@/game/resources';
import { neverCall } from '@/utils/typeUtils';

export function drawResourceIcon(
  ctx: CanvasRenderingContext2D,
  resourceType: ResourceType,
): void {
  switch (resourceType) {
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
    case ResourceType.AGRICULTURAL_TOOLS:
      ctx.beginPath();
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
      ctx.beginPath();
      ctx.rect(-5, -5, 10, 10);
      ctx.fillStyle = 'orange';
      ctx.fill();
      break;
    case ResourceType.HORSE:
      ctx.beginPath();
      ctx.moveTo(-5, -4);
      ctx.lineTo(5, -4);
      ctx.lineTo(3, 2);
      ctx.lineTo(-3, 2);
      ctx.fillStyle = 'brown';
      ctx.fill();
      break;
    case ResourceType.REED:
      ctx.beginPath();
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
      ctx.beginPath();
      ctx.rect(-4, -4, 8, 8);
      ctx.closePath();
      ctx.fillStyle = 'yellow';
      ctx.fill();
      ctx.strokeStyle = 'black';
      ctx.stroke();
      break;
    case ResourceType.TEA_LEAVES:
      ctx.beginPath();
      ctx.ellipse(-1, 0, 3, 5, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = 'green';
      ctx.fill();
      break;
    case ResourceType.TEA:
      ctx.beginPath();
      ctx.moveTo(-5, -5);
      ctx.lineTo(-2, 5);
      ctx.lineTo(2, 5);
      ctx.lineTo(5, -5);
      ctx.closePath();
      ctx.fillStyle = 'orange';
      ctx.fill();
      break;
    default:
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2, true);
      ctx.fillStyle = 'black';
      ctx.fill();
      console.warn(`No render function for resource ${resourceType}`);
      neverCall(resourceType, true);
  }
}
