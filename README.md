# Planning hebdomadaire — CO-P1

Application de gestion des plannings hebdomadaires de l'association : une semaine = une grille
(Lundi → Dimanche), un ou plusieurs **créneaux** par jour (horaires, lieu de départ, véhicule,
intitulé du trajet), des **référents** (comptes) et des **bénévoles** affectés à chaque créneau.
Les bénévoles s'inscrivent seuls via un **lien public** (nom + téléphone), sans compte.
Export **PDF** (impression navigateur), **archivage** des semaines passées, **historique** des
modifications, alerte en cas de **conflit de véhicule**, dates calées sur l'heure de **Paris**.

Même association que l'appli de gestion de stock → même charte (logo, couleurs, polices).

**Stack** : React + Vite (frontend) + Supabase (Postgres, authentification, API, Edge Functions).

---

## Où sont stockées les données ?

- **Les données** (semaines, créneaux, affectations, historique) vivent uniquement dans la base
  Postgres hébergée par **Supabase**, dans le cloud. Rien n'est stocké sur un PC particulier.
- **Le code source** (ce dossier) n'existe que sur la machine où il a été créé tant qu'il n'est
  pas poussé sur GitHub.
- Le fichier **`.env`** reste local (il est dans `.gitignore`). L'appli déployée utilise ses
  propres variables d'environnement (Vercel).

---

## 1. Créer le projet Supabase

1. Sur [supabase.com](https://supabase.com) : compte gratuit → **New project** (nom, mot de passe
   de base à garder, région proche des utilisateurs — ex. `eu-west-3` / Paris).
2. **SQL Editor** → **New query** → colle tout [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   Ça crée les tables (`profiles`, `plannings`, `activites`, `affectations`, `historique`),
   les règles de sécurité (RLS), les triggers d'historique et les fonctions publiques
   (`planning_public`, `inscrire_benevole`, `desinscrire_benevole`, `dupliquer_planning`,
   `archiver_semaines_ecoulees`).
   > Ce fichier est **ré-exécutable sans risque** : le recoller après une mise à jour n'ajoute
   > que ce qui manque, sans toucher aux données.
3. **Project Settings → API** : note l'**URL** du projet et la clé **anon public**.

---

## 2. Lancer l'appli en local

```bash
npm install
cp .env.example .env
```

Édite `.env` avec les valeurs de l'étape 1 :

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Puis :

```bash
npm run dev
```

L'appli tourne sur http://localhost:5174.

---

## 3. Comptes : créer le premier admin, puis fermer les inscriptions

Les **seuls comptes** sont les gestionnaires du planning (une petite équipe). Deux rôles :

| Rôle | Pouvoirs |
|---|---|
| **Admin** | Tout : créer/éditer/archiver les plannings, **gérer les comptes** (nom, prénom, email, rôle, mot de passe, suppression), **supprimer définitivement** une semaine. |
| **Gestionnaire** | Créer, éditer, archiver les plannings ; gérer les créneaux et les affectations. Ne gère pas les comptes, ne supprime pas définitivement une semaine. |

### Bootstrap du premier admin

1. Va sur **http://localhost:5174/inscription** (page volontairement non reliée au menu) et crée
   ton compte.
2. Dans Supabase → **SQL Editor** :
   ```sql
   update public.profiles set role = 'admin' where email = 'ton.email@exemple.fr';
   ```
3. **Ferme les inscriptions publiques** : Supabase → **Authentication → Sign In / Providers**
   → décoche **« Allow new users to sign up »**.
   À partir de là, plus personne ne peut créer de compte de l'extérieur ; les comptes se créent
   uniquement depuis la page **Utilisateurs** de l'appli (bouton « + Nouveau compte »).

> La page Utilisateurs et la création de comptes s'appuient sur des **Edge Functions**
> (`admin-create-user`, `admin-set-password`, `admin-update-email`, `delete-user`) : voir étape 5.
> Tant qu'elles ne sont pas déployées, tu peux gérer les comptes directement dans le dashboard
> Supabase (Authentication → Users, table `profiles`).

---

## 4. Le lien public (bénévoles)

Depuis une semaine ouverte → bouton **« 🔗 Lien public »**. La fenêtre propose deux liens :

- **Lien permanent** `…/semaine` (+ QR code) : montre **toujours la semaine en cours** et se met
  à jour tout seul chaque lundi. C'est celui à partager une fois pour toutes / à afficher.
- **Lien de cette semaine précise** `…/p/<code>` (code court de 6 caractères) : utile pour
  diffuser une semaine à l'avance.

La page publique a la **même présentation** que la version gestion (mêmes blocs colorés). Sans
compte, un bénévole peut :

- consulter la semaine en **vue liste** (jour par jour, par défaut sur mobile) ou **vue grille**
  — bascule **« ☰ Liste / ▦ Grille »** ;
- **toucher un créneau** pour ouvrir sa fiche détaillée (départ + adresse, destination,
  véhicule, référents/bénévoles avec téléphones, places libres, notes) ;
- **« + M'inscrire »** (sur le créneau ou dans sa fiche) s'il reste des places : **nom** +
  **téléphone** (recommandé) ;
- se **retirer** d'un créneau où il s'est inscrit depuis ce navigateur.

La page publique **ne s'exporte pas** (l'export PDF est réservé à la version gestion).

