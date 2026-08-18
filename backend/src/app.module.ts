import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}