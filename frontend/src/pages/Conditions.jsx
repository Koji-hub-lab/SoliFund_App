import { Link } from 'react-router-dom';
import PageLegale from '../components/site/PageLegale';

const lien = 'font-bold text-primary underline decoration-2 underline-offset-[5px]';

const sections = [
  {
    id: 'objet',
    titre: 'Objet et rôle de SoliFund',
    contenu: (
      <>
        <p>
          SoliFund est une plateforme en ligne qui permet à toute personne inscrite (l'« organisateur ») de créer une
          cagnotte pour un projet personnel, familial, associatif ou solidaire, et à toute personne (le « donateur »)
          d'y contribuer par Mobile Money (MTN Mobile Money ou Orange Money), en francs CFA (XAF).
        </p>
        <p>
          SoliFund met à disposition l'outil technique : pages de cagnotte, collecte des dons par l'intermédiaire d'un
          prestataire de paiement, suivi des montants et versement des fonds à l'organisateur. SoliFund n'est pas
          l'organisateur des projets présentés et ne garantit pas leur réalisation.
        </p>
        <p>Les présentes conditions s'appliquent à toute personne qui utilise le site, avec ou sans compte.</p>
      </>
    ),
  },
  {
    id: 'compte',
    titre: 'Création de compte',
    contenu: (
      <>
        <p>
          La création d'une cagnotte, un don ou un commentaire nécessitent un compte. Vous vous engagez à fournir des
          informations exactes (nom, prénom, adresse email, téléphone) et à les tenir à jour.
        </p>
        <p>
          Votre adresse email doit être vérifiée avant de créer une cagnotte ou de demander un retrait. Vous êtes
          responsable de la confidentialité de votre mot de passe et de toute activité réalisée depuis votre compte.
        </p>
        <p>[Âge minimum pour ouvrir un compte à préciser.]</p>
      </>
    ),
  },
  {
    id: 'organisateurs',
    titre: 'Obligations des organisateurs',
    contenu: (
      <>
        <p>En créant une cagnotte, l'organisateur s'engage à :</p>
        <ul>
          <li>décrire son projet de façon sincère et complète, sans information trompeuse ;</li>
          <li>utiliser les fonds collectés uniquement pour le projet annoncé ;</li>
          <li>publier des nouvelles aux donateurs et répondre aux questions légitimes sur l'usage des fonds ;</li>
          <li>ne publier que des photos et des textes dont il détient les droits, respectueux des personnes ;</li>
          <li>
            ne pas utiliser SoliFund pour une activité illégale, une fraude, le blanchiment d'argent, le financement
            d'activités violentes ou la collecte au profit d'une personne sans son accord ;
          </li>
          <li>respecter les obligations fiscales et légales qui s'appliquent aux sommes qu'il reçoit.</li>
        </ul>
        <p>
          Une cagnotte qui a déjà reçu des dons ne peut pas être supprimée : elle est annulée, et son historique est
          conservé.
        </p>
      </>
    ),
  },
  {
    id: 'dons',
    titre: 'Dons',
    contenu: (
      <>
        <p>
          Le don minimum est de 100 XAF. Le paiement est réalisé par Mobile Money auprès de l'opérateur choisi ; le don
          n'est comptabilisé qu'après confirmation du paiement par le prestataire.
        </p>
        <p>
          Un don est un acte volontaire et sans contrepartie. Sauf erreur technique ou fraude avérée, il n'est pas
          remboursable. [Politique de remboursement à préciser.]
        </p>
        <p>
          Le donateur peut choisir d'apparaître comme anonyme : son nom n'est alors affiché ni sur la page de la
          cagnotte ni à l'organisateur. SoliFund conserve toutefois l'information pour ses obligations de suivi.
        </p>
        <p>Une cagnotte ne reçoit plus de dons après sa date de fin, ni lorsqu'elle est suspendue ou annulée.</p>
      </>
    ),
  },
  {
    id: 'retraits',
    titre: 'Retraits des fonds',
    contenu: (
      <>
        <p>
          L'organisateur demande le retrait de tout ou partie des fonds disponibles vers un numéro Mobile Money (100 XAF
          minimum). Le montant disponible correspond aux dons confirmés, moins les retraits déjà demandés ou versés.
        </p>
        <p>
          Chaque demande est vérifiée par l'équipe SoliFund avant versement. Elle peut être refusée, avec un motif,
          notamment en cas de doute sur l'identité du bénéficiaire ou sur l'usage des fonds. Aucun retrait n'est possible
          sur une cagnotte suspendue ou annulée. [Délai habituel de traitement à préciser.]
        </p>
      </>
    ),
  },
  {
    id: 'frais',
    titre: 'Frais',
    contenu: (
      <>
        <p>
          À la date de mise à jour de ce document, SoliFund ne prélève aucune commission sur les dons ni sur les
          retraits. [Politique tarifaire définitive à préciser avant le lancement.]
        </p>
        <p>
          Les frais éventuellement facturés par les opérateurs Mobile Money pour un paiement ou un transfert restent
          régis par les conditions de ces opérateurs.
        </p>
      </>
    ),
  },
  {
    id: 'moderation',
    titre: 'Modération, suspension et fermeture',
    contenu: (
      <>
        <p>
          SoliFund peut suspendre une cagnotte (plus de dons ni de retraits, page masquée au public) en cas de
          signalement, de contenu contraire aux présentes conditions ou de soupçon de fraude. Le motif est communiqué à
          l'organisateur.
        </p>
        <p>
          Un compte peut être suspendu temporairement ou banni en cas de manquement grave. Le bannissement d'un compte
          suspend ses cagnottes actives.
        </p>
      </>
    ),
  },
  {
    id: 'responsabilite',
    titre: 'Responsabilité',
    contenu: (
      <>
        <p>
          L'organisateur est seul responsable du contenu de sa cagnotte et de l'utilisation des fonds. SoliFund met en
          œuvre des moyens raisonnables pour assurer le bon fonctionnement du service, sans garantir une disponibilité
          permanente.
        </p>
        <p>
          SoliFund ne saurait être tenu responsable d'une interruption ou d'une erreur imputable à un opérateur Mobile
          Money, au prestataire de paiement ou au réseau. [Limites de responsabilité à valider par un juriste.]
        </p>
      </>
    ),
  },
  {
    id: 'donnees',
    titre: 'Données personnelles',
    contenu: (
      <p>
        Le traitement de vos données est décrit dans la{' '}
        <Link to="/confidentialite" className={lien}>politique de confidentialité</Link>.
      </p>
    ),
  },
  {
    id: 'modifications',
    titre: 'Modification des conditions et droit applicable',
    contenu: (
      <>
        <p>
          SoliFund peut modifier les présentes conditions. Les utilisateurs inscrits sont informés des changements
          importants avant leur entrée en vigueur.
        </p>
        <p>
          Les présentes conditions sont soumises au droit camerounais. [Juridiction compétente et mode de règlement
          amiable des litiges à préciser.]
        </p>
      </>
    ),
  },
  {
    id: 'contact',
    titre: 'Contact',
    contenu: (
      <p>
        Pour toute question, signalement ou réclamation : [adresse email de contact à compléter]. [Raison sociale,
        adresse et numéro d'immatriculation de l'éditeur à compléter.]
      </p>
    ),
  },
];

export default function Conditions() {
  return (
    <PageLegale
      titre="Conditions d'utilisation"
      introduction="Ces conditions fixent les règles d'utilisation de SoliFund pour les organisateurs de cagnottes et les donateurs."
      miseAJour="29 septembre 2026"
      sections={sections}
    />
  );
}
