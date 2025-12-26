import { useEffect, useState } from 'react';

import { Trans } from '@kit/ui/trans';

// Store previous values globally to survive component recreations
const previousValues = new Map<string, number>();

export function MagicCounter(props: {
  count: number | string;
  i18nKey: string;
}) {
  const [displayCount, setDisplayCount] = useState(() => {
    // Use a unique key based on the count to identify this counter instance
    const targetCount =
      typeof props.count === 'string'
        ? parseInt(props.count.replace(/,/g, ''), 10) || 0
        : props.count;

    return targetCount;
  });

  useEffect(() => {
    const targetCount =
      typeof props.count === 'string'
        ? parseInt(props.count.replace(/,/g, ''), 10) || 0
        : props.count;

    // Create a unique key for this counter
    const counterKey = 'magic-counter';
    const previousValue = previousValues.get(counterKey);

    // First time - just set the value and store it
    if (previousValue === undefined) {
      setDisplayCount(targetCount);
      previousValues.set(counterKey, targetCount);
      return;
    }

    // Don't animate if same value
    if (targetCount === previousValue) {
      return;
    }

    const startValue = previousValue;
    const difference = Math.abs(targetCount - startValue);
    const isIncreasing = targetCount > startValue;

    const duration = difference > 1000 ? 800 : difference > 100 ? 600 : 400;
    const steps = 20;

    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;

      if (currentStep >= steps) {
        setDisplayCount(targetCount);
        previousValues.set(counterKey, targetCount); // Store after animation completes
        clearInterval(timer);
        return;
      }

      const progress = currentStep / steps;

      // Enhanced easing - gentler ease-out-back with subtle bounce
      const c1 = 1.2; // Reduced from 1.70158 for more subtle bounce
      const c3 = c1 + 1;

      const easeOutBack =
        1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);

      // For very large differences, use gentler easing to avoid jarring motion
      const easedProgress =
        difference > 5000
          ? 1 - Math.pow(1 - progress, 3.5) // Even gentler ease-out for large numbers
          : Math.min(easeOutBack, 1); // Subtle ease-out-back with gentle overshoot

      const animatedDiff = difference * easedProgress;

      const displayValue = isIncreasing
        ? startValue + Math.floor(animatedDiff)
        : startValue - Math.floor(animatedDiff);

      setDisplayCount(displayValue);
    }, duration / steps);

    return () => clearInterval(timer);
  }, [props.count]);

  return <Trans i18nKey={props.i18nKey} values={{ count: displayCount }} />;
}
