import { useRef, useEffect } from "react";

/**
 * Hook for running a requestAnimationFrame-driven loop with pause/resume support.
 * @param {Function} frameCallback Called every frame (dt in seconds)
 * @param {boolean} running Whether loop is active
 */
export function useGameLoop(frameCallback, running = true) {
  const runningRef = useRef(running);

  useEffect(() => { runningRef.current = running; }, [running]);

  useEffect(() => {
    let prev = performance.now();
    let req;
    function loop(now) {
      if (!runningRef.current) return;
      const dt = Math.min((now - prev) / 1000, 0.07); // Clamp delta
      prev = now;
      frameCallback(dt);
      req = requestAnimationFrame(loop);
    }
    if (runningRef.current) {
      req = requestAnimationFrame(loop);
    }
    return () => req && cancelAnimationFrame(req);
    // eslint-disable-next-line
  }, [frameCallback]);
}

/**
 * useKeyboard hook: map of pressed keys for arrow/A/D controls.
 */
export function useKeyboard() {
  const keys = useRef({});
  useEffect(() => {
    function on(e) { keys.current[e.code] = true; }
    function off(e) { keys.current[e.code] = false; }
    window.addEventListener("keydown", on);
    window.addEventListener("keyup", off);
    return () => {
      window.removeEventListener("keydown", on);
      window.removeEventListener("keyup", off);
    };
  }, []);
  return keys;
}

/**
 * useResize hook: triggers callback on window resize, sends {width, height}
 */
export function useResize(onResize) {
  useEffect(() => {
    function handler() {
      onResize({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener("resize", handler);
    handler();
    return () => window.removeEventListener("resize", handler);
  }, [onResize]);
}
