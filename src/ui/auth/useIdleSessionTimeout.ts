import { useEffect, useRef } from "preact/hooks";

const MOUSEMOVE_THROTTLE_MS = 30_000;

const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "click",
  "scroll",
  "touchstart",
] as const;

export function useIdleSessionTimeout(
  timeoutMinutes: number,
  onIdle: () => void,
): void {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (timeoutMinutes <= 0) {
      return;
    }

    const timeoutMs = timeoutMinutes * 60 * 1000;
    let timerId = 0;
    let lastMouseMoveAt = 0;
    let fired = false;

    function fireIdle() {
      if (fired) {
        return;
      }
      fired = true;
      onIdleRef.current();
    }

    function resetTimer() {
      window.clearTimeout(timerId);
      timerId = window.setTimeout(fireIdle, timeoutMs);
    }

    function handleActivity(event: Event) {
      if (fired) {
        return;
      }

      if (event.type === "mousemove") {
        const now = Date.now();
        if (now - lastMouseMoveAt < MOUSEMOVE_THROTTLE_MS) {
          return;
        }
        lastMouseMoveAt = now;
      }

      resetTimer();
    }

    resetTimer();

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }
    window.addEventListener("mousemove", handleActivity, { passive: true });

    return () => {
      window.clearTimeout(timerId);
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleActivity);
      }
      window.removeEventListener("mousemove", handleActivity);
    };
  }, [timeoutMinutes]);
}
