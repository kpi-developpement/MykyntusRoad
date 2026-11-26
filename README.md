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
| `admin`       | `admin123`   | ADMIN : import principal, colonnes J-1 / J / J+1, utilisateurs (état final sécurisation en lecture) |
| `admin.secu`  | `secu1234`   | ADMIN_SECURISATION : fichiers sécurisation, colonnes, dispatch des pilotes sécurisation |
| `pilote.secu` | `pilote123`  | PILOTE_SECURISATION : section Sécurisation (jusqu'à « Etat final ») |
| `pilote.j`    | `pilote123`  | PILOTE_J : sections J-1 (Cellule plani…), J et J+1, prend ses dossiers lui-même |

Le rôle « Agent planification » n'existe plus : ses comptes deviennent des PILOTE_J au démarrage.

Comptes de l'équipe : `backend/src/main/resources/seed/accounts.csv` (identifiant;nom;rôle;hash BCrypt;compte remplacé),
créés au démarrage s'ils n'existent pas. Un compte existant n'est jamais écrasé (sauf s'il a encore un ancien mot de
passe par défaut public). Les identifiants / mots de passe en clair sont dans `comptes/` (ignoré par git, à ne jamais commiter).

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
  s'affichent en puces au-dessus du tableau. Ordre, colonnes masquées et densité mémorisés par compte.

### Sécurisation

- L'admin sécurisation importe **3 fichiers** (`/securisation/imports`). Chaque ligne est rattachée à son dossier
  par l'identifiant (`Ordre de travail: ID Externe`, `EPS`… ou une colonne dont les valeurs ressemblent à `EPS-0022050200`).
  Les colonnes de chaque fichier sont stockées à part (`S1::`, `S2::`, `S3::`) et il choisit celles qui sont affichées.
- Colonnes de travail des pilotes : **Date de traitement** (= date d'import du fichier, automatique, non modifiable),
  Commentaire de traitement, **Etat final**. La sécurisation s'arrête là : rien de J-1.
- Une colonne « Visible dans le suivi » (ex : Etat final) apparaît en lecture seule pour l'admin et les pilotes J.
- **Alerte J-1** : la veille du rendez-vous (et le jour même), un dossier dont l'« Etat final » est vide est déclaré
  « pas encore sécurisé » : bouclier sur l'EPS, bandeau avec le nombre et un filtre en un clic (`secu=J_MINUS_1,J`).
- Le dispatch sécurisation reste (admin sécurisation) ; un pilote peut aussi rejoindre le dossier d'un collègue.

### J-1 (Cellule plani)

- Chaque dossier injecté arrive avec **Cellule plani = « Planifié »** : tout est visible par tout le monde dès l'import.
- Les colonnes J-1 conditionnelles (Commentaire, Mail / Teams, Mail et leurs « Objet ») n'apparaissent que lorsqu'au
  moins un dossier passe à **« Ouvert »**, et ne sont saisissables que sur ces dossiers. Saisie : admin et pilotes J.
- Dans « Colonnes & valeurs » (admin, onglet J-1), l'interrupteur « Seulement si Cellule plani « Ouvert » » rend une
  colonne conditionnelle.

### Colonne « Pilote » (prendre / rejoindre)

- Plus de dispatch côté admin : un pilote clique sur « Prendre », confirme, et son nom s'affiche. D'autres pilotes
  peuvent **rejoindre** le même dossier : la fenêtre de confirmation montre qui est déjà dessus. On peut aussi le quitter.
- Un pilote ne modifie que les dossiers sur lesquels il travaille ; les autres restent visibles en lecture seule.
- Chaque prise / arrivée / départ et chaque saisie est enregistré dans le **cycle de vie** (section « Intervenants » :
  qui est sur le dossier, ses actions, la dernière).
- API : `GET|POST|DELETE /api/dossiers/{id}/workers/{SECURISATION|J}`.

### Drapeaux et colonnes

- Les drapeaux sont collés à l'ID Externe (même cellule, colonne figée) : ils restent toujours à côté de l'EPS.
- « Colonnes » : chaque profil choisit l'**ordre** (glisser-déposer, flèches, Alt + ↑ ↓) et les colonnes affichées.
  C'est enregistré sur le compte (`/api/me/preferences/grid.<tableau>`), donc identique sur tous les postes.

### Cycle de vie d'un dossier

- Chaque création / modification par un import et chaque saisie (ancienne → nouvelle valeur, auteur, date) est historisée.
- Survoler un ID Externe **3 secondes** : road map (étape atteinte, événements, modifications).
  Cliquer : panneau complet (étapes Import → Sécurisation → J-1 → J → J+1, intervenants, historique).
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
