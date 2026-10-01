import { Link } from 'react-router-dom';
import PageLegale from '../components/site/PageLegale';
import { formaterTaux, useTauxCommission } from '../utils/commission';

const lien = 'font-bold text-primary underline decoration-2 underline-offset-[5px]';

// Taux de commission en vigueur, lu depuis l'API (« 3 % »).
function TauxCommission() {
  const taux = useTauxCommission();
  return <strong>{taux === null ? '…' : formaterTaux(taux)}</strong>;
}

// Sections dans l'ordre d'affichage ; les textes sont dans locales/*/legal.json (« conditions »).
const SECTIONS = [
  'objet', 'compte', 'organisateurs', 'dons', 'retraits', 'frais',
  'moderation', 'responsabilite', 'donnees', 'modifications', 'contact',
];

export default function Conditions() {
  return (
    <PageLegale
      cle="conditions"
      sections={SECTIONS}
      miseAJour="2026-10-01"
      composants={{ taux: <TauxCommission />, lien: <Link to="/confidentialite" className={lien} /> }}
    />
  );
}
