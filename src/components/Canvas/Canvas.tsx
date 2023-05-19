import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';

import styles from './Canvas.module.scss';

import { Facility, startGame } from '../../game/gameState';
import { renderGameToCanvas } from '../../gameRender/render';
import {
  VisualState,
  createVisualState,
  lookupFacilityByPoint,
  startGameLoop,
  visualStateMove,
  visualStateOnMouseMove,
} from '../../game/visualState';
import type { Point } from '../../game/types';
import { useForceUpdate } from '../hooks/forceUpdate';
import { FacilityModal } from '../FacilityModal';

const INITIAL_CANVAS_WIDTH = 800;
const INITIAL_CANVAS_HEIGHT = 600;

export function Canvas() {
  const forceUpdate = useForceUpdate();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const gameState = useMemo(() => startGame(), []);

  const mouseState = useMemo(
    () => ({
      isMouseDown: false,
    }),
    [],
  );
  const mousePos = useMemo<Point>(() => [0, 0], []);

  const visualStateRef = useRef<VisualState | undefined>();

  const showDialogForFacilityRef = useRef<Facility | undefined>();

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

  function actualizeMouseState(event: MouseEvent | React.MouseEvent) {
    if (showDialogForFacilityRef.current) {
      return;
    }

    mousePos[0] = event.clientX;
    mousePos[1] = event.clientY;

    if (!mouseState.isMouseDown && event.buttons === 1) {
      mouseState.isMouseDown = true;
      forceUpdate();
    } else if (mouseState.isMouseDown && event.buttons !== 1) {
      mouseState.isMouseDown = false;
      forceUpdate();
    }

    const visualState = visualStateRef.current;

    if (visualState) {
      if (mouseState.isMouseDown) {
        visualStateMove(visualState, [event.movementX, event.movementY]);
      }

      visualStateOnMouseMove(visualState, mousePos);
    }
  }

  useEffect(() => {
    window.addEventListener('mousemove', actualizeMouseState, {
      passive: true,
    });
    window.addEventListener('mouseup', actualizeMouseState, { passive: true });

    return () => {
      window.removeEventListener('mousemove', actualizeMouseState);
      window.removeEventListener('mouseup', actualizeMouseState);
    };
  }, []);

  function onMouseDown(event: React.MouseEvent) {
    event.preventDefault();
  }

  function onClick(event: React.MouseEvent) {
    if (event.button === 0) {
      event.preventDefault();

      const visualState = visualStateRef.current;

      if (visualState) {
        const facility = lookupFacilityByPoint(visualState, [
          event.clientX,
          event.clientY,
        ]);

        showDialogForFacilityRef.current = facility;
        visualStateOnMouseMove(visualState, undefined);

        forceUpdate();
      }
    }
  }

  return (
    <div className={styles.wrapper}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        data-drag={mouseState.isMouseDown || undefined}
        width={INITIAL_CANVAS_WIDTH}
        height={INITIAL_CANVAS_HEIGHT}
        onMouseDown={onMouseDown}
        onClick={onClick}
      />
      {showDialogForFacilityRef.current && (
        <div className={styles.modalWrapper}>
          <FacilityModal
            facility={showDialogForFacilityRef.current}
            onClose={() => {
              showDialogForFacilityRef.current = undefined;
              forceUpdate();
            }}
          />
        </div>
      )}
    </div>
  );
}
