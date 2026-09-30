import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import CarteCagnotte from '../cagnotte/CarteCagnotte';
import api from '../../api/axios';

export function PopularCagnottes() {
  const [cagnottes, setCagnottes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categorie, setCategorie] = useState('');
  const [erreur, setErreur] = useState('');
  const { t } = useTranslation('accueil');

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data)).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let actif = true;
    const params = { tri: 'populaires', limite: 4 };
    if (categorie) params.id_categorie = categorie;
    setErreur('');
    api.get('/cagnottes', { params })
      .then((res) => actif && setCagnottes(res.data.donnees))
      .catch((err) => actif && setErreur(err.messageAffichable));
    return () => {
      actif = false;
    };
  }, [categorie]);

  const filtres = [{ id_categorie: '', nom: t('populaires.toutes') }, ...categories];

  return (
    <section id="cagnottes" className="scroll-mt-[88px] bg-background">
      <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:px-[72px] lg:py-24">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary">{t('populaires.surTitre')}</p>
            <h2 className="mb-0 mt-3 font-display text-[36px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground lg:text-[52px]">
              {t('populaires.titre')}
            </h2>
          </div>
          <Link
            to="/cagnottes"
            className="inline-flex min-h-11 items-center gap-1.5 text-base font-bold text-primary underline decoration-2 underline-offset-[5px]"
          >
            {t('populaires.voirTout')}
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {filtres.map((f) => {
            const actif = String(f.id_categorie) === String(categorie);
            return (
              <button
                key={f.id_categorie || 'toutes'}
                type="button"
                onClick={() => setCategorie(f.id_categorie)}
                aria-pressed={actif}
                className={`inline-flex min-h-11 items-center rounded-full border px-5 py-2.5 font-sans text-sm font-bold transition-colors ${
                  actif ? 'border-encre bg-encre text-primary-foreground hover:bg-encre' : 'border-border bg-card text-foreground hover:bg-secondary'
                }`}
              >
                {f.nom}
              </button>
            );
          })}
        </div>

        {erreur && <p className="mt-10 text-sm text-destructive">{erreur}</p>}

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cagnottes.map((c) => (
            <CarteCagnotte key={c.id_cagnotte} c={c} />
          ))}
        </div>
        {!erreur && cagnottes.length === 0 && (
          <p className="mt-8 text-muted-foreground">
            {categorie ? t('populaires.videCategorie') : t('populaires.vide')}
          </p>
        )}
      </div>
    </section>
  );
}
