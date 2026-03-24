import { ReactNode } from 'react';

export enum SPINNER_TYPES {
  CIRCLE = 'circle',
  DOTS = 'dots',
  PULSE = 'pulse'
}

export enum SPINNER_SIZES {
  SM = 'sm',
  MD = 'md',
  LG = 'lg',
  XL = 'xl'
}

export interface LoadingSpinnerProps {
  type?: keyof typeof SPINNER_TYPES;
  size?: keyof typeof SPINNER_SIZES;
  color?: string;
  label?: string;
  fullScreen?: boolean;
  className?: string;
}

export default function LoadingSpinner(props: LoadingSpinnerProps): JSX.Element;
