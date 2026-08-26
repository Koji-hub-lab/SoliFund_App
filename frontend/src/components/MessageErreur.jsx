export default function MessageErreur({ texte, onReessayer }) {
  return (
    <div className="carte" style={{ textAlign: 'center', borderColor: 'var(--danger)' }}>
      <p className="erreur">{texte}</p>
      {onReessayer && <button onClick={onReessayer}>Réessayer</button>}
    </div>
  );
}