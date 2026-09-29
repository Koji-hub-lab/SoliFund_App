import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Champ from '../ui/Champ';

// Champ mot de passe de la charte, avec un bouton pour afficher ou masquer la saisie.
export default function ChampMotDePasse(props) {
  const [visible, setVisible] = useState(false);
  return (
    <Champ
      type={visible ? 'text' : 'password'}
      suffixe={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          className="inline-flex size-11 items-center justify-center rounded-full bg-transparent p-0 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      }
      {...props}
    />
  );
}
