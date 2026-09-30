import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { map, Observable } from 'rxjs';
import { langueDeLaRequete } from './langue-requete.decorator';
import { estMessageCode, traduireTexte } from './messages';

// Traduit le champ « message » des réponses réussies ({ message: m('...') }) dans la langue de la
// requête. Les autres réponses ne sont pas touchées.
@Injectable()
export class TraductionReponses implements NestInterceptor {
  intercept(
    contexte: ExecutionContext,
    suite: CallHandler,
  ): Observable<unknown> {
    if (contexte.getType() !== 'http') return suite.handle();
    const langue = langueDeLaRequete(
      contexte.switchToHttp().getRequest<Request>(),
    );
    return suite.handle().pipe(
      map((reponse: unknown) => {
        if (reponse && typeof reponse === 'object' && !Array.isArray(reponse)) {
          const { message } = reponse as { message?: unknown };
          if (estMessageCode(message)) {
            return { ...reponse, message: traduireTexte(langue, message) };
          }
        }
        return reponse;
      }),
    );
  }
}
