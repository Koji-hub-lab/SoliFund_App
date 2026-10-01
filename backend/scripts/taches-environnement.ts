// Importé en premier par scripts/taches.ts : désactive les tâches internes (@nestjs/schedule) avant
// le chargement de AppModule, quel que soit le fichier .env.
process.env.TACHES_INTERNES = 'false';
