import React, { useEffect } from 'react';
// Import des types pour Kkiapay
import '../types/kkiapay.d.ts';

interface KkiapayPaymentButtonProps {
  amount: number; // Montant en FCFA
  email?: string;
  phone?: string;
  description?: string;
  data?: Record<string, any>;
  theme?: string;
  partnerId?: string;
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
  startDate?: string;
  endDate?: string;
  splitPayment?: Array<{destination: string, amount: number}>;
  onSuccess?: (transactionId: string) => void;
  onFailure?: () => void;
  onClose?: () => void;
  children?: React.ReactNode;
}

// Clé publique sandbox fournie par le dashboard Kkiapay
const KKIA_PAY_PUBLIC_KEY = '4990916032a111b0a27d549d50958fcf0';

export const KkiapayPaymentButton: React.FC<KkiapayPaymentButtonProps> = ({
  amount,
  email,
  phone,
  description,
  data,
  theme,
  partnerId,
  frequency,
  startDate,
  endDate,
  splitPayment,
  onSuccess,
  onFailure,
  onClose,
  children
}) => {
  useEffect(() => {
    // Ajout dynamique du script Kkiapay si non présent
    if (!document.getElementById('kkiapay-script')) {
      const script = document.createElement('script');
      script.id = 'kkiapay-script';
      script.src = 'https://cdn.kkiapay.me/js/v1/kkiapay.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const openKkiapayWidget = () => {
    // kkiapayWidget est maintenant correctement typé
    if (window.kkiapayWidget) {
      // Configuration avancée du widget avec toutes les options disponibles
      const widgetConfig: any = {
        amount,
        api_key: KKIA_PAY_PUBLIC_KEY,
        sandbox: true,
        email,
        phone,
        name: "FloService",
        description: description || "Paiement pour service",
        theme: theme || "blue",
        logo: "https://floservice.com/logo.png", // À remplacer par votre logo
        partnerId: partnerId || "FloService",
        callback: (response: any) => {
          if (response && response.status === 'success') {
            onSuccess && onSuccess(response.transactionId || response.transaction_id);
          } else {
            onFailure && onFailure();
          }
        },
        close: () => {
          onClose && onClose();
        }
      };

      // Ajout des options conditionnelles
      if (data) {
        widgetConfig.data = JSON.stringify(data);
      }

      // Options pour paiements récurrents
      if (frequency && frequency !== 'once') {
        widgetConfig.frequency = frequency;
        if (startDate) widgetConfig.startDate = startDate;
        if (endDate) widgetConfig.endDate = endDate;
      }

      // Option pour split payment
      if (splitPayment && splitPayment.length > 0) {
        widgetConfig.splitPayment = splitPayment;
      }

      // Ouvre le widget avec la configuration
      window.kkiapayWidget.open(widgetConfig);
    } else {
      alert("Le widget de paiement n'est pas encore chargé. Veuillez réessayer dans quelques secondes.");
    }
  };

  return (
    <button
      type="button"
      onClick={openKkiapayWidget}
      className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-2 rounded shadow"
    >
      {children || 'Payer avec Kkiapay'}
    </button>
  );
};

export default KkiapayPaymentButton;
