import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const LIMITE_MAX = 50;

// Paramètres de requête communs à toutes les listes paginées (?page=2&limite=20).
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LIMITE_MAX)
  limite?: number;
}

export type Page<T> = {
  donnees: T[];
  total: number;
  page: number;
  limite: number;
  pages: number;
};

// Calcule skip/take à partir des paramètres (avec la limite par défaut propre à chaque route).
export function lirePagination(
  dto: PaginationDto | undefined,
  limiteParDefaut: number,
) {
  const page = dto?.page ?? 1;
  const limite = dto?.limite ?? limiteParDefaut;
  return { page, limite, skip: (page - 1) * limite, take: limite };
}

export function construirePage<T>(
  donnees: T[],
  total: number,
  page: number,
  limite: number,
): Page<T> {
  return {
    donnees,
    total,
    page,
    limite,
    pages: Math.max(1, Math.ceil(total / limite)),
  };
}