Le bouton **« 🔒 Verrouiller »** coupe toutes les inscriptions publiques (le planning reste
consultable). Une semaine archivée est également en lecture seule côté public.

---

## 5. Lieux, couleurs et export

### Lieux enregistrés — onglet **Lieux**

Une liste partagée de lieux, chacun avec une **adresse** et une **couleur**. À la saisie d'un
créneau, les champs *Trajet* et *Lieu de départ* proposent ces noms en autocomplétion ; si le
nom correspond exactement à un lieu enregistré, son adresse s'affiche sous le champ.

La **couleur du bloc** d'un créneau dans la grille (et à l'impression) est celle du lieu de
**destination (trajet)** s'il correspond à un lieu enregistré, sinon celle du **lieu de départ**,
sinon gris. La correspondance est exacte (casse et espaces ignorés) — enregistrez donc chaque
lieu précis (« BAPIF Arcueil », « BAPIF Saclay »…). Le script SQL pré-remplit quelques lieux
d'exemple ; complétez leurs adresses depuis l'onglet Lieux.

### Grille et export PDF — « semainier »

La semaine s'affiche en **grille horaire** (colonnes = jours, lignes = heures) : chaque créneau
est un bloc coloré positionné selon ses horaires ; les créneaux qui se chevauchent le même jour
se mettent côte à côte ; ceux dont l'horaire n'est pas interprétable vont dans une bande
« heure ? » en haut de la colonne. Un bloc montre l'**intitulé**, les **horaires**, les
**référents**, les **bénévoles** et les **notes** (le détail complet est dans l'infobulle au
survol) ; **cliquer un bloc ouvre son éditeur**. Le bouton **« + Créneau »** est en **haut** de
chaque colonne.

Le bouton **« Colonnes − / + »** (en haut) élargit ou resserre les colonnes-jours ; le choix
est mémorisé dans le navigateur. Côté **public**, une bascule **« ☰ Liste / ▦ Grille »** permet
de passer en vue liste jour par jour (choisie par défaut sur mobile).

Le bouton **« 🖨 Exporter en PDF »** télécharge directement un **PDF vectoriel A4 paysage** :
en-tête avec le **logo de l'asso**, l'intitulé « Semaine du … » (+ le surnom), un filet aux
couleurs de l'appli, puis le semainier coloré. **Même format pour toutes les semaines**
(individuel comme export groupé des archives) ; le **QR code du lien public** n'y figure que
pour les semaines **actives**.

### Semaine archivée = lecture seule

Une semaine **archivée** n'est plus modifiable : pas de « + Créneau », les blocs ne s'éditent
plus, « Verrouiller » et « ✎ surnom » disparaissent. Restent : export PDF, lien public,
**« ↩ Réactiver »** (pour repasser en modifiable) et, pour les admins, la suppression.

### Surnom de la semaine

Le bouton **« ✎ surnom »** à côté du titre permet d'ajouter un **surnom** à la semaine
(« Semaine de la rentrée »…). Il s'affiche **en plus** des dates, partout (liste, en-tête,
lien public, PDF) — il ne les remplace pas. Le champ vide enlève le surnom.

### Archives — export groupé

Dans l'onglet **Archives**, coche une ou plusieurs semaines puis **« ⬇ Exporter la
sélection »** : ça génère **un PDF par semaine** (même semainier A4 paysage que l'export
individuel, sans QR code), regroupés dans un fichier **`.zip`** dès qu'il y en a deux (une
seule semaine → PDF direct).

### Référents obligatoires

