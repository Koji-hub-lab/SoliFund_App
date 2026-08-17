import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';

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
          create: {
            role: {
              connect: { nom: 'ROLE_USER' },
            },
          },
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
}