-- =========================================================
-- SOLIFUND - Schema PostgreSQL corrige
-- =========================================================

-- creation de la table role
CREATE TABLE slf_role (
    id_role SERIAL PRIMARY KEY,
    nom VARCHAR(30) NOT NULL UNIQUE CHECK (nom IN ('ROLE_USER', 'ROLE_ADMIN'))
);

-- creation de la table utilisateur
CREATE TABLE slf_utilisateur (
    id_utilisateur SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    mot_de_passe VARCHAR(255) NOT NULL,
    telephone VARCHAR(20) UNIQUE,
    photo_profil VARCHAR(255),
    date_inscription TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    est_verifie BOOLEAN NOT NULL DEFAULT FALSE,
    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIF' CHECK (statut IN ('ACTIF', 'SUSPENDU', 'BANNI', 'INACTIF')),
    date_fin_suspension TIMESTAMP
);

-- creation de la table posseder (utilisateur <-> role)
CREATE TABLE slf_posseder (
    id_utilisateur INT NOT NULL REFERENCES slf_utilisateur(id_utilisateur) ON DELETE CASCADE,
    id_role INT NOT NULL REFERENCES slf_role(id_role) ON DELETE CASCADE,
    PRIMARY KEY (id_utilisateur, id_role)
);

-- creation de la table jeton (verification email / reset mdp)
CREATE TABLE slf_jeton (
    id_jeton SERIAL PRIMARY KEY,
    id_utilisateur INT NOT NULL REFERENCES slf_utilisateur(id_utilisateur) ON DELETE CASCADE,
    code VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('VERIF_EMAIL', 'RESET_MDP')),
    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_expiration TIMESTAMP NOT NULL,
    est_utilise BOOLEAN NOT NULL DEFAULT FALSE
);

-- creation de la table categorie
CREATE TABLE slf_categorie (
    id_categorie SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icone VARCHAR(255),
    couleur VARCHAR(50)
);

-- creation de la table cagnotte
CREATE TABLE slf_cagnotte (
    id_cagnotte SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    objectif DECIMAL(15,2) NOT NULL CHECK (objectif > 0),
    montant_collecte DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (statut IN ('ACTIVE', 'TERMINEE', 'SUSPENDUE', 'ANNULEE')),
    est_publique BOOLEAN NOT NULL DEFAULT TRUE,
    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP,
    devise VARCHAR(10) NOT NULL DEFAULT 'XAF',
    image VARCHAR(255),
    id_utilisateur INT NOT NULL REFERENCES slf_utilisateur(id_utilisateur) ON DELETE RESTRICT,
    id_categorie INT REFERENCES slf_categorie(id_categorie) ON DELETE SET NULL,
    CONSTRAINT chk_dates_cagnotte CHECK (date_fin > date_debut)
);

-- trigger pour maintenir date_modification a jour automatiquement
CREATE OR REPLACE FUNCTION slf_maj_date_modification()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_modification = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cagnotte_date_modification
    BEFORE UPDATE ON slf_cagnotte
    FOR EACH ROW
    EXECUTE FUNCTION slf_maj_date_modification();

-- creation de la table paiement
CREATE TABLE slf_paiement (
    id_paiement SERIAL PRIMARY KEY,
    montant DECIMAL(15,2) NOT NULL CHECK (montant > 0),
    devise VARCHAR(10) NOT NULL DEFAULT 'XAF',
    methode_paiement VARCHAR(30) NOT NULL CHECK (methode_paiement IN ('MTN_MOBILE_MONEY', 'ORANGE_MONEY')),
    transaction_id VARCHAR(255) UNIQUE,
    reference_externe VARCHAR(255),
    statut VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE' CHECK (statut IN ('EN_ATTENTE', 'VALIDE', 'ECHOUE', 'REMBOURSE')),
    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_maj TIMESTAMP,
    numero_payeur VARCHAR(20),
    id_utilisateur INT NOT NULL REFERENCES slf_utilisateur(id_utilisateur) ON DELETE RESTRICT
);

-- creation de la table don
CREATE TABLE slf_don (
    id_don SERIAL PRIMARY KEY,
    id_cagnotte INT NOT NULL REFERENCES slf_cagnotte(id_cagnotte) ON DELETE RESTRICT,
    id_utilisateur INT REFERENCES slf_utilisateur(id_utilisateur) ON DELETE SET NULL,
    id_paiement INT NOT NULL UNIQUE REFERENCES slf_paiement(id_paiement) ON DELETE RESTRICT,
    message TEXT,
    est_anonyme BOOLEAN NOT NULL DEFAULT FALSE,
    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    statut VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE' CHECK (statut IN ('EN_ATTENTE', 'VALIDE', 'ECHOUE', 'REMBOURSE'))
);

-- creation de la table commentaire
CREATE TABLE slf_commentaire (
    id_commentaire SERIAL PRIMARY KEY,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_utilisateur INT NOT NULL REFERENCES slf_utilisateur(id_utilisateur) ON DELETE CASCADE,
    id_cagnotte INT NOT NULL REFERENCES slf_cagnotte(id_cagnotte) ON DELETE CASCADE,
    description TEXT NOT NULL
);

