import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { Button } from '../ui/Button';
import api, { API_URL } from '../../api/axios';
import { formaterMontant } from '../../utils/format';

const categorieClasses = {
  default: 'bg-primary/10 text-primary',
};

function CagnotteCard({ c }) {
  const percent = Math.min(100, Math.round((c.montant_collecte / c.objectif) * 100));
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
        {c.image && (
          <img
            src={`${API_URL}${c.image}`}
            alt={c.titre}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-semibold leading-snug text-foreground">{c.titre}</h3>

        <div className="mt-4 flex-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-sm font-bold text-foreground">{formaterMontant(c.montant_collecte, c.devise)}</span>
            <span className="text-sm font-semibold text-primary">{percent}%</span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            objectif {formaterMontant(c.objectif, c.devise)}
          </p>
        </div>

        <Button variant="outline" to={`/cagnottes/${c.id_cagnotte}`} className="mt-5 w-full">
          Participer
        </Button>
      </div>
    </article>
  );
}

export function PopularCagnottes() {
  const [cagnottes, setCagnottes] = useState([]);

  useEffect(() => {
    api.get('/cagnottes').then((res) => setCagnottes(res.data.slice(0, 4)));
  }, []);

  return (
    <section id="cagnottes" className="scroll-mt-16 bg-secondary">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-24">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">En ce moment</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Cagnottes populaires</h2>
            <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
              Rejoignez les Camerounais qui soutiennent des causes qui comptent.
            </p>
          </div>
          <Button variant="outline" to="/cagnottes-toutes">Voir toutes les cagnottes</Button>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cagnottes.map((c) => (
            <CagnotteCard key={c.id_cagnotte} c={c} />
          ))}
        </div>
        {cagnottes.length === 0 && <p className="mt-8 text-center text-muted-foreground">Aucune cagnotte pour le moment.</p>}
      </div>
    </section>
  );
}