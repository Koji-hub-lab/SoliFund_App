import { Module } from '@nestjs/common';
import { BrevoService } from './brevo.service';
import { JetonsService } from './jetons.service';

// Codes envoyés par email : utilisé par AuthModule (réinitialisation, vérification)
// et UtilisateursModule (envoi du code à l'inscription).
@Module({
  providers: [JetonsService, BrevoService],
  exports: [JetonsService, BrevoService],
})
export class JetonsModule {}
