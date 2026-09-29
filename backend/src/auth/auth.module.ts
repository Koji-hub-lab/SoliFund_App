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
        signOptions: { expiresIn: '1d' },
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
