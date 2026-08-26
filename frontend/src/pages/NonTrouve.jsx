import { Link } from 'react-router-dom';

export default function NonTrouve() {
  return (
    <div className="conteneur" style={{ textAlign: 'center', paddingTop: 60 }}>
      <h2>Page introuvable</h2>
      <p style={{ color: 'var(--texte-clair)' }}>Cette page n'existe pas ou a été déplacée.</p>
      <Link to="/">← Retour à l'accueil</Link>
    </div>
  );
}