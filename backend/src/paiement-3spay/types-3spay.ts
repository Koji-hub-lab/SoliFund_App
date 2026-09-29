// Formats de l'API 3SPAY utilisés par SoliFund (voir docs/paiement/3spay-openapi.json).

// Statuts de transaction 3SPAY (initiated, pending, processing, confirmed, completed, failed,
// expired, cancelled, reversed). Gardé en string : un statut inattendu ne doit rien casser.
export type Statut3SPay = string;

// POST /api/v1/deposits (DepositRequest)
export interface DemandeDepot3SPay {
  partner_reference: string;
  amount: number;
  currency?: 'XAF';
  phone_number: string;
  operator: string;
  callback_url?: string;
  metadata?: Record<string, unknown>;
}

// POST /api/v1/payouts (PayoutRequest)
export interface DemandeVersement3SPay {
  partner_reference: string;
  amount: number;
  currency?: 'XAF';
  phone_number: string;
  operator: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

// Réponse d'une création (TransactionResponse)
export interface Transaction3SPay {
  transaction_id: string;
  status: Statut3SPay;
  message: string;
  partner_reference: string;
  amount: number;
  currency: string;
  operator_reference?: string | null;
  created_at: string;
  error_code?: string | null;
  error_type?: string | null;
  error_recoverable?: boolean | null;
}

// GET /api/v1/transactions/{id} et /by-partner-ref/{ref} (TransactionDetailResponse). La
// spécification ne détaille pas l'objet « error » : il est lu avec prudence (voir lireErreur3SPay).
export interface DetailTransaction3SPay {
  transaction_id: string;
  type: string;
  status: Statut3SPay;
  amount: number;
  currency: string;
  operator: string;
  operator_reference?: string | null;
  partner_reference?: string | null;
  phone_number?: string | null;
  error?: Record<string, unknown> | null;
  error_code?: string | null;
  error_type?: string | null;
  error_recoverable?: boolean | null;
  operator_live_status?: Record<string, unknown> | null;
  created_at: string;
  completed_at?: string | null;
}

// GET /api/v1/balance (BalanceResponse)
export interface Solde3SPay {
  partner_id: string;
  balance: number;
  available_balance: number;
  hold_balance: number;
  currency: string;
}

// Élément de GET /api/v1/operators, normalisé par le client (voir Client3SPay.listerOperateurs).
export interface Operateur3SPay {
  code: string;
  disponible: boolean;
}
