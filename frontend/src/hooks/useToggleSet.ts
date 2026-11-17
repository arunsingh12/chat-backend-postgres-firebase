import { useCallback, useState } from 'react';

/** Immutable Set state with toggle semantics (multi-select lists). */
export const useToggleSet = <T = string>() => {
  const [values, setValues] = useState<ReadonlySet<T>>(() => new Set());

  const toggle = useCallback((value: T) => {
    setValues((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const clear = useCallback(() => setValues(new Set()), []);

  return { values, toggle, clear };
};
