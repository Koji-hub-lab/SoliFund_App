import {
  PaginationDto,
  construirePage,
  lirePagination,
} from '../common/pagination';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';
import { UpdateUtilisateurDto } from './dto/update-utilisateur.dto';
import { ChangeStatutDto } from './dto/change-statut.dto';
import { ChangerMotDePasseDto } from './dto/changer-mot-de-passe.dto';
import { JetonsService } from '../jetons/jetons.service';
import { identiteVerifiee } from '../verification-identite/identite';
import type { Langue } from '../i18n/langues';
import { m } from '../i18n/messages';

// Champs du profil renvoyés à l'utilisateur lui-même (GET et PATCH /utilisateurs/moi).
// mot_de_passe n'est lu que pour calculer a_mot_de_passe (voir formaterProfil) : jamais renvoyé.
const SELECTION_PROFIL = {
  id_utilisateur: true,
  mot_de_passe: true,
  nom: true,
  prenom: true,
  email: true,
  telephone: true,
  est_verifie: true,
  date_inscription: true,
  langue_preferee: true,
  posseders: { select: { role: { select: { nom: true } } } },
} satisfies Prisma.UtilisateurSelect;

function formaterProfil({
  posseders,
  mot_de_passe,
  ...profil
}: Prisma.UtilisateurGetPayload<{ select: typeof SELECTION_PROFIL }>) {
  return {
    ...profil,
    roles: posseders.map((p) => p.role.nom),
    // Faux pour un compte créé avec Google : l'interface propose alors « Définir un mot de passe ».
    a_mot_de_passe: mot_de_passe !== null,
  };
}

