import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
import { ListerCagnottesAdminDto } from './dto/lister-cagnottes-admin.dto';
import { ChangerStatutCagnotteDto } from './dto/changer-statut-cagnotte.dto';

// RolesGuard lit @Roles sur chaque méthode : le décorateur est répété sur chaque route.
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles('ROLE_ADMIN')
  @Get('statistiques')
  statistiques() {
    return this.adminService.statistiques();
  }

  @Roles('ROLE_ADMIN')
  @Get('cagnottes')
  listerCagnottes(@Query() dto: ListerCagnottesAdminDto) {
    return this.adminService.listerCagnottes(dto);
  }

  @Roles('ROLE_ADMIN')
  @Patch('cagnottes/:id/statut')
  changerStatutCagnotte(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangerStatutCagnotteDto,
  ) {
    return this.adminService.changerStatutCagnotte(id, dto);
  }
}
