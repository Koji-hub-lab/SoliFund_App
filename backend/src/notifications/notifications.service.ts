import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // Crée une notification et la lie immédiatement à un destinataire.
  async envoyer(
    idDestinataire: number,
    titre: string,
    message: string,
    type: 'DON' | 'RETRAIT' | 'COMMENTAIRE' | 'SYSTEME' | 'VERIFICATION',
    idCagnotte?: number,
  ) {
    const notification = await this.prisma.notification.create({
      data: { titre, message, type, id_cagnotte: idCagnotte },
    });

    await this.prisma.recevoir.create({
      data: {
        id_utilisateur: idDestinataire,
        id_notification: notification.id_notification,
      },
    });

    return notification;
  }

  async listerPourUtilisateur(idUtilisateur: number) {
    return this.prisma.recevoir.findMany({
      where: { id_utilisateur: idUtilisateur },
      include: { notification: true },
      orderBy: { notification: { date_envoi: 'desc' } },
    });
  }

  async marquerLue(idUtilisateur: number, idNotification: number) {
    return this.prisma.recevoir.update({
      where: {
        id_utilisateur_id_notification: {
          id_utilisateur: idUtilisateur,
          id_notification: idNotification,
        },
      },
      data: { statut: 'LUE', date_lecture: new Date() },
    });
  }
}
