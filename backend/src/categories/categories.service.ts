import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategorieDto } from './dto/create-categorie.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  lister() {
    return this.prisma.categorie.findMany();
  }

  creer(dto: CreateCategorieDto) {
    return this.prisma.categorie.create({ data: dto });
  }
}