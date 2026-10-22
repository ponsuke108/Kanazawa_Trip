import { createContext } from 'react';
import type { AuthUser } from '@/types/models';

export type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
