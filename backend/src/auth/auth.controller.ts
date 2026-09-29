import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService, ErreurConnexionGoogle } from './auth.service';
import { GoogleAuthGuard } from './google-auth.guard';
import type { ProfilGoogle } from './google.strategy';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifierEmailDto } from './dto/verifier-email.dto';
import { RenvoyerCodeDto } from './dto/renvoyer-code.dto';

// 5 requêtes par minute et par IP sur /auth/* : limite la force brute sur le login et les codes.
@Throttle({ default: { limit: 5, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly urlFrontend: string;

  constructor(
    private readonly authService: AuthService,
    config: ConfigService,
  ) {
    this.urlFrontend = config
      .getOrThrow<string>('FRONTEND_URL')
      .replace(/\/+$/, '');
  }

  // Connexion avec Google : le garde redirige vers Google. Cette méthode n'est atteinte que si la
  // connexion Google n'est pas configurée (variables GOOGLE_* absentes).
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  google(@Res() res: Response) {
    res.redirect(this.urlEchecGoogle());
  }

  // Retour de Google. Le jeton est placé dans le fragment (#token=...) : le navigateur ne l'envoie
  // jamais au serveur, il n'apparaît donc dans aucun journal.
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async retourGoogle(
    @Req() req: Request & { user?: ProfilGoogle | null },
    @Res() res: Response,
  ) {
    if (!req.user) {
      res.redirect(this.urlEchecGoogle());
      return;
    }
    try {
      const jeton = await this.authService.connexionGoogle(req.user);
      res.redirect(
        `${this.urlFrontend}/auth/google/retour#token=${encodeURIComponent(jeton)}`,
      );
    } catch (e) {
      if (e instanceof ErreurConnexionGoogle) {
        res.redirect(this.urlEchecGoogle(e.motif));
        return;
      }
      this.logger.error(
        'Erreur lors de la connexion Google',
        e instanceof Error ? e.stack : String(e),
      );
      res.redirect(this.urlEchecGoogle());
    }
  }

  private urlEchecGoogle(motif?: string) {
    return `${this.urlFrontend}/login?erreur=google${motif ? `&motif=${motif}` : ''}`;
  }

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

  @Post('verifier-email')
  verifierEmail(@Body() dto: VerifierEmailDto) {
    return this.authService.verifierEmail(dto);
  }

  @Post('renvoyer-code-verification')
  renvoyerCodeVerification(@Body() dto: RenvoyerCodeDto) {
    return this.authService.renvoyerCodeVerification(dto);
  }
}
