# API AangaraaPay — résumé fidèle de la documentation officielle

Source : https://aangaraa-pay.com/integrate-aangaraa-pay (lue le 1er octobre 2026). Les exemples
ci-dessous sont recopiés de la documentation ; `VOTRE_CLE_API` remplace la clé.

URL de base : `https://api-production.aangaraa-pay.com`. Toutes les requêtes en
`Content-Type: application/json`. **Aucun en-tête d'authentification** : la clé (`app_key`, ou
`api_key` pour `get_user_info`) est dans le corps, et **dans l'URL** pour le solde.

## Points à retenir pour l'intégration

- **Pas de signature sur les webhooks** : le corps d'une notification ne prouve rien. Il faut
  reconsulter le statut par l'API avant d'agir.
- **Pas d'endpoint d'annulation** d'un paiement.
- **Le versement (withdrawal) ne prend pas de référence marchande** : pas d'idempotence possible,
  donc jamais de nouvel essai automatique.
- **Le solde est détaillé par opérateur** ; un versement peut échouer pour « Insufficient balance
  for Orange_Cameroon » même si le solde total suffit.
- Préfixes donnés par la documentation : **Orange 655-659 et 690-699 ; MTN 650-654 et 670-683**.
- Opérateurs : `MTN_Cameroon`, `Orange_Cameroon` (et `CARTE` / `ALL` pour la page de paiement avec
  redirection, non utilisée par SoliFund).

## Disponibilité — `GET /api/service-aangaraapay/health`

Sans authentification. Réponse 200 :

```json
{ "status": "UP", "service": "SERVICE-AANGARAAPAY" }
```

## Paiement avec redirection — `POST /api/v1/redirect/payment` (non utilisé)

Corps : `amount` (Float, requis), `description` (requis), `app_key` (requis), `transaction_id`
(requis), `notify_url` (requis), `operator` (requis : `Orange_Cameroon`, `MTN_Cameroon`, `CARTE` ou
`ALL`), `devise_id` (facultatif), `return_url`, `user_name`, `user_email`, `user_phone_number`.
Réponse 201 : `{ statusCode: 201, message: "Payment URL created successfully", data: { payment_url,
transaction_id, payment_history_id } }`. Le lien expire après 4 minutes.

## Paiement direct — `POST /api/v1/no_redirect/payment`

Le client reçoit une demande sur son téléphone.

```json
{
  "phone_number": "237655123456",
  "amount": "1000",
  "description": "Paiement pour Produit XYZ",
  "app_key": "VOTRE_CLE_API",
  "transaction_id": "trans_123456789",
  "return_url": "https://votresite.com/retour",
  "notify_url": "https://votresite.com/notification",
  "operator": "Orange_Cameroon",
  "devise_id": "XAF"
}
```

Requis : `phone_number` (String), `amount` (**String**), `description`, `app_key`, `transaction_id`
(notre identifiant unique), `notify_url`, `operator` (`Orange_Cameroon` ou `MTN_Cameroon`, « détecté
automatiquement depuis le numéro »). Facultatif : `devise_id`.

Réponse MTN (201) — `payToken` au format UUID :

```json
{ "statusCode": 201, "message": "Paiement initié avec succès",
  "data": { "payToken": "e92224da-1987-47e6-958b-78433bd92a66", "status": "PENDING" } }
```

Réponse Orange (201) — `payToken` commençant par `MP` :

```json
{ "statusCode": 201, "message": "PENDING",
  "data": { "payToken": "MP2512295AD67EBB09E121E235B2", "status": "PENDING" } }
```

## Statut d'un paiement — `POST /api/v1/aangaraa_check_status`

Corps : `{ "payToken": "...", "app_key": "VOTRE_CLE_API" }`.

Réussi :

```json
{
  "success": true, "status": "SUCCESSFUL", "operator": "MTN_Cameroon",
  "transaction_id": "856", "pay_token": "e92224da-1987-47e6-958b-78433bd92a66",
  "amount": 10, "currency": "XAF", "message": "Paiement réussi", "operator_code": "SUCCESSFUL",
  "timestamp": null, "phone_number": "237651534499",
  "details": { "financialTransactionId": "15284828790", "reason": null,
               "payerMessage": "Veillez confirmer la transcation", "payeeNote": "AANGARAA-PAY" }
}
```

En attente : même forme, `"success": true`, `"status": "PENDING"`, `"message": "Paiement en attente de
confirmation"`, `"details": { "reason": "En attente de validation client" }`.

Échoué : `"success": false`, `"status": "FAILED"`, `"message": "Paiement échoué"`,
`"operator_code": "FAILED"`, `"details": { "reason": "Solde insuffisant" }`. Raisons possibles citées :
solde insuffisant, transaction annulée par le client, erreur de l'opérateur, timeout de confirmation.

Remarque : `transaction_id` vaut ici `"856"` (identifiant interne), pas la référence envoyée.

## Solde — `GET /api/v1/service/balance/{app_key}`

La clé est dans l'URL. Réponse 200 :

