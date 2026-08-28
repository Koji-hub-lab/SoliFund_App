import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('mot-de-passe-oublie')
  demanderReinitialisation(@Body() dto: ForgotPasswordDto) {
    return this.authService.demanderReinitialisation(dto);
  }

  @Post('verifier-code')
  verifierCode(@Body() dto: VerifyCodeDto) {
    return this.authService.verifierCode(dto);
  }

  @Post('reinitialiser-mot-de-passe')
  reinitialiserMotDePasse(@Body() dto: ResetPasswordDto) {
    return this.authService.reinitialiserMotDePasse(dto);
  }
}