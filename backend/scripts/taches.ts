// Tâches planifiées en ligne de commande, pour Cron (hébergement où l'application peut être mise en
// veille, comme Passenger sur cPanel). Démarre un contexte NestJS SANS serveur HTTP, exécute une
// tâche, puis s'arrête. Code de sortie : 0 succès, 1 échec, 2 tâche inconnue.
//
//   npm run build && node dist/scripts/taches.js reconciliation
// (toujours la version compilée : tsx ne fournit pas les métadonnées dont NestJS a besoin.)
//
// Tâches : voir TACHES dans src/taches/taches.service.ts. Le fichier .env du dossier courant est lu :
// lancer la commande depuis le dossier backend/.

// Jamais de tâches internes (@nestjs/schedule) dans ce processus : il lance lui-même la tâche.
// Placé avant l'import de AppModule, qui lit cette variable.
import './taches-environnement';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TACHES, TachesService, estTache } from '../src/taches/taches.service';

async function principal(): Promise<number> {
  const nom = process.argv[2];
  if (!estTache(nom)) {
    console.error(
      `Tâche inconnue : « ${nom ?? ''} ». Tâches possibles : ${TACHES.join(', ')}.`,
    );
    return 2;
  }
  const debut = Date.now();
  // Seuls les avertissements et les erreurs de NestJS : une ligne de résumé par exécution suffit
  // dans le journal des tâches Cron.
  const contexte = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const resume = await contexte.get(TachesService).executer(nom);
    console.log(
      `${new Date().toISOString()} [${nom}] ${resume} (${Date.now() - debut} ms)`,
    );
    return 0;
  } catch (e) {
    Logger.error(
      `Échec de la tâche ${nom}`,
      e instanceof Error ? e.stack : String(e),
      `Tâche ${nom}`,
    );
    return 1;
  } finally {
    await contexte.close();
  }
}

principal()
  .then((code) => process.exit(code))
  .catch((e: unknown) => {
    // Démarrage impossible (configuration invalide, base injoignable...).
    console.error(e instanceof Error ? e.stack : e);
    process.exit(1);
  });
