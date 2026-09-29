import { Link } from 'react-router-dom';
import PageLegale from '../components/site/PageLegale';

const lien = 'font-bold text-primary underline decoration-2 underline-offset-[5px]';

const sections = [
  {
    id: 'responsable',
    titre: 'Responsable du traitement',
    contenu: (
      <p>
        Les données personnelles collectées sur SoliFund sont traitées par [raison sociale et adresse de l'éditeur à
        compléter], dans le respect de la réglementation camerounaise applicable à la protection des données
        personnelles. [Références légales et éventuelles formalités auprès de l'autorité compétente à préciser par un
        juriste.]
      </p>
    ),
  },
  {
    id: 'donnees',
    titre: 'Données collectées',
    contenu: (
      <>
        <p>Nous collectons uniquement les données nécessaires au service :</p>
        <ul>
          <li>compte : nom, prénom, adresse email, téléphone (facultatif), mot de passe (conservé sous forme chiffrée, jamais en clair) ;</li>
          <li>cagnottes : titre, description, dates, objectif, photo de couverture, actualités publiées ;</li>
          <li>dons : montant, opérateur, numéro Mobile Money utilisé pour payer, message facultatif, choix de l'anonymat ;</li>
          <li>retraits : montant, opérateur et numéro Mobile Money du bénéficiaire ;</li>
          <li>commentaires publiés sur les cagnottes ;</li>
          <li>données techniques : date d'inscription, historique des opérations et journaux techniques du serveur.</li>
        </ul>
        <p>
          Les photos envoyées sont converties par nos serveurs, et leurs métadonnées (comme la position GPS enregistrée par
          l'appareil) sont supprimées.
        </p>
      </>
    ),
  },
  {
    id: 'usages',
    titre: 'Utilisation des données',
    contenu: (
      <>
        <p>Vos données servent à :</p>
        <ul>
          <li>créer et sécuriser votre compte, vérifier votre adresse email, réinitialiser votre mot de passe ;</li>
          <li>afficher les cagnottes, les dons (sans nom pour les dons anonymes) et les commentaires ;</li>
          <li>traiter les paiements et les retraits, et vous en informer par notification ;</li>
          <li>prévenir la fraude, modérer les contenus et respecter nos obligations légales.</li>
        </ul>
        <p>Vos données ne sont ni vendues ni utilisées à des fins publicitaires.</p>
      </>
    ),
  },
  {
    id: 'visibilite',
    titre: 'Ce qui est visible publiquement',
    contenu: (
      <ul>
        <li>sur une cagnotte publique : son contenu, le prénom et l'initiale du nom de l'organisateur ;</li>
        <li>la liste des dons : prénom et nom du donateur, sauf s'il a choisi l'anonymat ;</li>
        <li>les commentaires, avec le nom de leur auteur.</li>
      </ul>
    ),
  },
  {
    id: 'destinataires',
    titre: 'Destinataires et prestataires',
    contenu: (
      <>
        <p>Les données sont accessibles à l'équipe SoliFund dans la limite de ses missions, et transmises à :</p>
        <ul>
          <li>notre prestataire de paiement et les opérateurs Mobile Money (MTN, Orange), pour les paiements ;</li>
          <li>Brevo, pour l'envoi des emails (codes de vérification et de réinitialisation) ;</li>
          <li>notre hébergeur [nom et pays d'hébergement à compléter].</li>
        </ul>
        <p>[Transferts hors du Cameroun éventuels et garanties associées à préciser.]</p>
      </>
    ),
  },
  {
    id: 'conservation',
    titre: 'Durée de conservation',
    contenu: (
      <p>
        Les données du compte sont conservées tant que le compte est actif. L'historique des dons, des paiements et des
        retraits est conservé pendant la durée imposée par les obligations comptables et légales. [Durées précises à
        fixer.]
      </p>
    ),
  },
  {
    id: 'stockage',
    titre: 'Stockage dans votre navigateur',
    contenu: (
      <p>
        SoliFund n'utilise pas de cookies publicitaires ni d'outil de mesure d'audience. Lorsque vous vous connectez,
        votre jeton de connexion (valable 24 heures) et les informations de votre profil sont enregistrés dans le
        stockage local de votre navigateur ; ils sont effacés à la déconnexion.
      </p>
    ),
  },
  {
    id: 'securite',
    titre: 'Sécurité',
    contenu: (
      <p>
        Les mots de passe et les codes de vérification sont chiffrés, les échanges avec le site sont protégés, et
        l'accès aux fonctions d'administration est réservé. Changer votre mot de passe déconnecte vos autres appareils.
      </p>
    ),
  },
  {
    id: 'droits',
    titre: 'Vos droits',
    contenu: (
      <>
        <p>
          Vous pouvez accéder à vos données, les rectifier (depuis la page « Mon profil » pour le nom, le prénom et le
          téléphone), demander leur suppression ou vous opposer à certains traitements, dans les limites prévues par la
          loi.
        </p>
        <p>
          Pour exercer ces droits, écrivez-nous à l'adresse indiquée ci-dessous. [Délai de réponse à préciser.]
        </p>
      </>
    ),
  },
  {
    id: 'contact',
    titre: 'Contact',
    contenu: (
      <p>
        Pour toute question sur vos données : [adresse email de contact à compléter]. Voir aussi les{' '}
        <Link to="/conditions" className={lien}>conditions d'utilisation</Link>.
      </p>
    ),
  },
];

export default function Confidentialite() {
  return (
    <PageLegale
      titre="Politique de confidentialité"
      introduction="Cette page explique quelles données SoliFund collecte, pourquoi, avec qui elles sont partagées et comment exercer vos droits."
      miseAJour="29 septembre 2026"
      sections={sections}
    />
  );
}
