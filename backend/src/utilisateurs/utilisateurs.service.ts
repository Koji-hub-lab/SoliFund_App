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

// Champs du profil renvoyés à l'utilisateur lui-même (GET et PATCH /utilisateurs/moi).
const SELECTION_PROFIL = {
  id_utilisateur: true,
  nom: true,
  prenom: true,
  email: true,
  telephone: true,
  est_verifie: true,
  date_inscription: true,
  posseders: { select: { role: { select: { nom: true } } } },
} satisfies Prisma.UtilisateurSelect;

function formaterProfil({
  posseders,
  ...profil
}: Prisma.UtilisateurGetPayload<{ select: typeof SELECTION_PROFIL }>) {
  return { ...profil, roles: posseders.map((p) => p.role.nom) };
}

@Injectable()
export class UtilisateursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jetonsService: JetonsService,
  ) {}

  async inscrire(dto: CreateUtilisateurDto) {
    const emailExistant = await this.prisma.utilisateur.findUnique({
      where: { email: dto.email },
    });
    if (emailExistant) {
      throw new ConflictException('Cet email est déjà utilisé.');
    }

    const mot_de_passe_hash = await bcrypt.hash(dto.mot_de_passe, 10);

    const utilisateur = await this.prisma.utilisateur.create({
      data: {
        nom: dto.nom,
        prenom: dto.prenom,
        email: dto.email,
        mot_de_passe: mot_de_passe_hash,
        telephone: dto.telephone,
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
      throw new NotFoundException('Utilisateur introuvable.');
    }
    return formaterProfil(utilisateur);
  }

  async modifierProfil(idUtilisateur: number, dto: UpdateUtilisateurDto) {
    try {
      const utilisateur = await this.prisma.utilisateur.update({
        where: { id_utilisateur: idUtilisateur },
        // undefined = champ non envoyé, laissé tel quel ; telephone null = numéro supprimé.
        data: { nom: dto.nom, prenom: dto.prenom, telephone: dto.telephone },
        select: SELECTION_PROFIL,
      });
      return formaterProfil(utilisateur);
    } catch (e) {
      // telephone est unique en base.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ce numéro de téléphone est déjà utilisé par un autre compte.',
        );
      }
      throw e;
    }
  }

  // Exige le mot de passe actuel. date_changement_mdp invalide les jetons émis avant (JwtStrategy) :
  // le frontend reconnecte ensuite l'utilisateur avec son nouveau mot de passe.
  async changerMotDePasse(idUtilisateur: number, dto: ChangerMotDePasseDto) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id_utilisateur: idUtilisateur },
      select: { mot_de_passe: true },
    });
    if (!utilisateur) {
      throw new NotFoundException('Utilisateur introuvable.');
    }
    // 400 et non 401 : un 401 déconnecterait l'utilisateur côté frontend.
    if (
      !(await bcrypt.compare(dto.ancien_mot_de_passe, utilisateur.mot_de_passe))
    ) {
      throw new BadRequestException('Le mot de passe actuel est incorrect.');
    }
    if (dto.ancien_mot_de_passe === dto.nouveau_mot_de_passe) {
      throw new BadRequestException(
        "Le nouveau mot de passe doit être différent de l'actuel.",
      );
    }

    await this.prisma.utilisateur.update({
      where: { id_utilisateur: idUtilisateur },
      data: {
        mot_de_passe: await bcrypt.hash(dto.nouveau_mot_de_passe, 10),
        date_changement_mdp: new Date(),
      },
    });
    return { message: 'Mot de passe modifié.' };
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
      throw new ForbiddenException(
        'Vous ne pouvez pas modifier votre propre statut.',
      );
    }
    const cible = await this.prisma.utilisateur.findUnique({
      where: { id_utilisateur: idUtilisateur },
      select: { posseders: { select: { role: { select: { nom: true } } } } },
    });
    if (!cible) {
      throw new NotFoundException('Utilisateur introuvable.');
    }
    if (cible.posseders.some((p) => p.role.nom === 'ROLE_ADMIN')) {
      throw new ForbiddenException(
        "Le statut d'un administrateur ne peut pas être modifié.",
      );
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
