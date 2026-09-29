import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { CagnottesService } from '../cagnottes/cagnottes.service';

const NOM_SITE = 'SoliFund';
const TITRE_GENERIQUE = 'SoliFund — Cagnottes solidaires au Cameroun';
const DESCRIPTION_GENERIQUE =
  'Réalisez vos projets, soutenez vos proches : cagnottes solidaires, dons par MTN Mobile Money et Orange Money.';
const LONGUEUR_DESCRIPTION = 160;

// Redirection du visiteur vers la vraie page. Les robots de WhatsApp et de Facebook n'exécutent pas
// le JavaScript : ils lisent les balises Open Graph et ne suivent pas cette redirection.
// Le script est toujours le même (l'URL est lue dans la page), ce qui permet de l'autoriser dans
// la CSP par son empreinte, sans autoriser les scripts intégrés en général.
const SCRIPT_REDIRECTION =
  'location.replace(document.querySelector(\'meta[name="solifund-redirection"]\').content);';
const EMPREINTE_SCRIPT = `'sha256-${createHash('sha256').update(SCRIPT_REDIRECTION).digest('base64')}'`;

// CSP propre à la page de partage : uniquement ce script, aucune autre ressource.
export const CSP_PAGE_PARTAGE = `default-src 'none'; script-src ${EMPREINTE_SCRIPT}; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;

// Échappe un texte pour l'insérer dans du HTML (contenu ou valeur d'attribut entre guillemets).
export function echapperHtml(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Résumé d'au plus `max` caractères, coupé sur un espace, avec « … » s'il est tronqué.
function extrait(texte: string, max: number): string {
  const propre = texte.replace(/\s+/g, ' ').trim();
  if (propre.length <= max) return propre;
  const coupe = propre.slice(0, max - 1);
  const dernierEspace = coupe.lastIndexOf(' ');
  return `${(dernierEspace > max / 2 ? coupe.slice(0, dernierEspace) : coupe).replace(/[\s,;:.]+$/, '')}…`;
}

type Apercu = {
  titre: string;
  description: string;
  image: string;
  texteImage: string;
  urlPartage: string;
  urlPage: string;
};

@Injectable()
export class PartageService {
  private readonly urlApi: string;
  private readonly urlFrontend: string;

  constructor(
    config: ConfigService,
    private readonly cagnottesService: CagnottesService,
  ) {
    const port = config.get<string>('PORT') ?? '3000';
    this.urlApi = (
      config.get<string>('PUBLIC_API_URL') ?? `http://localhost:${port}`
    ).replace(/\/+$/, '');
    this.urlFrontend = config
      .getOrThrow<string>('FRONTEND_URL')
      .replace(/\/+$/, '');
  }

  // Page HTML de partage d'une cagnotte. Une cagnotte inexistante ou non visible publiquement
  // (privée, suspendue, annulée) reçoit les balises génériques de SoliFund, sans aucun détail.
  async pageCagnotte(idTexte: string): Promise<string> {
    const id = /^\d{1,9}$/.test(idTexte) ? Number(idTexte) : null;
    const urlPartage = `${this.urlApi}/partage/cagnottes/${encodeURIComponent(idTexte)}`;
    const generique: Apercu = {
      titre: TITRE_GENERIQUE,
      description: DESCRIPTION_GENERIQUE,
      image: `${this.urlFrontend}/og-solifund.png`,
      texteImage: 'SoliFund, cagnottes solidaires au Cameroun',
      urlPartage,
      urlPage: id ? `${this.urlFrontend}/cagnottes/${id}` : this.urlFrontend,
    };
    if (!id) return this.html(generique);

    let cagnotte: Awaited<ReturnType<CagnottesService['trouverVisible']>>;
    try {
      // Visiteur anonyme : même règle de visibilité que GET /cagnottes/:id.
      cagnotte = await this.cagnottesService.trouverVisible(id, null);
    } catch (e) {
      if (e instanceof NotFoundException) return this.html(generique);
      throw e;
    }

    return this.html({
      titre: cagnotte.titre,
      description: cagnotte.description?.trim()
        ? extrait(cagnotte.description, LONGUEUR_DESCRIPTION)
        : `Soutenez « ${extrait(cagnotte.titre, 80)} » sur SoliFund, par MTN Mobile Money ou Orange Money.`,
      // Image de 1200 px (WebP) ; image générique si la cagnotte n'a pas de photo.
      image: cagnotte.image
        ? `${this.urlApi}${cagnotte.image}`
        : generique.image,
      texteImage: cagnotte.image ? cagnotte.titre : generique.texteImage,
      urlPartage,
      urlPage: `${this.urlFrontend}/cagnottes/${cagnotte.id_cagnotte}`,
    });
  }

  // og:url est le lien de partage lui-même : Facebook relit la page indiquée par og:url, et la page
  // React (sans balises) ferait perdre l'aperçu.
  private html(a: Apercu): string {
    const e = echapperHtml;
    const titrePage =
      a.titre === TITRE_GENERIQUE ? a.titre : `${a.titre} · ${NOM_SITE}`;
    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(titrePage)}</title>
<meta name="description" content="${e(a.description)}">
<meta property="og:site_name" content="${NOM_SITE}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${e(a.titre)}">
<meta property="og:description" content="${e(a.description)}">
<meta property="og:image" content="${e(a.image)}">
<meta property="og:image:alt" content="${e(a.texteImage)}">
<meta property="og:url" content="${e(a.urlPartage)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(a.titre)}">
<meta name="twitter:description" content="${e(a.description)}">
<meta name="twitter:image" content="${e(a.image)}">
<meta name="solifund-redirection" content="${e(a.urlPage)}">
<script>${SCRIPT_REDIRECTION}</script>
</head>
<body>
<p><a href="${e(a.urlPage)}">Continuer vers SoliFund</a></p>
</body>
</html>
`;
  }
}
