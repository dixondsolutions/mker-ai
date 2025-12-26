import { useState } from 'react';
import { useEffect } from 'react';
import { useMemo } from 'react';

import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { cn } from '@kit/ui/utils';

/**
 * Hook to add a shadow to a scrollable div
 * @param scrollableDivRef - The ref to the scrollable div
 * @returns The isScrolledY and isScrolledX values and the className to apply to the scrollable div
 */
export function useScrollableDivShadow(
  scrollableDivRef: React.RefObject<HTMLElement | null>,
) {
  const subject$ = useMemo(
    () => new Subject<{ isScrolledY: boolean; isScrolledX: boolean }>(),
    [],
  );

  const [isScrolledY, setIsScrolledY] = useState(false);
  const [isScrolledX, setIsScrolledX] = useState(false);

  useEffect(() => {
    // scrollable area
    const element = scrollableDivRef?.current as HTMLElement;

    const subscription = subject$
      .pipe(debounceTime(50), distinctUntilChanged())
      .subscribe(({ isScrolledY, isScrolledX }) => {
        setIsScrolledY(isScrolledY);
        setIsScrolledX(isScrolledX);
      });

    const eventHandler = () => {
      if (!element) return;

      subject$.next({
        isScrolledY: element.scrollTop > 0,
        isScrolledX: element.scrollLeft > 0,
      });
    };

    if (element) {
      element.addEventListener('scroll', eventHandler);
    }

    // Initial check
    eventHandler();

    return () => {
      subscription.unsubscribe();

      if (element) {
        element.removeEventListener('scroll', eventHandler);
      }
    };
  }, [scrollableDivRef, subject$]);

  return useMemo(() => {
    return {
      isScrolledY,
      isScrolledX,
      className: cn(
        'transition-all duration-300',
        isScrolledY && 'dark:shadow-primary/10 shadow-xl',
      ),
    };
  }, [isScrolledY, isScrolledX]);
}
