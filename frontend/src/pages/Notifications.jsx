import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);

  function charger() {
    api.get('/notifications').then((res) => setNotifications(res.data));
  }

  useEffect(charger, []);

  async function marquerLue(idNotification) {
    await api.patch(`/notifications/${idNotification}/lue`);
    charger();
  }

  return (
    <div style={{ maxWidth: 700, margin: '40px auto' }}>
      <h2>Notifications</h2>
      {notifications.length === 0 && <p>Aucune notification.</p>}
      {notifications.map((r) => (
        <div
          key={r.id_notification}
          style={{
            border: '1px solid #ccc',
            padding: 12,
            marginBottom: 8,
            background: r.statut === 'NON_LUE' ? '#eef6ff' : 'white',
          }}
        >
          <strong>{r.notification.titre}</strong>
          <p>{r.notification.message}</p>
          <small>{new Date(r.notification.date_envoi).toLocaleString('fr-FR')}</small>
          <br />
          {r.notification.id_cagnotte && (
            <Link to={`/cagnottes/${r.notification.id_cagnotte}`}>Voir la cagnotte</Link>
          )}
          {r.statut === 'NON_LUE' && (
            <button style={{ marginLeft: 12 }} onClick={() => marquerLue(r.id_notification)}>
              Marquer comme lue
            </button>
          )}
        </div>
      ))}
    </div>
  );
}