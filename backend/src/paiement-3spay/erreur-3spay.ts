// Échec d'un appel à 3SPAY, après les éventuels nouveaux essais.
// - temporaire = true : 409, 429, 5xx, délai dépassé ou réseau, toujours en échec après les
//   nouveaux essais. Le résultat réel est inconnu : ne jamais en conclure que le paiement a échoué.
// - temporaire = false : refus définitif (400, 401, 404, 422...) ; inutile de réessayer tel quel.
export class Erreur3SPay extends Error {
  constructor(
    message: string,
    readonly temporaire: boolean,
    // Code HTTP de la dernière réponse (null si aucune réponse : délai dépassé, réseau).
    readonly statutHttp: number | null,
    // request_id renvoyé par 3SPAY (ou envoyé par SoliFund) : à transmettre au support 3SPAY.
    readonly requestId: string,
  ) {
    super(message);
    this.name = 'Erreur3SPay';
  }
}
