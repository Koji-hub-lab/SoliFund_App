import { Lock } from 'lucide-react';

const methods = [
  { name: 'MTN Mobile Money', short: 'MTN', bg: 'bg-[#FFCC00]', fg: 'text-[#1a1a1a]' },
  { name: 'Orange Money', short: 'Orange', bg: 'bg-[#FF7900]', fg: 'text-white' },
];

export function ReassuranceBar() {
  return (
    <section className="border-y border-border bg-secondary">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-5 px-4 py-6 sm:px-6 md:flex-row md:justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Lock className="size-4 text-primary" />
          Paiements locaux 100% sécurisés
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-3">
          {methods.map((m) => (
            <li key={m.name} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <span className={`flex h-6 min-w-11 items-center justify-center rounded-md px-1.5 text-xs font-bold ${m.bg} ${m.fg}`}>
                {m.short}
              </span>
              <span className="text-sm font-medium text-muted-foreground">{m.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}