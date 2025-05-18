import React, { CSSProperties, memo, useEffect, useRef, useState } from 'react';

interface ProgressBarProps {
  current?: number;
  total?: number;
  simulatedTotal?: number;
  simulatedDurationMs?: number;
  simulatedResetKey?: string | number;
  height?: CSSProperties['height'];
}

const DEFAULT_MS = 300;

const ProgressBar = memo(
  ({
    current = 0,
    total = 0,
    simulatedTotal = 0,
    simulatedDurationMs = 5000,
    simulatedResetKey,
    height = '10px',
  }: ProgressBarProps) => {
    const [visible, setVisible] = useState(false);
    const [simulatedCurrent, setSimulatedCurrent] = useState(0);
    const [reseting, setReseting] = useState(false);
    const [transitionTime, setTransTime] = useState<number | undefined>(DEFAULT_MS);
    const simulatedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const totalUnits = total + simulatedTotal;
    const realProgress = total > 0 ? (current / total) * 100 : 0;
    const totalProgress = totalUnits > 0 ? ((current + simulatedCurrent) / totalUnits) * 100 : 100;

    const resultProgress = realProgress >= 100 ? 100 : totalProgress;

    const waitNextFrame = () => {
      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 50);
        });
      });
    };

    //reset simulated progress and start it
    useEffect(() => {
      const runsimulatedProgress = async () => {
        setSimulatedCurrent(0);
        setReseting(true);
        setVisible(false);

        await waitNextFrame();

        setReseting(false);
        setTransTime(simulatedDurationMs);

        await waitNextFrame();

        setVisible(true);
        setSimulatedCurrent(simulatedTotal);
        simulatedTimeoutRef.current = setTimeout(() => {
          setTransTime(DEFAULT_MS);
          simulatedTimeoutRef.current = null;
        }, simulatedDurationMs);
      };

      runsimulatedProgress();
      return () => {
        if (simulatedTimeoutRef.current !== null) {
          clearTimeout(simulatedTimeoutRef.current);
          simulatedTimeoutRef.current = null;
        }
      };
    }, [simulatedResetKey]); // eslint-disable-line react-hooks/exhaustive-deps

    // If there are current real progress, reset the transition time to reflect actual progress
    useEffect(() => {
      if (current > 0 && transitionTime !== DEFAULT_MS) {
        setTransTime(DEFAULT_MS);
      }
    }, [current, transitionTime]);

    //hide progress bar after finish or show it if it should be visible
    useEffect(() => {
      if (resultProgress >= 100) {
        const time = total <= 0 && simulatedTotal > 0 ? transitionTime : DEFAULT_MS;
        const timeout = setTimeout(() => setVisible(false), time);
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => setVisible(true), DEFAULT_MS);
        return () => clearTimeout(timeout);
      }
    }, [simulatedTotal, resultProgress, total, transitionTime]);

    const style: CSSProperties = {
      width: `${reseting ? 0 : resultProgress}%`,
      transition: `width ${reseting ? 0 : transitionTime}ms linear`,
    };

    return (
      <div
        className={`progress-bar-container ${visible && !reseting ? '' : 'hidden'}`}
        style={{ height: height }}
      >
        <div
          className={`progress-bar-fill ${visible ? '' : 'no-transition'}`} //
          style={style}
        />
      </div>
    );
  },
);

ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;
