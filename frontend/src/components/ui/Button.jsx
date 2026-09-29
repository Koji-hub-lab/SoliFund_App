import { Link } from 'react-router-dom';

// Boutons de la charte (voir frontend/DESIGN.md, section « Formes ») : pilules, relief qui
// s'enfonce au clic pour les boutons pleins. La variante « don » (Ambre) est réservée au bouton
// « Faire un don » / « Soutenir » de la page d'une cagnotte.
const variants = {
  default:
    'bg-primary text-primary-foreground shadow-[0_3px_0_#055955] hover:bg-primary-dark not-disabled:active:translate-y-[2px] not-disabled:active:shadow-[0_1px_0_#055955]',
  outline: 'border-2 border-primary bg-transparent text-primary hover:bg-primary-soft',
  ghost: 'bg-transparent text-foreground hover:bg-secondary',
  // Action destructive (annuler, rejeter, suspendre) : même forme que outline, en rouge.
  danger: 'border-2 border-destructive bg-transparent text-destructive hover:bg-destructive/10',
  don: 'bg-accent text-encre shadow-[0_3px_0_#C4822A] hover:bg-accent-dark not-disabled:active:translate-y-[2px] not-disabled:active:shadow-[0_1px_0_#C4822A]',
};

const sizes = {
  sm: 'h-11 px-4 text-sm sm:h-10', // 44 px au doigt sur mobile, 40 px au-delà
  default: 'h-12 px-6 text-base',
  lg: 'h-14 px-8 text-lg',
  xl: 'h-[60px] px-8 text-lg',
};

// Désactivé : fond #ECE4D8, texte #8C9596, sans relief (DESIGN.md).
const desactive =
  'disabled:cursor-not-allowed disabled:border-transparent disabled:bg-border disabled:text-[#8C9596] disabled:shadow-none';

// `to` : lien interne (react-router) ; `href` : ancre ou URL simple (ex. « #cagnottes »).
export function Button({ variant = 'default', size = 'default', to, href, className = '', children, ...props }) {
  //  : neutralise le soulignement global des liens (index.css) quand le bouton est un <Link>.
  const classes = `inline-flex items-center justify-center gap-2 rounded-full font-sans font-bold whitespace-nowrap   transition-[background-color,box-shadow,transform] ${desactive} ${variants[variant] ?? variants.default} ${sizes[size] ?? sizes.default} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
