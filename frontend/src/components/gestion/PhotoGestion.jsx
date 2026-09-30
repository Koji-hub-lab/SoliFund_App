import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { Button } from '../ui/Button';
import { SymboleNjangi } from '../Logo';
import api, { urlFichier } from '../../api/axios';
import { erreurTexte } from '../cagnotte/classes';

export default function PhotoGestion({ cagnotte, executer, charger, enCours, erreurs }) {
  const [fichier, setFichier] = useState(null);
  const [apercu, setApercu] = useState(null);
  const { t } = useTranslation('tableau-de-bord');

  // Aperçu local du fichier choisi, libéré quand il change.
  useEffect(() => {
    if (!fichier) {
      setApercu(null);
      return undefined;
    }
    const url = URL.createObjectURL(fichier);
    setApercu(url);
    return () => URL.revokeObjectURL(url);
  }, [fichier]);

  function envoyer(e) {
    e.preventDefault();
    if (!fichier) return;
    return executer('image', async () => {
      const formData = new FormData();
      formData.append('image', fichier);
      await api.post(`/cagnottes/${cagnotte.id_cagnotte}/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFichier(null);
      e.target.reset();
      charger();
    });
  }

  const image = apercu ?? (cagnotte.image ? urlFichier(cagnotte.image) : null);

  return (
    <section className="max-w-3xl rounded-[28px] border border-border bg-card p-6 sm:p-7">
      <h2 className="font-display text-[22px] font-bold leading-tight text-foreground">{t('photo.titre')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('photo.formats')} {apercu && t('photo.apercu')}</p>

      <div className="mt-5 flex aspect-[16/9] items-center justify-center overflow-hidden rounded-[24px] bg-primary-soft">
        {image ? <img src={image} alt={t('photo.alt')} loading="lazy" className="h-full w-full object-cover" /> : <SymboleNjangi taille={80} />}
      </div>

      <form onSubmit={envoyer} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-primary px-6 font-bold text-primary hover:bg-primary-soft">
          <ImagePlus className="size-5" />
          {t('photo.choisir')}
          <input
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={(e) => setFichier(e.target.files[0] ?? null)}
            className="sr-only"
          />
        </label>
        <Button type="submit" disabled={enCours.image || !fichier}>
          {enCours.image ? t('commun:actions.envoiEnCours') : t('photo.enregistrer')}
        </Button>
        {fichier && <span className="truncate text-sm text-muted-foreground">{fichier.name}</span>}
      </form>
      {erreurs.image && <p className={`mt-2 ${erreurTexte}`}>{erreurs.image}</p>}
    </section>
  );
}
