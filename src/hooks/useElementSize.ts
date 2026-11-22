import { useLayoutEffect, useState, type RefObject } from 'react';

export type TElementSize = {
  width: number;
  height: number;
};

export function useElementSize(ref: RefObject<HTMLElement | null>): TElementSize {
  const [size, setSize] = useState<TElementSize>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = (width: number, height: number) =>
      setSize((current) =>
        current.width === width && current.height === height ? current : { width, height }
      );
    update(element.clientWidth, element.clientHeight);
    const observer = new ResizeObserver(([entry]) => {
      update(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