@Injectable()
export class UtilisateursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jetonsService: JetonsService,
  ) {}

  // langue : celle de l'interface au moment de l'inscription (Accept-Language), enregistrée comme
  // langue préférée ; l'email de vérification est envoyé dans cette langue.
  async inscrire(dto: CreateUtilisateurDto, langue: Langue) {
    const emailExistant = await this.prisma.utilisateur.findUnique({
      where: { email: dto.email },
    });
    if (emailExistant) {
      throw new ConflictException(m('utilisateurs.emailDejaUtilise'));
    }

    const mot_de_passe_hash = await bcrypt.hash(dto.mot_de_passe, 10);

    const utilisateur = await this.prisma.utilisateur.create({
      data: {
        nom: dto.nom,
        prenom: dto.prenom,
        email: dto.email,
        mot_de_passe: mot_de_passe_hash,
        telephone: dto.telephone,
        langue_preferee: langue,
        posseders: {
          create: { role: { connect: { nom: 'ROLE_USER' } } },
        },
      },
      select: {
        id_utilisateur: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        date_inscription: true,
        est_verifie: true,
        langue_preferee: true,
      },
    });

    // Code de vérification envoyé par email (valable 30 minutes).
    await this.jetonsService.envoyerCodeVerification(utilisateur);

    return utilisateur;
  }

  async trouverParEmail(email: string) {
    return this.prisma.utilisateur.findUnique({ where: { email } });
  }

  // Profil de l'utilisateur connecté (GET /utilisateurs/moi). Jamais le mot de passe.
  async moi(idUtilisateur: number) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id_utilisateur: idUtilisateur },
      select: SELECTION_PROFIL,
    });
    if (!utilisateur) {
      throw new NotFoundException(m('utilisateurs.introuvable'));
    }
    return this.profilComplet(utilisateur);
  }

  // Profil renvoyé au frontend, avec l'état de la vérification d'identité.
  private async profilComplet(
    utilisateur: Prisma.UtilisateurGetPayload<{
      select: typeof SELECTION_PROFIL;
    }>,
  ) {
    return {
      ...formaterProfil(utilisateur),
      identite_verifiee: await identiteVerifiee(
        this.prisma,
        utilisateur.id_utilisateur,
      ),
    };
  }

  async modifierProfil(idUtilisateur: number, dto: UpdateUtilisateurDto) {
    try {
      const utilisateur = await this.prisma.utilisateur.update({
        where: { id_utilisateur: idUtilisateur },
        // undefined = champ non envoyé, laissé tel quel ; telephone null = numéro supprimé.
        data: {
          nom: dto.nom,
          prenom: dto.prenom,
          telephone: dto.telephone,
          langue_preferee: dto.langue_preferee,
        },
        select: SELECTION_PROFIL,
      });
      return await this.profilComplet(utilisateur);
    } catch (e) {
      // telephone est unique en base.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(m('base.doublonTelephone'));
      }
      throw e;
    }
  }

  // Exige le mot de passe actuel, sauf pour un compte qui n'en a pas encore (créé avec Google) :
  // il en définit alors un. date_changement_mdp invalide les jetons émis avant (JwtStrategy) :
  // le frontend reconnecte ensuite l'utilisateur avec son nouveau mot de passe.
  async changerMotDePasse(idUtilisateur: number, dto: ChangerMotDePasseDto) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id_utilisateur: idUtilisateur },
      select: { mot_de_passe: true },
    });
    if (!utilisateur) {
      throw new NotFoundException(m('utilisateurs.introuvable'));
    }
    if (utilisateur.mot_de_passe) {
      if (!dto.ancien_mot_de_passe) {
        throw new BadRequestException(m('validation.motDePasseActuelRequis'));
      }
      // 400 et non 401 : un 401 déconnecterait l'utilisateur côté frontend.
      if (
        !(await bcrypt.compare(
          dto.ancien_mot_de_passe,
          utilisateur.mot_de_passe,
        ))
      ) {
        throw new BadRequestException(
          m('utilisateurs.motDePasseActuelIncorrect'),
        );
      }
      if (dto.ancien_mot_de_passe === dto.nouveau_mot_de_passe) {
        throw new BadRequestException(m('utilisateurs.motDePasseIdentique'));
      }
    }

    await this.prisma.utilisateur.update({
      where: { id_utilisateur: idUtilisateur },
      data: {
        mot_de_passe: await bcrypt.hash(dto.nouveau_mot_de_passe, 10),
        date_changement_mdp: new Date(),
      },
    });
    return {
      message: utilisateur.mot_de_passe
        ? m('utilisateurs.motDePasseModifie')
        : m('utilisateurs.motDePasseDefini'),
    };
  }

  async listerTous(dto: PaginationDto) {
    const { page, limite, skip, take } = lirePagination(dto, 20);
    const [utilisateurs, total] = await this.prisma.$transaction([
      this.prisma.utilisateur.findMany({
        select: {
          id_utilisateur: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          statut: true,
          date_inscription: true,
          posseders: { include: { role: true } },
        },
        orderBy: [{ date_inscription: 'desc' }, { id_utilisateur: 'desc' }],
        skip,
        take,
      }),
      this.prisma.utilisateur.count(),
    ]);

    const donnees = utilisateurs.map((u) => ({
      id_utilisateur: u.id_utilisateur,
      nom: u.nom,
      prenom: u.prenom,
      email: u.email,
      telephone: u.telephone,
      statut: u.statut,
      date_inscription: u.date_inscription,
      roles: u.posseders.map((p) => p.role.nom),
    }));
    return construirePage(donnees, total, page, limite);
  }

  async changerStatut(
    idUtilisateur: number,
    dto: ChangeStatutDto,
    idAdmin: number,
  ) {
    if (idUtilisateur === idAdmin) {
      throw new ForbiddenException(m('utilisateurs.propreStatut'));
    }
    const cible = await this.prisma.utilisateur.findUnique({
      where: { id_utilisateur: idUtilisateur },
      select: { posseders: { select: { role: { select: { nom: true } } } } },
    });
    if (!cible) {
      throw new NotFoundException(m('utilisateurs.introuvable'));
    }
    if (cible.posseders.some((p) => p.role.nom === 'ROLE_ADMIN')) {
      throw new ForbiddenException(m('utilisateurs.statutAdmin'));
    }

    return this.prisma.$transaction(async (tx) => {
      // Un compte banni ne doit plus collecter : ses cagnottes actives sont suspendues.
      if (dto.statut === 'BANNI') {
        await tx.cagnotte.updateMany({
          where: { id_utilisateur: idUtilisateur, statut: 'ACTIVE' },
          data: { statut: 'SUSPENDUE' },
        });
      }
      return tx.utilisateur.update({
        where: { id_utilisateur: idUtilisateur },
        data: { statut: dto.statut },
        select: { id_utilisateur: true, nom: true, prenom: true, statut: true },
      });
    });
  }
}
