import { ReactNode } from 'react';

export interface NotifierContextType {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  clear: () => void;
}

export interface NotifierProviderProps {
  children: ReactNode;
}

export interface NotificationProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onClose: () => void;
}

export function NotifierProvider(props: NotifierProviderProps): JSX.Element;
export function useNotifier(): NotifierContextType;
