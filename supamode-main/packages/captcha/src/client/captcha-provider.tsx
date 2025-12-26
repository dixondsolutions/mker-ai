import { createContext, useCallback, useEffect, useRef, useState } from 'react';

import { TurnstileInstance } from '@marsidev/react-turnstile';

import { setCaptchaState } from './captcha-state';

export const Captcha = createContext<{
  token: string;
  setToken: (token: string) => void;
  instance: TurnstileInstance | null;
  setInstance: (ref: TurnstileInstance) => void;
}>({
  token: '',
  instance: null,
  setToken: (_: string) => {
    // do nothing
    return '';
  },
  setInstance: () => {
    // do nothing
  },
});

export function CaptchaProvider(props: {
  children: React.ReactNode;
  siteKey: string;
}) {
  const [token, setToken] = useState<string>('');
  const instanceRef = useRef<TurnstileInstance | null>(null);

  const setInstance = useCallback((ref: TurnstileInstance) => {
    instanceRef.current = ref;
  }, []);

  const resetCaptchaToken = useCallback(() => {
    instanceRef.current?.reset();
  }, []);

  useEffect(() => {
    setCaptchaState(token, resetCaptchaToken);
  }, [token, resetCaptchaToken]);

  return (
    <Captcha.Provider
      // eslint-disable-next-line
      value={{ token, setToken, instance: instanceRef.current, setInstance }}
    >
      {props.children}
    </Captcha.Provider>
  );
}
