import { useEffect, useMemo, useState } from "react";

interface CountUpProps {
  value: number;
  durationMs?: number;
  prefix?: string;
  suffix?: string;
}

export default function CountUp({ value, durationMs = 900, prefix = "", suffix = "" }: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const target = useMemo(() => Math.max(0, Number(value || 0)), [value]);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return <>{`${prefix}${display.toLocaleString()}${suffix}`}</>;
}