-- =========================================================
-- creation de la table retrait
-- (creee AVANT transaction pour casser la dependance circulaire
--  retrait <-> transaction : le FK vers transaction reste nullable)
-- =========================================================
CREATE TABLE slf_retrait (
    id_retrait SERIAL PRIMARY KEY,
    id_utilisateur INT NOT NULL REFERENCES slf_utilisateur(id_utilisateur) ON DELETE RESTRICT,
    id_cagnotte INT NOT NULL REFERENCES slf_cagnotte(id_cagnotte) ON DELETE RESTRICT,
    montant DECIMAL(15,2) NOT NULL CHECK (montant > 0),
    numero_beneficiaire VARCHAR(20),
    reference_retrait VARCHAR(255) UNIQUE,
    motif_rejet TEXT,
    statut VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE' CHECK (statut IN ('EN_ATTENTE', 'APPROUVE', 'REJETE', 'TRAITE')),
    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_traitement TIMESTAMP,
    date_validation TIMESTAMP
);

-- =========================================================
-- creation de la table transaction (journal des mouvements financiers)
-- CORRECTIF : id_paiement devient nullable, ajout de id_retrait.
-- Un DON/REMBOURSEMENT est lie a un paiement ; un RETRAIT est lie a un retrait.
-- =========================================================
CREATE TABLE slf_transaction (
    id_transaction SERIAL PRIMARY KEY,
    id_paiement INT REFERENCES slf_paiement(id_paiement),
    id_retrait INT REFERENCES slf_retrait(id_retrait),
    type VARCHAR(20) NOT NULL CHECK (type IN ('DON', 'RETRAIT', 'REMBOURSEMENT')),
    montant DECIMAL(15,2) NOT NULL CHECK (montant > 0),
    devise VARCHAR(10) NOT NULL DEFAULT 'XAF',
    reference VARCHAR(255) UNIQUE,
    statut VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE' CHECK (statut IN ('EN_ATTENTE', 'SUCCES', 'ECHEC')),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_transaction_source CHECK (
        (type IN ('DON', 'REMBOURSEMENT') AND id_paiement IS NOT NULL AND id_retrait IS NULL)
        OR
        (type = 'RETRAIT' AND id_retrait IS NOT NULL AND id_paiement IS NULL)
    )
);

-- on referme la boucle : le retrait peut maintenant pointer vers sa transaction
ALTER TABLE slf_retrait
    ADD COLUMN id_transaction INT REFERENCES slf_transaction(id_transaction) ON DELETE SET NULL;

-- creation de la table notification
-- CORRECTIF : ajout d'un lien vers la cagnotte concernee pour permettre le deep-link
CREATE TABLE slf_notification (
    id_notification SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('DON', 'RETRAIT', 'COMMENTAIRE', 'SYSTEME', 'VERIFICATION')),
    id_cagnotte INT REFERENCES slf_cagnotte(id_cagnotte) ON DELETE SET NULL,
    date_envoi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- creation de la table recevoir
CREATE TABLE slf_recevoir (
    id_utilisateur INT NOT NULL REFERENCES slf_utilisateur(id_utilisateur) ON DELETE CASCADE,
    id_notification INT NOT NULL REFERENCES slf_notification(id_notification) ON DELETE CASCADE,
    statut VARCHAR(20) NOT NULL DEFAULT 'NON_LUE' CHECK (statut IN ('NON_LUE', 'LUE')),
    date_lecture TIMESTAMP,
    PRIMARY KEY (id_utilisateur, id_notification)
);

-- creation de la table actualite
CREATE TABLE slf_actualite (
    id_actualite SERIAL PRIMARY KEY,
    id_cagnotte INT NOT NULL REFERENCES slf_cagnotte(id_cagnotte) ON DELETE CASCADE,
    titre VARCHAR(255) NOT NULL,
    contenu TEXT NOT NULL,
    date_publication TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- INDEX
-- =========================================================
CREATE INDEX idx_utilisateur_email ON slf_utilisateur(email);
CREATE INDEX idx_utilisateur_statut ON slf_utilisateur(statut);

CREATE INDEX idx_cagnotte_utilisateur ON slf_cagnotte(id_utilisateur);
CREATE INDEX idx_cagnotte_statut ON slf_cagnotte(statut);
CREATE INDEX idx_cagnotte_categorie ON slf_cagnotte(id_categorie);
CREATE INDEX idx_cagnotte_date_fin ON slf_cagnotte(date_fin);
CREATE INDEX idx_cagnotte_slug ON slf_cagnotte(slug);

CREATE INDEX idx_paiement_statut ON slf_paiement(statut);
CREATE INDEX idx_paiement_utilisateur ON slf_paiement(id_utilisateur);

CREATE INDEX idx_don_cagnotte ON slf_don(id_cagnotte);
CREATE INDEX idx_don_utilisateur ON slf_don(id_utilisateur);

CREATE INDEX idx_commentaire_cagnotte ON slf_commentaire(id_cagnotte);
CREATE INDEX idx_commentaire_utilisateur ON slf_commentaire(id_utilisateur);

CREATE INDEX idx_transaction_reference ON slf_transaction(reference);
CREATE INDEX idx_transaction_paiement ON slf_transaction(id_paiement);
CREATE INDEX idx_transaction_retrait ON slf_transaction(id_retrait);

CREATE INDEX idx_notification_type ON slf_notification(type);
CREATE INDEX idx_notification_cagnotte ON slf_notification(id_cagnotte);
CREATE INDEX idx_recevoir_utilisateur ON slf_recevoir(id_utilisateur);
CREATE INDEX idx_recevoir_statut ON slf_recevoir(statut);

CREATE INDEX idx_retrait_utilisateur ON slf_retrait(id_utilisateur);
CREATE INDEX idx_retrait_cagnotte ON slf_retrait(id_cagnotte);

CREATE INDEX idx_actualite_cagnotte ON slf_actualite(id_cagnotte);
