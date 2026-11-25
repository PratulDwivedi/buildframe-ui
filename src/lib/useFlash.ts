"use client";

import * as React from "react";

/**
 * A message that shows for a moment and goes away by itself: `const [on, flash, clear] = useFlash(3000)`. `flash()` turns it on (a second
 * call restarts the time); `clear()` turns it off at once. The timer is cleaned up when the screen goes away.
 */
export function useFlash(ms = 3000): [boolean, () => void, () => void] {
  const [on, setOn] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setOn(false);
  }, []);
  const flash = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setOn(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setOn(false);
    }, ms);
  }, [ms]);
  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return [on, flash, clear];
}
