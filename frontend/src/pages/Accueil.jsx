import { SiteHeader } from '../components/site/SiteHeader';
import { Hero } from '../components/site/Hero';
import { ReassuranceBar } from '../components/site/ReassuranceBar';
import { HowItWorks } from '../components/site/HowItWorks';
import { PopularCagnottes } from '../components/site/PopularCagnottes';
import { SiteFooter } from '../components/site/SiteFooter';

export default function Accueil() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <ReassuranceBar />
        <HowItWorks />
        <PopularCagnottes />
      </main>
      <SiteFooter />
    </div>
  );
}