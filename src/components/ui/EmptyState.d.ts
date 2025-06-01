import { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export interface EmptyMessagesProps {
  onAction?: () => void;
  className?: string;
}

export interface EmptySearchProps {
  searchTerm: string;
  onReset?: () => void;
  className?: string;
}

export interface EmptyServicesProps {
  onAction?: () => void;
  className?: string;
}

export interface ConnectionErrorProps {
  onRetry?: () => void;
  className?: string;
}

export default function EmptyState(props: EmptyStateProps): JSX.Element;
export function EmptyMessages(props: EmptyMessagesProps): JSX.Element;
export function EmptySearch(props: EmptySearchProps): JSX.Element;
export function EmptyServices(props: EmptyServicesProps): JSX.Element;
export function ConnectionError(props: ConnectionErrorProps): JSX.Element;
