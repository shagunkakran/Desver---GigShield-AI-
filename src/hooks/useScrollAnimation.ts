import { useEffect, useRef, useState } from "react";

export function useScrollAnimation(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

/**
 * Simple count-up hook.
 * - start: starting number
 * - end: target number
 * - trigger: when true, animate from start -> end once
 * Returns a stringified value (safe for interpolation in UI).
 */
export function useCountUp(start: number, end: number, trigger: boolean) {
  const [value, setValue] = useState<number>(start);

  useEffect(() => {
    if (!trigger) {
      setValue(start);
      return;
    }

    let raf = 0;
    const duration = 800; // ms
    const t0 = performance.now();

    const step = (t: number) => {
      const progress = Math.min(1, (t - t0) / duration);
      const current = Math.round(start + (end - start) * progress);
      setValue(current);
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, start, end]);

  return String(value);
}
