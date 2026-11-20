# MyKyntus

Import de fichiers Excel (colonnes dynamiques) + suivi des dossiers J-1 / J / J+1.

- **backend/** : Spring Boot 4.1 (Java 21), PostgreSQL, JWT
- **frontend/** : Next.js 16 (App Router, TypeScript, Tailwind v4)

## Démarrage

### 1. Base PostgreSQL

```sql
CREATE DATABASE mykyntus;
```

Les tables sont créées automatiquement au démarrage (`ddl-auto: update`).

### 2. Backend (port 8334)

```powershell
cd backend
$env:DB_PASSWORD = "votre_mot_de_passe_postgres"
.\mvnw.cmd spring-boot:run
```

Variables disponibles : `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `SERVER_PORT`, `APP_JWT_SECRET`, `APP_CORS_ORIGINS`.

### 3. Frontend (port 3955)

```powershell
cd frontend
npm install
npm run dev
```

URL de l'API : `frontend/.env.local` (`NEXT_PUBLIC_API_URL=http://localhost:8334`).

## Déploiement Docker (serveur 10.10.10.25)

```bash
git clone <repo> mykyntus-suivi && cd mykyntus-suivi
cp .env.example .env        # optionnel : changer DB_PASSWORD et APP_JWT_SECRET
docker compose up -d --build   # ou docker-compose up -d --build (ancienne version 1.x)
```

| Service | Conteneur | Port serveur |
|---|---|---|
| PostgreSQL 17 (base `mykyntus_suivi`, créée automatiquement) | `mykyntus-suivi-db` | aucun (réseau Docker interne) |
| Backend Spring Boot | `mykyntus-suivi-backend` | 8334 |
| Frontend Next.js | `mykyntus-suivi-frontend` | 3955 → http://10.10.10.25:3955 |

La base, le schéma `mykyntus_suivi`, les tables et les comptes par défaut sont créés au démarrage : rien à préparer sur le serveur.
Pour utiliser un PostgreSQL existant (ex. `10.10.10.50`, base `pilotdb`), renseigner `DB_HOST`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` dans `.env`.
Tout est préfixé `mykyntus-suivi` (projet, conteneurs, réseau, volume) pour ne pas toucher à l'autre MyKyntus.
`PUBLIC_API_URL` est intégré au frontend au moment du build : après l'avoir changé, relancer `docker compose up -d --build`.
Le build du frontend télécharge les polices Google : le serveur doit avoir accès à Internet pendant le build.

En local, le mot de passe de la base est lu dans `backend/.env` (`DB_PASSWORD=...`, jamais commité).

## Comptes créés au premier démarrage (à changer !)

| Identifiant   | Mot de passe | Rôle                                        |
|---------------|--------------|---------------------------------------------|
| `admin`       | `admin123`   | ADMIN : import principal, colonnes J-1 / J / J+1, utilisateurs (sécurisation en lecture) |
| `admin.secu`  | `secu1234`   | ADMIN_SECURISATION : 3 fichiers sécurisation, colonnes affichées, valeurs sécurisation |
| `pilote.secu` | `pilote123`  | PILOTE_SECURISATION : sections Sécurisation et J-1 |
| `pilote.j`    | `pilote123`  | PILOTE_J : sections J et J+1 |

## Fonctionnement

- **Import** : n'importe quel `.xlsx/.xls`. Seule la colonne `Ordre de travail: ID Externe` est obligatoire
  (1 ligne = 1 dossier). Toute nouvelle colonne est enregistrée et affichée automatiquement.
- **Ré-import** : un dossier existant est mis à jour ; les valeurs saisies dans l'application sont conservées.
- **Date du dossier** : colonne `Date`, sinon `Début de la fenêtre d'arrivée`, sinon `Début planifié`,
  ou date forcée lors de l'import.
- **Colonnes de l'application** (Feuil2) : créées par défaut, chaque colonne est une liste déroulante
  dont l'admin gère les valeurs dans « Colonnes & valeurs » (peut aussi passer une colonne en texte libre).
- **Filtres par colonne** (côté serveur) : sur chaque colonne, liste des valeurs avec leur nombre,
  « (Vides) », recherche, filtre « contient », tri croissant / décroissant. Les filtres actifs
  s'affichent en puces au-dessus du tableau. Colonnes masquables et densité mémorisées par navigateur.

### Sécurisation

- L'admin sécurisation importe **3 fichiers** (`/securisation/imports`). Chaque ligne est rattachée à son dossier
  par l'identifiant (`Ordre de travail: ID Externe`, `EPS`… ou une colonne dont les valeurs ressemblent à `EPS-0022050200`).
  Les colonnes de chaque fichier sont stockées à part (`S1::`, `S2::`, `S3::`) et il choisit celles qui sont affichées.
- Colonnes de travail des pilotes : Date de traitement (date, remplie automatiquement), Pilote (rempli automatiquement
  avec la personne qui traite), Département, Commentaire de traitement, **Etat final**.
- Une colonne « Visible dans le suivi » (ex : Etat final) apparaît en lecture seule pour l'admin et les pilotes J.

### Cycle de vie d'un dossier

- Chaque création / modification par un import et chaque saisie (ancienne → nouvelle valeur, auteur, date) est historisée.
- Survoler un ID Externe **3 secondes** : road map (étape atteinte, événements, modifications).
  Cliquer : panneau complet (étapes Import → Sécurisation → J-1 → J → J+1, historique).
- `GET /api/dossiers/{id}/timeline`.

### Raccourcis

| Raccourci  | Action                                              |
|------------|-----------------------------------------------------|
| `Ctrl + K` | Palette : aller à une page, chercher un ID Externe |
| `Ctrl + B` | Réduire / agrandir la barre latérale                |
| `/`        | Aller dans la recherche du tableau                  |

### Design system (« 2080 »)

- Classes dans `frontend/src/app/globals.css` (`@layer components`) : `surface` / `surface-pop` (blanc + liseré
  dégradé), `spotlight` (lumière qui suit le curseur), `hud-corners`, `sheen` (reflet des boutons),
  `edge-beam`, `stripes`, `skeleton`, `app-canvas` (fond statique : halos + grille + grain).
- Composants : `Surface` (carte holo, options `spotlight`, `corners`, `interactive`), `RevealText`
  (mots révélés), `ScrambleText` (effet décodage), `ProgressRing`, `LiveDot`.
- Polices : Space Grotesk (titres, chiffres), Inter (texte), JetBrains Mono (libellés, IDs).
- Règles de performance : animations uniquement sur `transform` / `opacity`, aucun `filter: blur`
  ni `backdrop-filter`, halos en `radial-gradient`, repositionnement des popovers limité à 1 par frame,
  seules les 20 premières lignes du tableau sont animées, `prefers-reduced-motion` respecté.

### API du tableau

- `POST /api/dossiers/search` : `{ date, search, filters: [{ key, values, text }], sort: { key, direction }, page, size }`
- `POST /api/dossiers/facets` : `{ criteria, key, q }` → valeurs distinctes + nombre (filtre de la colonne ignoré)
- `POST /api/dossiers/stats` : total et dossiers traités par section
- Clés de colonnes : `date`, `idExterne`, `raw:<nom de colonne du fichier>`, `field:<id>`

## Structure

```
backend/src/main/java/com/mykyntus/
  config/       SecurityConfig, AppProperties, DataSeeder
  controller/   REST (auth, imports, dossiers, fields, source-columns, users)
  dto/          records request/response par domaine
  entity/       JPA (Dossier, AppField, FieldOption, DossierFieldValue, ...)
  exception/    ApiException + GlobalExceptionHandler
  mapper/       entity -> DTO
  repository/   Spring Data (+ repository/search : requêtes dynamiques filtres / facets / tri)
  security/     JWT, UserDetailsService
  service/      logique métier (+ service/excel : lecture des fichiers)
  util/

frontend/src/
  app/          routes uniquement (fichiers minces qui affichent une page)
  admin/        pages/<Page>/<Page>.tsx  +  components/<type>/<Composant>/<Composant>.tsx
  pilote/       pages/PilotePage
  login/        pages/LoginPage
  shared/       composants communs (button/Button1, input/Input1, select/Select1, card/Card1,
                table/DossierTable, ...), services API, contexte auth, types, hooks
```

## Tests

```powershell
cd backend
.\mvnw.cmd test
```

Test d'intégration (H2) : import → saisie → droits par rôle → ré-import.
