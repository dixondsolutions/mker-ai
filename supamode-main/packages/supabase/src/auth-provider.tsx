import { createContext } from 'react-router';

import { useAuthChangeListener } from './hooks/use-auth-change-listener';

/**
 * User context
 * @description The context for the user.
 */
const userContext = createContext<{
  id: string;
  email: string;
}>();

export { useAuthChangeListener, userContext };
