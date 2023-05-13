import { useEffect, useMemo, useRef } from 'react';

import styles from './Canvas.module.scss';

import { startGame } from '../../game/gameState';
import { renderGameToCanvas } from '../../gameRender/render';
import {
  VisualState,
  createVisualState,
  startGameLoop,
  visualStateOnMouseMove,
} from '../../game/visualState';
import type { Point } from '../../game/types';

const INITIAL_CANVAS_WIDTH = 800;
const INITIAL_CANVAS_HEIGHT = 600;

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const gameState = useMemo(() => startGame(), []);

  const mousePos = useMemo<Point>(() => [0, 0], []);

  const visualStateRef = useRef<VisualState | undefined>();

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d', {
      alpha: false,
      willReadFrequently: false,
    });

    if (!ctx) {
      throw new Error('No 2d context');
    }

    visualStateRef.current = createVisualState(gameState, ctx);
    visualStateOnMouseMove(visualStateRef.current, mousePos);
    renderGameToCanvas(visualStateRef.current);
    return startGameLoop(visualStateRef.current);
  }, []);

  useEffect(() => {
    function mouseMoveHandler(event: MouseEvent) {
      mousePos[0] = event.clientX;
      mousePos[1] = event.clientY;

      if (visualStateRef.current) {
        visualStateOnMouseMove(visualStateRef.current, mousePos);
      }
    }

    window.addEventListener('mousemove', mouseMoveHandler, { passive: true });

    return () => {
      window.removeEventListener('mousemove', mouseMoveHandler);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      width={INITIAL_CANVAS_WIDTH}
      height={INITIAL_CANVAS_HEIGHT}
    />
  );
}
