import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy, googleConfigure } from './google.strategy';
import { GoogleAuthGuard } from './google-auth.guard';
import { UtilisateursModule } from '../utilisateurs/utilisateurs.module';
import { JetonsModule } from '../jetons/jetons.module';

// Durée de validité des jetons (JWT_DUREE, vérifiée au démarrage) : un nombre de secondes
// (« 3600 ») ou une durée avec son unité (« 30m », « 12h », « 1d ») ; 1 jour par défaut.
function dureeJeton(
  valeur?: string,
): number | `${number}${'s' | 'm' | 'h' | 'd'}` {
  const duree = valeur?.trim() || '1d';
  return /^\d+$/.test(duree)
    ? Number(duree)
    : (duree as `${number}${'s' | 'm' | 'h' | 'd'}`);
}

@Module({
  imports: [
    UtilisateursModule,
    JetonsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: dureeJeton(config.get<string>('JWT_DUREE')) },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleAuthGuard,
    // La stratégie Google n'est créée que si les variables GOOGLE_* sont renseignées.
    {
      provide: GoogleStrategy,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        googleConfigure(config) ? new GoogleStrategy(config) : null,
    },
  ],
})
export class AuthModule {}
