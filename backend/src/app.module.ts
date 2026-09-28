import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Limite globale par IP ; les routes /auth/* ont une limite plus stricte (voir AuthController).
    ThrottlerModule.forRoot({ throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }] }),
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
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}