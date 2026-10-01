// Point d'entrée lancé par Phusion Passenger (cPanel o2switch, « Setup Node.js App », champ
// « Application startup file » : app.js). Il démarre l'API compilée par « npm run deploiement »
// (nest build → dist/src/main.js). Passenger fournit le port dans process.env.PORT, lu par main.ts.
// Les tâches planifiées ne tournent pas ici : voir docs/DEPLOIEMENT-O2SWITCH.md (Cron).
require('./dist/src/main.js');
