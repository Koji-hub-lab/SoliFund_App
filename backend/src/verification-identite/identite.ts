import type { Prisma, PrismaClient } from '@prisma/client';

type ClientPrisma = PrismaClient | Prisma.TransactionClient;

// Dernière soumission d'un utilisateur : c'est elle qui fait foi (l'historique est conservé).
export function derniereVerification(
  prisma: ClientPrisma,
  idUtilisateur: number,
) {
  return prisma.verificationIdentite.findFirst({
    where: { id_utilisateur: idUtilisateur },
    orderBy: { id_verification: 'desc' },
  });
}

// Identité vérifiée = la dernière soumission est VALIDEE.
export async function identiteVerifiee(
  prisma: ClientPrisma,
  idUtilisateur: number,
): Promise<boolean> {
  const derniere = await prisma.verificationIdentite.findFirst({
    where: { id_utilisateur: idUtilisateur },
    orderBy: { id_verification: 'desc' },
    select: { statut: true },
  });
  return derniere?.statut === 'VALIDEE';
}
