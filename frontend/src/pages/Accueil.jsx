import { SiteHeader } from '../components/site/SiteHeader';
import { Hero } from '../components/site/Hero';
import LisereWax from '../components/site/LisereWax';
import { HowItWorks } from '../components/site/HowItWorks';
import { PopularCagnottes } from '../components/site/PopularCagnottes';
import { BlocConfiance } from '../components/site/BlocConfiance';
import { AppelFinal } from '../components/site/AppelFinal';
import { SiteFooter } from '../components/site/SiteFooter';

export default function Accueil() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <LisereWax />
        <HowItWorks />
        <PopularCagnottes />
        <BlocConfiance />
        <AppelFinal />
      </main>
      <SiteFooter />
    </div>
  );
}
