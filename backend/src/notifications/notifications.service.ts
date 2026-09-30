import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Codes des notifications. Aucun texte n'est enregistré : le frontend affiche le titre et le
// message de chaque code dans la langue active (locales/*/tableau-de-bord.json, « codesNotification »), à
// partir des paramètres. Tout nouveau code doit y être ajouté dans les deux langues.
export type CodeNotification =
  | 'DON_RECU' // montant, devise, titre
  | 'COMMENTAIRE_RECU' // prenom, titre
  | 'CAGNOTTE_PUBLIEE' // titre
  | 'CAGNOTTE_PUBLIEE_IDENTITE' // titre
  | 'CAGNOTTE_REFUSEE' // titre, motif
  | 'CAGNOTTE_SUSPENDUE' // titre, motif
  | 'CAGNOTTE_SUSPENDUE_SIGNALEMENTS' // titre
  | 'CAGNOTTE_REACTIVEE' // titre
  | 'CAGNOTTE_TERMINEE' // titre, montant, devise
  | 'IDENTITE_VERIFIEE' // telephone
  | 'IDENTITE_REFUSEE' // motif
  | 'RETRAIT_TRAITE' // brut, net, commission, devise, numero
  | 'RETRAIT_REJETE' // brut, devise, motif (vide si aucun)
  // Alertes de modération destinées aux administrateurs (voir AlertesAdminService)
  | 'IDENTITE_A_VERIFIER' // prenoms, nom
  | 'CAGNOTTE_EN_VERIFICATION' // titre, raisons (codes)
  | 'SUSPENSION_AUTOMATIQUE'; // titre, nombre

export type ParametresNotification = Record<string, string | number | string[]>;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // Crée une notification et la lie immédiatement à un destinataire.
  async envoyer(
    idDestinataire: number,
    code: CodeNotification,
    parametres: ParametresNotification,
    type: 'DON' | 'RETRAIT' | 'COMMENTAIRE' | 'SYSTEME' | 'VERIFICATION',
    idCagnotte?: number,
  ) {
    const notification = await this.prisma.notification.create({
      data: { code, parametres, type, id_cagnotte: idCagnotte },
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
