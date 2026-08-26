export default function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div
        style={{
          display: 'inline-block',
          width: 32,
          height: 32,
          border: '3px solid var(--bordure)',
          borderTopColor: 'var(--primaire)',
          borderRadius: '50%',
          animation: 'tourner 0.7s linear infinite',
        }}
      />
      <style>{`@keyframes tourner { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}