import { useEffect, useState, type RefObject } from 'react';

export type TElementSize = {
  width: number;
  height: number;
};

export function useElementSize(ref: RefObject<HTMLElement | null>): TElementSize {
  const [size, setSize] = useState<TElementSize>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((current) =>
        current.width === width && current.height === height ? current : { width, height }
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
