import { useEffect, useRef } from "react";
import { notifyWarning } from "../services/notification";

const SLOW_LOAD_MS = 8000;

/**
 * Shows a warning toast if loading stays true longer than 8 seconds.
 */
export function useSlowLoadingWarning(loading: boolean, enabled = true): void {
  const shownRef = useRef(false);

  useEffect(() => {
    if (!enabled || !loading) {
      shownRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      if (!shownRef.current) {
        shownRef.current = true;
        notifyWarning(
          "Taking longer than usual",
          "The system is taking longer than expected. Please wait or refresh the page.",
        );
      }
    }, SLOW_LOAD_MS);

    return () => clearTimeout(timer);
  }, [loading, enabled]);
}

export default useSlowLoadingWarning;
