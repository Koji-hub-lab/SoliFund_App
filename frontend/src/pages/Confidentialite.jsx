import { Link } from 'react-router-dom';
import PageLegale from '../components/site/PageLegale';

const lien = 'font-bold text-primary underline decoration-2 underline-offset-[5px]';

// Sections dans l'ordre d'affichage ; les textes sont dans locales/*/legal.json (« confidentialite »).
const SECTIONS = [
  'responsable', 'donnees', 'usages', 'visibilite', 'destinataires',
  'conservation', 'stockage', 'securite', 'droits', 'contact',
];

export default function Confidentialite() {
  return (
    <PageLegale
      cle="confidentialite"
      sections={SECTIONS}
      miseAJour="2026-09-29"
      composants={{ lien: <Link to="/conditions" className={lien} /> }}
    />
  );
}
