import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

// Saisie d'un code à N chiffres en cases séparées (vérification d'email, mot de passe oublié).
// `valeur` : chaîne de chiffres ; `onChange(nouvelleValeur)`.
// Passage automatique à la case suivante, retour arrière vers la précédente, flèches, collage d'un code complet.
// Une case vide au milieu est notée par une espace, pour que les chiffres suivants restent à leur place :
// le code est complet quand /^\d{N}$/ est vérifié.
export default function SaisieCode({ valeur, onChange, longueur = 6, erreur = false, disabled = false, libelle, autoFocus = false }) {
  const { t } = useTranslation('commun');
  const cases = useRef([]);
  const chiffres = Array.from({ length: longueur }, (_, i) => (valeur[i] && valeur[i] !== ' ' ? valeur[i] : ''));

  function emettre(tableau) {
    onChange(tableau.map((c) => c || ' ').join('').trimEnd());
  }

  function focaliser(index) {
    const cible = cases.current[Math.max(0, Math.min(longueur - 1, index))];
    cible?.focus();
    cible?.select();
  }

  // Écrit une suite de chiffres à partir de la case `index` (frappe ou collage).
  function ecrire(index, texte) {
    const nouveaux = texte.replace(/\D/g, '');
    if (!nouveaux) return;
    const tableau = [...chiffres];
    for (let i = 0; i < nouveaux.length && index + i < longueur; i++) tableau[index + i] = nouveaux[i];
    emettre(tableau);
    focaliser(index + nouveaux.length);
  }

  function gererTouche(index, e) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const tableau = [...chiffres];
      if (tableau[index]) {
        tableau[index] = '';
      } else if (index > 0) {
        tableau[index - 1] = '';
        focaliser(index - 1);
      }
      emettre(tableau);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focaliser(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focaliser(index + 1);
    }
  }

  return (
    <div role="group" aria-label={libelle ?? t('code.libelle')} className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(${longueur}, minmax(0, 56px))` }}>
      {chiffres.map((chiffre, index) => (
        <input
          key={index}
          ref={(el) => { cases.current[index] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={longueur}
          value={chiffre}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          aria-label={t('code.chiffre', { numero: index + 1, total: longueur })}
          aria-invalid={erreur ? true : undefined}
          onChange={(e) => {
            const saisie = e.target.value;
            if (!saisie) {
              // Suppression signalée sans touche Retour arrière (certains claviers mobiles).
              const tableau = [...chiffres];
              tableau[index] = '';
              emettre(tableau);
              return;
            }
            ecrire(index, saisie.slice(chiffre ? 1 : 0) || saisie);
          }}
          onKeyDown={(e) => gererTouche(index, e)}
          onPaste={(e) => {
            e.preventDefault();
            ecrire(index, e.clipboardData.getData('text'));
          }}
          onFocus={(e) => e.target.select()}
          className={`aspect-square w-full min-w-0 rounded-[16px] border-2 bg-card p-0 text-center font-display text-[26px] font-bold text-foreground outline-none transition-colors disabled:cursor-not-allowed disabled:bg-secondary ${
            erreur ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary'
          }`}
        />
      ))}
    </div>
  );
}
