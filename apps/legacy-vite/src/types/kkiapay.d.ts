// Déclaration de type pour le widget Kkiapay
interface KkiapayWidgetConfig {
  amount: number;
  api_key: string;
  sandbox?: boolean;
  email?: string;
  phone?: string;
  name?: string;
  description?: string;
  theme?: string;
  logo?: string;
  partnerId?: string;
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
  startDate?: string;
  endDate?: string;
  splitPayment?: Array<{destination: string, amount: number}>;
  data?: string;
  callback?: (response: any) => void;
  close?: () => void;
}

interface KkiapayWidget {
  open: (config: KkiapayWidgetConfig) => void;
}

// Extension de l'interface Window pour inclure kkiapayWidget
interface Window {
  kkiapayWidget?: KkiapayWidget;
}
