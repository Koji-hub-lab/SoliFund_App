import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { Button } from '../components/ui/Button';
import Champ from '../components/ui/Champ';
import { SqueletteFormulaire } from '../components/ui/Squelette';
import api from '../api/axios';

// t : fonction de traduction de la zone « tableau-de-bord ».
function validerForm(form, t) {
  const erreurs = {};
  if (!form.titre.trim()) erreurs.titre = t('creation.erreurs.titre');
  if (!form.objectif || Number(form.objectif) <= 0) erreurs.objectif = t('creation.erreurs.objectif');
  if (!form.date_debut) erreurs.date_debut = t('creation.erreurs.dateDebut');
  if (!form.date_fin) erreurs.date_fin = t('creation.erreurs.dateFin');
  if (form.date_debut && form.date_fin && form.date_fin <= form.date_debut) {
    erreurs.date_fin = t('creation.erreurs.ordreDates');
  }
  return erreurs;
}

export default function ModifierCagnotte() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('tableau-de-bord');
  const [form, setForm] = useState(null);
  const [erreursChamps, setErreursChamps] = useState({});
  const [erreurServeur, setErreurServeur] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreurChargement, setErreurChargement] = useState('');

  // Le formulaire n'est affiché qu'une fois la cagnotte chargée : jamais de formulaire vide.
  function charger() {
    setErreurChargement('');
    api.get(`/cagnottes/${id}`)
      .then((res) => {
        const c = res.data;
        setForm({
          titre: c.titre,
          description: c.description || '',
          objectif: c.objectif,
          date_debut: c.date_debut.slice(0, 10),
          date_fin: c.date_fin.slice(0, 10),
        });
      })
      .catch((err) => setErreurChargement(err.messageAffichable));
  }

  useEffect(charger, [id]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErreurServeur('');
    const erreurs = validerForm(form, t);
    setErreursChamps(erreurs);
    if (Object.keys(erreurs).length > 0) return;

    setEnvoiEnCours(true);
    try {
      await api.patch(`/cagnottes/${id}`, { ...form, objectif: Number(form.objectif) });
      navigate(`/cagnottes/${id}`);
    } catch (err) {
      setErreurServeur(err.messageAffichable);
      setEnvoiEnCours(false);
    }
  }

  const enTete = (
    <div>
      <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-foreground sm:text-[44px]">
        {t('modification.titre')}
      </h1>
      <p className="mt-2 text-lg text-muted-foreground">{t('modification.sousTitre')}</p>
    </div>
  );

  if (!form) {
    return (
      <DashboardLayout>
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          {enTete}
          {erreurChargement ? (
            <div className="flex flex-col items-center gap-4 rounded-[32px] border border-border bg-card p-10 text-center">
              <p className="text-destructive">{t('modification.erreurChargement', { detail: erreurChargement })}</p>
              <Button variant="outline" onClick={charger}>{t('commun:actions.reessayer')}</Button>
              <Link to="/mes-cagnottes" className="inline-flex min-h-11 items-center font-bold text-primary underline decoration-2 underline-offset-[5px]">
                {t('modification.retour')}
              </Link>
            </div>
          ) : (
            <SqueletteFormulaire champs={4} />
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        {enTete}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 rounded-[32px] border border-border bg-card p-6 sm:p-8">
          <Champ id="titre" name="titre" libelle={t('creation.champTitre')} value={form.titre} onChange={handleChange} erreur={erreursChamps.titre} />
          <Champ as="textarea" id="description" name="description" libelle={t('creation.description')} value={form.description} onChange={handleChange} rows={5} />
          <Champ id="objectif" name="objectif" type="number" libelle={t('creation.objectif')} value={form.objectif} onChange={handleChange} erreur={erreursChamps.objectif} />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Champ id="date_debut" name="date_debut" type="date" libelle={t('creation.dateDebut')} value={form.date_debut} onChange={handleChange} erreur={erreursChamps.date_debut} />
            <Champ id="date_fin" name="date_fin" type="date" libelle={t('creation.dateFin')} value={form.date_fin} onChange={handleChange} erreur={erreursChamps.date_fin} />
          </div>

          {erreurServeur && <p className="text-sm text-destructive">{erreurServeur}</p>}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" size="lg" disabled={envoiEnCours}>{envoiEnCours ? t('commun:actions.enregistrement') : t('commun:actions.enregistrer')}</Button>
            <Button type="button" size="lg" variant="outline" onClick={() => navigate(`/cagnottes/${id}`)}>{t('commun:actions.annuler')}</Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
