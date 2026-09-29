import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { UtilisateursModule } from './utilisateurs/utilisateurs.module';
import { AuthModule } from './auth/auth.module';
import { CagnottesModule } from './cagnottes/cagnottes.module';
import { DonsModule } from './dons/dons.module';
import { RetraitsModule } from './retraits/retraits.module';
import { CategoriesModule } from './categories/categories.module';
import { CommentairesModule } from './commentaires/commentaires.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ActualitesModule } from './actualites/actualites.module';
import { PaymentModule } from './payment/payment.module';
import { TachesModule } from './taches/taches.module';
import { AdminModule } from './admin/admin.module';
import { validerEnvironnement } from './config/env.validation';
import { PartageModule } from './partage/partage.module';
import { SanteController } from './sante/sante.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validerEnvironnement }),
    // Limite globale par IP ; les routes /auth/* ont une limite plus stricte (voir AuthController).
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    UtilisateursModule,
    AuthModule,
    CagnottesModule,
    DonsModule,
    RetraitsModule,
    CategoriesModule,
    CommentairesModule,
    NotificationsModule,
    ActualitesModule,
    PaymentModule,
    TachesModule,
    AdminModule,
    PartageModule,
  ],
  controllers: [SanteController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
