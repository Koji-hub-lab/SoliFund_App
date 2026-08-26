import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CategoriesService } from './categories.service';
import { CreateCategorieDto } from './dto/create-categorie.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  lister() {
    return this.categoriesService.lister();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  creer(@Body() dto: CreateCategorieDto) {
    return this.categoriesService.creer(dto);
  }
}
