import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { CarteListe, EnTeteAdmin, classeLigne } from '../../components/admin/ElementsAdmin';
import { Button } from '../../components/ui/Button';
import CarteChiffre from '../../components/ui/CarteChiffre';
import { SqueletteChiffres, SqueletteListe } from '../../components/ui/Squelette';
import api from '../../api/axios';
import { formaterDate, formaterMoisAnnee, formaterMontant } from '../../utils/format';
import { formaterTaux } from '../../utils/commission';

// « 2026-09 » → « septembre 2026 »
function libelleMois(mois) {
  return formaterMoisAnnee(`${mois}-15`);
}

export default function AdminRevenus() {
  const { t } = useTranslation('admin');
  const [resume, setResume] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    api.get('/admin/revenus')
      .then((res) => setResume(res.data))
      .catch((err) => setErreur(err.messageAffichable));
  }, []);

  useEffect(() => {
    setChargement(true);
    api.get('/admin/revenus/commissions', { params: { page } })
      .then((res) => {
        setCommissions(res.data.donnees);
        setPages(res.data.pages);
      })
      .catch((err) => setErreur(err.messageAffichable))
      .finally(() => setChargement(false));
  }, [page]);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-10">
        <EnTeteAdmin titre={t('revenus.titre')} sousTitre={t('revenus.sousTitre')} />

        {erreur && <p className="text-sm text-destructive">{erreur}</p>}
        {!resume && !erreur && <SqueletteChiffres nombre={2} />}

        {resume && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CarteChiffre libelle={t('revenus.total')} valeur={formaterMontant(resume.total)} teinte="lagune" />
              <CarteChiffre
                libelle={t('revenus.mois', { mois: libelleMois(resume.mois_en_cours) })}
                valeur={formaterMontant(resume.total_mois_en_cours)}
                valeurEnLagune
              />
            </div>

            <section>
              <h2 className="font-display text-[26px] font-bold leading-tight text-foreground">{t('revenus.parMois')}</h2>
              <div className="mt-5 overflow-x-auto rounded-[28px] border border-border bg-card px-6 py-2 sm:px-7">
                {resume.par_mois.length === 0 ? (
                  <p className="py-10 text-center text-base text-muted-foreground">{t('revenus.aucune')}</p>
                ) : (
                  <table className="w-full min-w-[420px] border-collapse text-left">
                    <thead>
                      <tr className="text-sm text-muted-foreground">
                        <th scope="col" className="py-4 font-medium">{t('revenus.colMois')}</th>
                        <th scope="col" className="py-4 text-right font-medium">{t('revenus.colRetraits')}</th>
                        <th scope="col" className="py-4 text-right font-medium">{t('revenus.colCommissions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resume.par_mois.map((m) => (
                        <tr key={m.mois} className="border-t border-border">
                          <th scope="row" className="py-4 font-bold capitalize text-foreground">{libelleMois(m.mois)}</th>
                          <td className="py-4 text-right text-[#45524F]">{m.nombre}</td>
                          <td className="py-4 text-right font-bold text-primary">{formaterMontant(m.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        )}

        <section>
          <h2 className="font-display text-[26px] font-bold leading-tight text-foreground">{t('revenus.detail')}</h2>
          <div className="mt-5">
            {chargement && commissions.length === 0 ? (
              <SqueletteListe lignes={3} />
            ) : (
              <CarteListe vide={commissions.length === 0} messageVide={t('revenus.aucune')}>
                {commissions.map((c) => (
                  <li key={c.id_commission} className={classeLigne}>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground">{c.cagnotte.titre}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('revenus.ligne', {
                          date: formaterDate(c.date),
                          brut: formaterMontant(c.retrait.montant_brut),
                          nom: `${c.retrait.utilisateur.prenom} ${c.retrait.utilisateur.nom}`,
                          net: formaterMontant(c.retrait.montant_net),
                        })}
                      </p>
                    </div>
                    <p className="shrink-0 font-display text-xl font-bold text-primary">
                      {formaterMontant(c.montant)} <span className="font-sans text-sm font-medium text-muted-foreground">({formaterTaux(c.taux)})</span>
                    </p>
                  </li>
                ))}
              </CarteListe>
            )}
          </div>
          {pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('commun:actions.precedent')}</Button>
              <p className="text-sm text-muted-foreground">{t('commun:actions.pagination', { page, pages })}</p>
              <Button variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>{t('commun:actions.suivant')}</Button>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
