import { useCallback, useEffect, useRef, useState } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type UseFieldAutosaveOptions<T> = {
  initialValue: T;
  onSave: (nextValue: T) => Promise<void>;
  debounceMs?: number;
};

export function useFieldAutosave<T>({ initialValue, onSave, debounceMs = 400 }: UseFieldAutosaveOptions<T>) {
  const [currentValue, setCurrentValue] = useState<T>(initialValue);
  const [lastSavedValue, setLastSavedValue] = useState<T>(initialValue);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const latestRequestIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<T>(initialValue);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (savedStateTimerRef.current) {
        clearTimeout(savedStateTimerRef.current);
      }
    };
  }, []);

  const setValue = useCallback(
    (nextValue: T) => {
      setCurrentValue(nextValue);
      setErrorMessage("");

      if (Object.is(nextValue, lastSavedRef.current)) {
        setStatus("idle");

        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }

        return;
      }

      setStatus("saving");

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const requestId = ++latestRequestIdRef.current;

      timerRef.current = setTimeout(async () => {
        try {
          await onSave(nextValue);

          if (requestId !== latestRequestIdRef.current) {
            return;
          }

          setLastSavedValue(nextValue);
          lastSavedRef.current = nextValue;
          setStatus("saved");

          if (savedStateTimerRef.current) {
            clearTimeout(savedStateTimerRef.current);
          }

          savedStateTimerRef.current = setTimeout(() => {
            setStatus((currentStatus) => (currentStatus === "saved" ? "idle" : currentStatus));
          }, 1000);
        } catch (error) {
          if (requestId !== latestRequestIdRef.current) {
            return;
          }

          setCurrentValue(lastSavedRef.current);
          setStatus("error");
          setErrorMessage(error instanceof Error ? error.message : "Unable to save changes.");
        }
      }, debounceMs);
    },
    [debounceMs, onSave]
  );

  return {
    currentValue,
    lastSavedValue,
    setValue,
    status,
    errorMessage,
  };
}