```json
{
  "message": "Balance retrieved successfully",
  "data": {
    "service_id": 123, "service_name": "Mon Service E-commerce", "app_key": "VOTRE_CLE_API",
    "balance_in_db": "XXXXX.00",
    "balance_details": {
      "mtn_cameroon":    { "amount": "XXXX.00",  "transactions_count": "XX",  "currency": "XAF" },
      "orange_cameroon": { "amount": "XXXX0.00", "transactions_count": "XX",  "currency": "XAF" },
      "total":           { "amount": "XXX.00",   "transactions_count": "XXX", "currency": "XAF" }
    }
  }
}
```

(Les montants sont masqués par `X` dans la documentation ; ce sont des nombres.) `balance_in_db` :
solde du service ; `mtn_cameroon` / `orange_cameroon` : « montant et nombre de transactions réussies »
par opérateur ; calculés sur les transactions SUCCESSFUL.

## Informations d'un abonné — `POST /api/v1/get_user_info`

```json
{ "msisdn": "690000000", "api_key": "VOTRE_CLE_API", "country": "Cameroon", "operator": "Orange_Cameroon" }
```

`msisdn` **sans** le préfixe 237 ; la clé s'appelle ici `api_key`. Réponse 200 :

```json
{ "message": "success",
  "data": { "description": "User info retrieved successfully", "msisdn": "690000000",
            "api_key": "VOTRE_CLE_API", "country": "Cameroon", "operator": "Orange_Cameroon",
            "full_name": "JOHN DOE" } }
```

Abonné introuvable (400) : `{ "message": "Failed to retrieve Orange user info", "data": { "description":
"User not found or invalid phone number", ..., "code": "USER_NOT_FOUND" } }`. Autres 400 :
`Invalid API key`, `MSISDN is required`, `Unsupported operator`, `Unsupported country` (même forme
`{ message, data: { description } }`).

## Versement (disbursement) — `POST /api/v1/aangaraa-pay/withdrawal`

```json
{ "app_key": "VOTRE_CLE_API", "phone_number": "6xxxxxxxx", "amount": "1000",
  "payment_method": "Orange_Cameroon", "username": "Jean Dupont" }
```

`phone_number` avec ou sans 237 ; `amount` en chaîne (> 0) ; `payment_method` : `Orange_Cameroon` ou
`MTN_Cameroon` ; `username` facultatif. Le montant n'est déduit du solde que si le statut final est
SUCCESSFUL.

Réussi (200) :

```json
{ "statusCode": 200, "message": "Withdrawal initiated successfully",
  "data": { "status": "SUCCESSFUL", "reference_id": "abc123def456", "transaction_id": "TXN789012",
            "amount": "1000", "phone_number": "2376xxxxxxxx", "payment_method": "Orange_Cameroon",
            "message": "Disbursement completed successfully" } }
```

En cours (200) : `"message": "Withdrawal initiated"`, `data.status: "PENDING"`, `reference_id`, sans
`transaction_id` ; « Ne créez pas de nouveau retrait tant que celui-ci est PENDING ».

Erreurs (même forme `{ statusCode, message, data: { description, ... } }`) :
- 400 `Insufficient balance` — `{ description: "Insufficient balance for Orange_Cameroon",
  available_balance: 500.00, requested_amount: 1000.00, operator: "Orange_Cameroon" }` ;
- 404 `Service not found` — clé invalide ;
- 403 `Service is not active` ;
- 400 `Invalid payment method` ; 400 `Invalid amount`.

## Statut d'un versement — `GET /api/v1/check_withdrawal_status/{reference_id}?payment_method=…`

Réussi (200) :

```json
{ "success": true, "status": "SUCCESSFUL", "operator": "MTN_Cameroon",
  "transaction_id": "abc123def456", "amount": 1000.0, "currency": "XAF",
  "message": "Transaction réussie", "operator_code": "SUCCESSFUL", "timestamp": "2025-12-29T14:30:15",
  "details": { "financialTransactionId": "MT789012345", "reason": null } }
```

En cours : `"status": "PENDING"`, `"details": { "txnid": "OM456789012", "payToken": "MP25…" }`.
Échoué (toujours HTTP 200, `"success": true`) : `"status": "FAILED"`, `"details": { "reason":
"Invalid phone number" }` — « le montant n'a pas été déduit », le retrait peut être refait.
Introuvable (HTTP 200) : `{ "success": true, "status": "NOT_FOUND", ... "message": "Transaction
introuvable" }`. Statuts possibles : SUCCESSFUL, PENDING, FAILED, NOT_FOUND.

## Webhooks

URL configurée dans le tableau de bord ou passée en `notify_url`. Exemple de corps :

```json
{ "transaction_id": "trans_123456789", "status": "SUCCESSFUL", "amount": 1000,
  "operator": "MTN_Cameroon", "paytoken": "MT1234567890", "txnid": "abc123def456",
  "phone_number": "237670000000", "description": "Paiement abonnement mensuel",
  "timestamp": "2025-12-29T10:30:00.123456" }
```

Statuts : SUCCESSFUL, PENDING, FAILED, CANCELLED, EXPIRED. L'endpoint doit répondre HTTP 200.
**Aucune signature ni secret n'est documenté.**