À la création d'un créneau, **au moins un référent** doit être renseigné (nom ; téléphone et
lien vers un compte facultatifs). Les bénévoles se gèrent ensuite depuis l'éditeur du créneau
(**« 👥 Gérer les bénévoles »**) ou via le lien public. L'éditeur porte aussi le bouton
**« 🗑 Supprimer le créneau »**.

> **Suppression / duplication d'une semaine qui ne marche pas** :
> 1. **SQL Editor** → recolle **tout** [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
>    La version à jour corrige trois choses : le trigger d'historique (échec de la
>    **suppression** avec `historique_planning_id_fkey`), la génération du code de lien qui
>    dépendait de l'extension `pgcrypto` (`gen_random_bytes does not exist` à la
>    **duplication**), et le rechargement du cache de l'API (`notify pgrst, 'reload schema'`).
>    Rien n'est effacé.
> 2. Ton compte doit être `admin` pour supprimer :
>    `update public.profiles set role = 'admin' where email = 'ton.email@exemple.fr';`
> 3. Si ça échoue encore, note le **message d'erreur exact** affiché et transmets-le.

---

## 6. Déployer

### a. Pousser sur GitHub

Crée d'abord un dépôt **vide** sur github.com, puis :

```bash
cd "Gestion Planning cop1"
git remote add origin https://github.com/<toi>/<depot>.git
git push -u origin main
```

(Le dépôt est déjà initialisé, branche `main`, premier commit fait. Le `.env` n'est **pas**
poussé — il est dans `.gitignore`.)

### b. Frontend sur Vercel

1. Vercel → **Add New → Project** → importe le dépôt GitHub. Framework détecté : **Vite**
   (build `npm run build`, sortie `dist` — laisse les valeurs par défaut).
2. **Environment Variables** : ajoute **`VITE_SUPABASE_URL`** et **`VITE_SUPABASE_ANON_KEY`**
   (Supabase → Project Settings → API) pour l'environnement *Production*. Vite les intègre **au
   moment du build**.
3. **Deploy**.
4. Dans Supabase → **Authentication → URL Configuration** : mets l'URL Vercel dans **Site URL**
   et ajoute-la aux **Redirect URLs** (pour les liens « mot de passe oublié »).

> Le fichier [`vercel.json`](vercel.json) contient la réécriture SPA (`/(.*) → /index.html`) :
> indispensable pour que `/planning/...`, `/p/<code>` et `/semaine` fonctionnent en accès
> direct (un bénévole qui ouvre le lien public, un partage, un rafraîchissement de page).

### c. Edge Functions (gestion des comptes)

Avec le [CLI Supabase](https://supabase.com/docs/guides/cli) :

```bash
supabase login
supabase link --project-ref <ref-du-projet>
supabase functions deploy admin-create-user admin-set-password admin-update-email delete-user
```

Les fonctions utilisent `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
(injectées automatiquement par Supabase). Chacune vérifie que l'appelant est **admin**.

> Tant que les Edge Functions ne sont pas déployées, la page **Utilisateurs** ne peut pas
> créer/modifier de comptes — gère-les directement dans le dashboard Supabase
> (Authentication → Users, table `profiles`).

### Archivage automatique (optionnel)

Les semaines passées sont archivées au chargement de la liste (appel best-effort à
`archiver_semaines_ecoulees()`). Pour un archivage garanti même sans visite, active `pg_cron`
dans Supabase et décommente le bloc correspondant en bas de `supabase/schema.sql`.

---

## Structure

```
src/
  lib/            dates, véhicules, horaires, conflits, couleurs, lieux, semainier (calcul de
                  disposition), exportPdf (PDF vectoriel + zip), lien public
  auth/           contexte d'authentification Supabase
  components/     Semainier (grille heures × jours), bloc de créneau, éditeurs, modales
  pages/          connexion, semaines, semaine, archives (+ export groupé), lieux,
                  page publique, utilisateurs
supabase/
  schema.sql      tables (profils, plannings, activités, affectations, historique, lieux)
                  + RLS + triggers + fonctions RPC
  functions/      Edge Functions de gestion des comptes (service_role)
docs/             document « Fonctionnement de l'appli » (source LaTeX + PDF + HTML)
```

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement (http://localhost:5174) |
| `npm run build` | Vérification TypeScript + build de production (`dist/`) |
| `npm run lint` | oxlint |
| `npm run preview` | Sert le build de production localement |
