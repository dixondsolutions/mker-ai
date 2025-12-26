import { useEffect, useRef } from 'react';

import { useRevalidator } from 'react-router';

// 10 seconds - the minimum time between revalidations
const minElapsedTime = 10_000;

export function GlobalRevalidator() {
  useGlobalRevalidator();

  return null;
}

function useGlobalRevalidator() {
  useRevalidateOnVisibilityChange({ enabled: true });
  useRevalidateOnReconnect({ enabled: true });
}

function useRevalidateOnVisibilityChange({
  enabled = false,
}: {
  enabled: boolean;
}) {
  const revalidator = useRevalidator();
  const lastRevalidationTimeRef = useRef(0);

  useEffect(
    function revalidateOnFocus() {
      if (!enabled) {
        return;
      }

      function onFocus() {
        const now = Date.now();
        if (now - lastRevalidationTimeRef.current < minElapsedTime) {
          return;
        }
        revalidator.revalidate();
        lastRevalidationTimeRef.current = now;
      }

      window.addEventListener('focus', onFocus);

      return () => {
        window.removeEventListener('focus', onFocus);
      };
    },
    [revalidator, enabled],
  );

  useEffect(
    function revalidateOnVisibilityChange() {
      if (!enabled) {
        return;
      }

      function onVisibilityChange() {
        const now = Date.now();

        if (now - lastRevalidationTimeRef.current < minElapsedTime) {
          return;
        }

        revalidator.revalidate();
        lastRevalidationTimeRef.current = now;
      }

      window.addEventListener('visibilitychange', onVisibilityChange);

      return () => {
        window.removeEventListener('visibilitychange', onVisibilityChange);
      };
    },
    [revalidator, enabled],
  );
}

function useRevalidateOnReconnect({ enabled = false }: { enabled: boolean }) {
  const revalidator = useRevalidator();

  useEffect(
    function revalidateOnReconnect() {
      if (!enabled) {
        return;
      }

      function onReconnect() {
        return revalidator.revalidate();
      }

      window.addEventListener('online', onReconnect);

      return () => {
        window.removeEventListener('online', onReconnect);
      };
    },
    [revalidator, enabled],
  );
}
