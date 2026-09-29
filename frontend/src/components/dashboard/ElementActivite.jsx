import { Heart, Check, Flag, MessageCircle } from 'lucide-react';
import { formaterDateRelative } from '../../utils/format';

// Icône d'une notification selon son type : don (cœur, Ambre clair), retrait (coche, Lagune claire),
// commentaire (bulle, Lagune claire), autre (drapeau, gris).
function iconeActivite(type) {
  if (type === 'DON') return { Icone: Heart, classes: 'bg-accent-soft text-[#7A5312]' };
  if (type === 'RETRAIT') return { Icone: Check, classes: 'bg-primary-soft text-primary' };
  if (type === 'COMMENTAIRE') return { Icone: MessageCircle, classes: 'bg-primary-soft text-primary' };
  return { Icone: Flag, classes: 'bg-secondary text-muted-foreground' };
}

// Une ligne d'activité (notification) ; `children` : actions éventuelles sous le texte.
export default function ElementActivite({ recu, tronquer = false, className = '', children }) {
  const { Icone, classes } = iconeActivite(recu.notification.type);
  const nonLue = recu.statut === 'NON_LUE';
  return (
    <li className={`flex items-start gap-3 ${className}`}>
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-[12px] ${classes}`}>
        <Icone className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-foreground">{recu.notification.titre}</p>
        <p className={`mt-0.5 text-sm text-[#45524F] ${tronquer ? 'line-clamp-2' : ''}`}>{recu.notification.message}</p>
        <p className="mt-1 text-xs text-muted-foreground">{formaterDateRelative(recu.notification.date_envoi)}</p>
        {children}
      </div>
      {nonLue && <span className="mt-2 size-2.5 shrink-0 rounded-full bg-accent" role="img" aria-label="Non lue" />}
    </li>
  );
}
