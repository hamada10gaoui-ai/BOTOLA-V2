-- =============================================================================
-- BASE DE DONNÉES : PLATFORME DE GESTION ET DIFFUSION DE CHAMPIONNATS DE FOOTBALL
-- SGBD : MySQL / MariaDB (Relationnel)
-- Auteur : Hamada (Capitaine Hamada)
-- Projet de Fin d'Études - ISSATS
-- =============================================================================

-- Création de la base de données si elle n'existe pas
CREATE DATABASE IF NOT EXISTS football_tournament_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE football_tournament_db;

-- Désactivation temporaire des contraintes de clé étrangère pour une recréation propre
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS match_events;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS referees;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS tournaments;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 1. Table : USERS (Utilisateurs & Administrateurs)
-- =============================================================================
CREATE TABLE users (
    id VARCHAR(100) PRIMARY KEY,                         -- Identifiant unique de l'utilisateur (ex: Firebase UID ou UUID)
    name VARCHAR(100) NOT NULL,                          -- Nom complet de l'utilisateur
    email VARCHAR(150) UNIQUE NOT NULL,                  -- Adresse e-mail
    role ENUM('organizer', 'spectator') NOT NULL DEFAULT 'spectator', -- Rôle de l'utilisateur
    favorite_team_id VARCHAR(50) NULL,                   -- Club favori (Clé étrangère optionnelle)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =============================================================================
-- 2. Table : TOURNAMENTS (Compétitions)
-- =============================================================================
CREATE TABLE tournaments (
    id VARCHAR(50) PRIMARY KEY,                          -- Code unique du tournoi (ex: PIN ou UUID)
    name VARCHAR(150) NOT NULL,                          -- Nom du championnat (ex: "Ligue Universitaire ISSATS")
    organizer_name VARCHAR(100) NOT NULL,                -- Nom de l'organisateur principal
    owner_id VARCHAR(100) NOT NULL,                      -- Propriétaire du tournoi (Clé étrangère vers users.id)
    draw_type ENUM('league', 'knockout', 'double_elimination') NOT NULL DEFAULT 'league', -- Type de formule
    pin_code VARCHAR(4) NOT NULL,                         -- Code PIN de sécurité à 4 chiffres pour modification
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tournament_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- 3. Table : TEAMS (Équipes / Clubs engagés)
-- =============================================================================
CREATE TABLE teams (
    id VARCHAR(50) PRIMARY KEY,                          -- Identifiant unique de l'équipe
    tournament_id VARCHAR(50) NOT NULL,                  -- Référence de la compétition associée
    name VARCHAR(100) NOT NULL,                          -- Nom de l'équipe (ex: "Real Madrid", "ISSATS FC")
    logo_url VARCHAR(255) NULL,                          -- Lien URL vers le logo vectoriel
    color VARCHAR(30) DEFAULT '#3b82f6',                 -- Code couleur hexa distinctif (ex: #3b82f6)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_team_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Ajout de la clé étrangère du club favori dans la table users après création de teams
ALTER TABLE users ADD CONSTRAINT fk_user_favorite_team FOREIGN KEY (favorite_team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- =============================================================================
-- 4. Table : PLAYERS (Athlètes / Effectifs des Clubs)
-- =============================================================================
CREATE TABLE players (
    id VARCHAR(50) PRIMARY KEY,                          -- Identifiant unique du joueur
    team_id VARCHAR(50) NOT NULL,                        -- Référence de l'équipe d'appartenance
    name VARCHAR(100) NOT NULL,                          -- Nom de l'athlète
    number INT NULL,                                     -- Numéro de maillot (dossard)
    goals INT NOT NULL DEFAULT 0,                        -- Nombre cumulé de buts inscrits
    assists INT NOT NULL DEFAULT 0,                      -- Nombre cumulé de passes décisives
    yellow_cards INT NOT NULL DEFAULT 0,                 -- Cumul de cartons jaunes
    red_cards INT NOT NULL DEFAULT 0,                    -- Cumul de cartons rouges
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_player_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- 5. Table : REFEREES (Arbitres Officiels)
-- =============================================================================
CREATE TABLE referees (
    id VARCHAR(50) PRIMARY KEY,                          -- Identifiant unique de l'arbitre
    tournament_id VARCHAR(50) NOT NULL,                  -- Référence du tournoi de rattachement
    name VARCHAR(100) NOT NULL,                          -- Nom de l'arbitre
    phone VARCHAR(30) NULL,                              -- Numéro de téléphone pour la logistique
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_referee_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- 6. Table : MATCHES (Calendrier des Rencontres)
-- =============================================================================
CREATE TABLE matches (
    id VARCHAR(50) PRIMARY KEY,                          -- Identifiant de la rencontre
    tournament_id VARCHAR(50) NOT NULL,                  -- Référence du tournoi
    round INT NOT NULL,                                  -- Numéro du Round / Ronde / Journée
    home_team_id VARCHAR(50) NOT NULL,                   -- Club hôte (Domicile)
    away_team_id VARCHAR(50) NOT NULL,                   -- Club invité (Extérieur)
    home_score INT NOT NULL DEFAULT 0,                   -- Score buts Domicile
    away_score INT NOT NULL DEFAULT 0,                   -- Score buts Extérieur
    status ENUM('scheduled', 'live', 'completed') NOT NULL DEFAULT 'scheduled', -- Statut de la rencontre
    played_at DATETIME NULL,                             -- Heure et date programmée du coup d'envoi
    elapsed_time INT NOT NULL DEFAULT 0,                 -- Temps de jeu écoulé en minutes (chrono actif)
    referee_id VARCHAR(50) NULL,                         -- Arbitre assigné à la rencontre
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_match_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    CONSTRAINT fk_match_home_team FOREIGN KEY (home_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_match_away_team FOREIGN KEY (away_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_match_referee FOREIGN KEY (referee_id) REFERENCES referees(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================================
-- 7. Table : MATCH_EVENTS (Chronologie des faits de jeu saisis par l'arbitre)
-- =============================================================================
CREATE TABLE match_events (
    id VARCHAR(50) PRIMARY KEY,                          -- Identifiant unique de l'événement
    match_id VARCHAR(50) NOT NULL,                       -- Référence du match concerné
    type ENUM('goal', 'yellow_card', 'red_card', 'assist') NOT NULL, -- Nature du fait de jeu
    player_id VARCHAR(50) NOT NULL,                      -- Joueur principal concerné
    assist_player_id VARCHAR(50) NULL,                   -- Passeur décisif (Optionnel, uniquement pour buts)
    minute INT NOT NULL,                                 -- Minute d'apparition (ex: 45)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_assist FOREIGN KEY (assist_player_id) REFERENCES players(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================================
-- EXEMPLE DE REQUÊTES UTILES (Utile pour le rapport ou pour le jury)
-- =============================================================================

-- 1. Calculer le classement d'un championnat (Ligue) à la volée :
-- SELECT 
--     t.name AS equipe,
--     COUNT(m.id) AS matches_joues,
--     SUM(CASE 
--         WHEN (m.home_team_id = t.id AND m.home_score > m.away_score) OR (m.away_team_id = t.id AND m.away_score > m.home_score) THEN 3
--         WHEN m.status = 'completed' AND m.home_score = m.away_score THEN 1
--         ELSE 0 
--     END) AS points,
--     SUM(CASE WHEN m.home_team_id = t.id THEN m.home_score ELSE m.away_score END) AS buts_pour,
--     SUM(CASE WHEN m.home_team_id = t.id THEN m.away_score ELSE m.home_score END) AS buts_contre
-- FROM teams t
-- LEFT JOIN matches m ON (m.home_team_id = t.id OR m.away_team_id = t.id) AND m.status = 'completed'
-- WHERE t.tournament_id = 'COMP_ID_EXEMPLE'
-- GROUP BY t.id
-- ORDER BY points DESC, (buts_pour - buts_contre) DESC;
