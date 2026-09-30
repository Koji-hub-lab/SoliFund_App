// Fuseau de référence de SoliFund (Cameroun). Les jours de cagnotte (date_debut, date_fin) sont des
// jours calendaires à Douala, stockés en @db.Date (minuit UTC de ce jour).
export const FUSEAU = 'Africa/Douala';

// Écart (en ms) entre l'heure de Douala et l'heure UTC à un instant donné.
function decalageFuseau(instant: Date): number {
  const parties = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSEAU,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const v = Object.fromEntries(parties.map((p) => [p.type, Number(p.value)]));
  return (
    Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute, v.second) -
    (instant.getTime() - instant.getMilliseconds())
  );
}

// Fin du dernier jour d'une cagnotte : minuit à Douala au soir de date_fin.
// Seule règle utilisée pour accepter les dons et pour terminer les cagnottes (tâche nocturne).
export function finDuDernierJour(dateFin: Date): Date {
  const minuitSuivantUtc = Date.UTC(
    dateFin.getUTCFullYear(),
    dateFin.getUTCMonth(),
    dateFin.getUTCDate() + 1,
  );
  return new Date(
    minuitSuivantUtc - decalageFuseau(new Date(minuitSuivantUtc)),
  );
}

// Vrai si le dernier jour de la cagnotte est passé.
export function estEchue(
  dateFin: Date,
  maintenant: Date = new Date(),
): boolean {
  return finDuDernierJour(dateFin) <= maintenant;
}

// Jour calendaire à Douala, au format AAAA-MM-JJ (comparable tel quel à une autre date de ce format).
export function jourADouala(instant: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSEAU }).format(instant);
}
