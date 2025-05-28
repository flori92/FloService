import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface Withdrawal {
  id: string;
  amount: number;
  commission: number;
  status: string;
  mobile_wallet_number: string;
  wallet_operator: string;
  requested_at: string;
  completed_at?: string;
}

export const ProviderBalanceSection: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(0);
  const [pending, setPending] = useState(0);
  const [transferred, setTransferred] = useState(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [form, setForm] = useState({
    amount: '',
    mobile_wallet_number: '',
    wallet_operator: ''
  });
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchBalances();
      fetchWithdrawals();
    }
    // eslint-disable-next-line
  }, [user?.id]);

  // Récupère les soldes (requêtes simplifiées, à adapter si besoin)
  const fetchBalances = async () => {
    setLoading(true);
    // Somme des paiements disponibles
    const { data: availableData } = await supabase
      .from('payments')
      .select('amount')
      .eq('provider_id', user.id)
      .eq('status', 'available');
    setAvailable(availableData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0);
    // Somme des paiements en séquestre
    const { data: pendingData } = await supabase
      .from('payments')
      .select('amount')
      .eq('provider_id', user.id)
      .eq('status', 'escrow');
    setPending(pendingData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0);
    // Somme des montants déjà transférés
    const { data: transferredData } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('provider_id', user.id)
      .eq('status', 'completed');
    setTransferred(transferredData?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0);
    setLoading(false);
  };

  // Récupère l'historique des retraits
  const fetchWithdrawals = async () => {
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('provider_id', user.id)
      .order('requested_at', { ascending: false });
    if (!error && data) setWithdrawals(data);
  };

  // Gestion du formulaire de retrait
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disclaimerAccepted) {
      toast.error('Vous devez accepter le disclaimer.');
      return;
    }
    const amountNum = parseInt(form.amount, 10);
    if (isNaN(amountNum) || amountNum < 100) {
      toast.error('Le montant doit être supérieur ou égal à 100 FCFA.');
      return;
    }
    if (amountNum > available) {
      toast.error('Montant supérieur à votre solde disponible.');
      return;
    }
    setSubmitting(true);
    // Création de la demande de retrait (commission 100 FCFA)
    const { error } = await supabase.from('withdrawals').insert({
      provider_id: user.id,
      amount: amountNum,
      commission: 100,
      status: 'pending',
      mobile_wallet_number: form.mobile_wallet_number,
      wallet_operator: form.wallet_operator
    });
    setSubmitting(false);
    if (error) {
      toast.error('Erreur lors de la demande de retrait.');
    } else {
      toast.success('Demande de retrait envoyée. Elle sera traitée sous peu.');
      setForm({ amount: '', mobile_wallet_number: '', wallet_operator: '' });
      setDisclaimerAccepted(false);
      fetchBalances();
      fetchWithdrawals();
    }
  };

  return (
    <section className="bg-white rounded-lg shadow p-6 mb-8">
      <h2 className="text-2xl font-semibold mb-4">Mon solde</h2>
      {loading ? (
        <div>Chargement...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-teal-50 p-4 rounded-lg text-teal-800">
            <div className="text-sm">Disponible</div>
            <div className="text-2xl font-bold">{available} FCFA</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-yellow-800">
            <div className="text-sm">En attente (séquestre)</div>
            <div className="text-2xl font-bold">{pending} FCFA</div>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg text-gray-700">
            <div className="text-sm">Déjà transféré</div>
            <div className="text-2xl font-bold">{transferred} FCFA</div>
          </div>
        </div>
      )}

      <h3 className="text-xl font-semibold mb-2">Demander un transfert</h3>
      <form className="mb-6" onSubmit={handleWithdraw}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
          <input
            type="number"
            name="amount"
            min={100}
            max={available}
            value={form.amount}
            onChange={handleChange}
            className="border p-2 rounded"
            placeholder="Montant à retirer (FCFA)"
            required
          />
          <input
            type="text"
            name="mobile_wallet_number"
            value={form.mobile_wallet_number}
            onChange={handleChange}
            className="border p-2 rounded"
            placeholder="Numéro Mobile Money"
            required
          />
          <select
            name="wallet_operator"
            value={form.wallet_operator}
            onChange={handleChange}
            className="border p-2 rounded"
            required
          >
            <option value="">Opérateur</option>
            <option value="MTN">MTN</option>
            <option value="Moov">Moov</option>
            <option value="Orange">Orange</option>
            <option value="Wave">Wave</option>
          </select>
        </div>
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="disclaimer"
            checked={disclaimerAccepted}
            onChange={e => setDisclaimerAccepted(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="disclaimer" className="text-sm text-gray-700">
            J'accepte que la plateforme prélève <b>100 FCFA</b> de commission sur chaque retrait effectué.
          </label>
        </div>
        <button
          type="submit"
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-2 rounded shadow disabled:opacity-50"
          disabled={submitting || !disclaimerAccepted}
        >
          {submitting ? 'Envoi...' : 'Envoyer vers mon portefeuille mobile'}
        </button>
      </form>

      <h3 className="text-xl font-semibold mb-2">Historique des retraits</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-3">Date</th>
              <th className="text-left py-2 px-3">Montant</th>
              <th className="text-left py-2 px-3">Numéro</th>
              <th className="text-left py-2 px-3">Opérateur</th>
              <th className="text-left py-2 px-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.length === 0 ? (
              <tr><td colSpan={5} className="py-4 text-gray-500">Aucun retrait pour le moment.</td></tr>
            ) : (
              withdrawals.map(w => (
                <tr key={w.id}>
                  <td className="py-2 px-3">{new Date(w.requested_at).toLocaleString()}</td>
                  <td className="py-2 px-3">{w.amount} FCFA</td>
                  <td className="py-2 px-3">{w.mobile_wallet_number}</td>
                  <td className="py-2 px-3">{w.wallet_operator}</td>
                  <td className="py-2 px-3">
                    {w.status === 'completed' ? 'Transféré' : w.status === 'pending' ? 'En attente' : 'Échec'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ProviderBalanceSection;
