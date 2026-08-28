import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';
import { UpdateUtilisateurDto } from './dto/update-utilisateur.dto';
import { ChangeStatutDto } from './dto/change-statut.dto';

@Injectable()
export class UtilisateursService {
  constructor(private readonly prisma: PrismaService) {}

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
      },
    });

    return utilisateur;
  }

  async trouverParEmail(email: string) {
    return this.prisma.utilisateur.findUnique({ where: { email } });
  }

  async modifierProfil(idUtilisateur: number, dto: UpdateUtilisateurDto) {
    const donnees: any = {
      nom: dto.nom,
      prenom: dto.prenom,
      telephone: dto.telephone,
    };

    if (dto.mot_de_passe) {
      donnees.mot_de_passe = await bcrypt.hash(dto.mot_de_passe, 10);
    }

    return this.prisma.utilisateur.update({
      where: { id_utilisateur: idUtilisateur },
      data: donnees,
      select: {
        id_utilisateur: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        photo_profil: true,
      },
    });
  }

  async listerTous() {
    const utilisateurs = await this.prisma.utilisateur.findMany({
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
      orderBy: { date_inscription: 'desc' },
    });

    return utilisateurs.map((u) => ({
      id_utilisateur: u.id_utilisateur,
      nom: u.nom,
      prenom: u.prenom,
      email: u.email,
      telephone: u.telephone,
      statut: u.statut,
      date_inscription: u.date_inscription,
      roles: u.posseders.map((p) => p.role.nom),
    }));
  }

  async changerStatut(idUtilisateur: number, dto: ChangeStatutDto) {
    return this.prisma.utilisateur.update({
      where: { id_utilisateur: idUtilisateur },
      data: { statut: dto.statut },
      select: { id_utilisateur: true, nom: true, prenom: true, statut: true },
    });
  }
}