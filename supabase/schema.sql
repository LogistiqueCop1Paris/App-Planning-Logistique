-- =========================================================================
-- Schéma de la base pour l'appli de gestion de planning hebdomadaire (CO-P1).
-- À exécuter dans Supabase : Dashboard > SQL Editor > coller ce fichier > Run.
-- Ré-exécutable sans risque : ne recrée que ce qui manque, ne touche pas aux
-- données existantes.
-- =========================================================================

create extension if not exists pgcrypto;

-- =========================================================================
-- Profils (gestionnaires du planning). NOM / Prénom liés au compte Auth.
-- =========================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nom text not null,
  prenom text not null,
  email text,
  telephone text,
  role text not null default 'gestionnaire' check (role in ('admin', 'gestionnaire')),
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists telephone text;

-- Résout le rôle de l'utilisateur connecté ; utilisé par les policies RLS.
create or replace function public.role_utilisateur()
returns text
language sql
stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- « Prénom NOM » de l'utilisateur connecté (ou NULL si appel anonyme).
create or replace function public.nom_utilisateur_courant()
returns text
language sql
stable
security definer set search_path = public
as $$
  select trim(prenom || ' ' || nom) from public.profiles where id = auth.uid();
$$;

-- NOM en majuscules, Prénom avec 1re lettre en majuscule, toujours.
create or replace function public.format_nom_prenom()
returns trigger
language plpgsql
as $$
begin
  new.nom := upper(trim(new.nom));
  new.prenom := initcap(trim(new.prenom));
  return new;
end;
$$;

drop trigger if exists trg_format_nom_prenom on public.profiles;
create trigger trg_format_nom_prenom
  before insert or update on public.profiles
  for each row execute function public.format_nom_prenom();

-- Crée automatiquement le profil à l'inscription (métadonnées nom / prenom / telephone).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nom, prenom, email, telephone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nom', ''),
    coalesce(new.raw_user_meta_data ->> 'prenom', ''),
    new.email,
    nullif(new.raw_user_meta_data ->> 'telephone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Code court et lisible pour le lien public (6 caractères, alphabet sans i l o 0 1).
-- N'utilise que des fonctions du coeur PostgreSQL (pas d'extension pgcrypto,
-- qui n'est pas toujours dans le search_path sur Supabase → « gen_random_bytes
-- does not exist »).
create or replace function public.court_token(p_len int default 6)
returns text
language sql
volatile
as $$
  select string_agg(
    substr('abcdefghjkmnpqrstuvwxyz23456789', 1 + floor(random() * 30)::int, 1),
    ''
  )
  from generate_series(1, greatest(p_len, 1));
$$;

-- =========================================================================
-- Plannings (une ligne par semaine)
-- =========================================================================
create table if not exists public.plannings (
  id uuid primary key default gen_random_uuid(),
  semaine_debut date not null unique,               -- lundi (Europe/Paris)
  titre text,
  statut text not null default 'actif' check (statut in ('actif', 'archive')),
  token_public text not null unique default public.court_token(),
  verrouille boolean not null default false,        -- true = plus d'inscription publique
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

-- Migration : raccourcit les anciens tokens longs (24 caractères hex) en codes courts.
alter table public.plannings alter column token_public set default public.court_token();
update public.plannings set token_public = public.court_token()
  where length(token_public) > 10;

-- =========================================================================
-- Activités (créneaux)
-- =========================================================================
create table if not exists public.activites (
  id uuid primary key default gen_random_uuid(),
  planning_id uuid not null references public.plannings (id) on delete cascade,
  jour date not null,
  ordre int not null default 0,
  horaires text,
  lieu_depart text,
  vehicule text check (
    vehicule in ('Ducato (Manuel)', 'Jumpy (auto)', 'Europcar (auto)', 'Sans véhicule')
  ),
  intitule text,
  notes text,
  places_benevoles int not null default 2 check (places_benevoles between 0 and 20),
  created_at timestamptz not null default now()
);

create index if not exists idx_activites_planning on public.activites (planning_id);

-- =========================================================================
-- Lieux enregistrés (adresse + couleur réutilisées dans les créneaux)
-- =========================================================================
create table if not exists public.lieux (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  adresse text,
  couleur text not null default '#A99F8C',
  created_at timestamptz not null default now()
);

-- Migration : la couleur d'un lieu est désormais une couleur libre (hex) choisie dans un
-- sélecteur, plus une palette figée de 9 noms. On convertit d'abord les anciennes valeurs
-- nommées vers leur équivalent hex, puis on remplace la contrainte enum par une contrainte
-- de format hex (#RRGGBB).
update public.lieux set couleur = case couleur
  when 'orange' then '#E08A3C'
  when 'vert' then '#4E9E63'
  when 'bleu' then '#4C86C6'
  when 'rouge' then '#C9503E'
  when 'violet' then '#8A6BB8'
  when 'turquoise' then '#3FA69B'
  when 'jaune' then '#C9A93C'
  when 'rose' then '#C96EA0'
  when 'gris' then '#A99F8C'
  else couleur
end
where couleur !~ '^#[0-9A-Fa-f]{6}$';

alter table public.lieux drop constraint if exists lieux_couleur_check;
alter table public.lieux add constraint lieux_couleur_check check (couleur ~ '^#[0-9A-Fa-f]{6}$');
alter table public.lieux alter column couleur set default '#A99F8C';

-- Lieux vus dans l'Excel d'exemple, avec une couleur de départ (adresses à compléter
-- ensuite depuis la page Lieux). `on conflict do nothing` : ne réécrit jamais un lieu déjà là.
insert into public.lieux (nom, couleur) values
  ('Censier', '#A99F8C'),
  ('BAPIF Arcueil', '#E08A3C'),
  ('BAPIF Saclay', '#E08A3C'),
  ('BAPIF Cachan et Sceaux', '#E08A3C'),
  ('BAPIF St Denis', '#E08A3C'),
  ('BAPIF Paris', '#E08A3C'),
  ('Stock St-Ouen', '#4C86C6'),
  ('Rungis', '#4E9E63'),
  ('École Boulangerie', '#8A6BB8')
on conflict (nom) do nothing;

-- =========================================================================
-- Affectations (référents + bénévoles d'un créneau)
-- =========================================================================
create table if not exists public.affectations (
  id uuid primary key default gen_random_uuid(),
  activite_id uuid not null references public.activites (id) on delete cascade,
  role_perso text not null check (role_perso in ('referent', 'benevole')),
  profile_id uuid references public.profiles (id) on delete set null,
  nom text not null,
  telephone text,
  ordre int not null default 0,
  origine text not null default 'gestionnaire' check (origine in ('gestionnaire', 'public')),
  created_at timestamptz not null default now()
);

create index if not exists idx_affectations_activite on public.affectations (activite_id);

-- =========================================================================
-- Historique léger des modifications
-- =========================================================================
create table if not exists public.historique (
  id uuid primary key default gen_random_uuid(),
  planning_id uuid not null references public.plannings (id) on delete cascade,
  date_heure timestamptz not null default now(),
  utilisateur_nom text,
  action text not null,
  details text
);

create index if not exists idx_historique_planning on public.historique (planning_id, date_heure desc);

-- ---------- Traçage automatique ----------
create or replace function public.trace_activite()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_planning uuid;
  v_action text;
  v_details text;
  v_ligne public.activites%rowtype;
begin
  if tg_op = 'DELETE' then
    v_ligne := old; v_action := 'Créneau supprimé';
  elsif tg_op = 'INSERT' then
    v_ligne := new; v_action := 'Créneau ajouté';
  else
    v_ligne := new; v_action := 'Créneau modifié';
  end if;
  v_planning := v_ligne.planning_id;

  -- Si le planning parent n'existe plus (suppression d'une semaine → cascade),
  -- on ne journalise pas : sinon l'INSERT viole la clé étrangère vers plannings.
  if not exists (select 1 from public.plannings where id = v_planning) then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  v_details := coalesce(v_ligne.intitule, 'créneau') || ' (' || to_char(v_ligne.jour, 'DD/MM') || ')';

  insert into public.historique (planning_id, utilisateur_nom, action, details)
  values (v_planning, coalesce(public.nom_utilisateur_courant(), 'Lien public'), v_action, v_details);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_trace_activite on public.activites;
create trigger trg_trace_activite
  after insert or update or delete on public.activites
  for each row execute function public.trace_activite();

create or replace function public.trace_affectation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.affectations%rowtype;
  v_act public.activites%rowtype;
  v_action text;
begin
  if tg_op = 'DELETE' then v_row := old; else v_row := new; end if;
  select * into v_act from public.activites where id = v_row.activite_id;
  if not found then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  -- Planning parent en cours de suppression → on ne journalise pas (cf. trace_activite).
  if not exists (select 1 from public.plannings where id = v_act.planning_id) then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_op = 'INSERT' then
    v_action := case when v_row.origine = 'public' then 'Inscription (lien public)' else 'Personne ajoutée' end;
  elsif tg_op = 'DELETE' then
    v_action := case when v_row.origine = 'public' then 'Désinscription (lien public)' else 'Personne retirée' end;
  else
    v_action := 'Affectation modifiée';
  end if;

  insert into public.historique (planning_id, utilisateur_nom, action, details)
  values (
    v_act.planning_id,
    coalesce(public.nom_utilisateur_courant(), 'Lien public'),
    v_action,
    v_row.nom || ' · ' || coalesce(v_act.intitule, 'créneau') || ' (' || to_char(v_act.jour, 'DD/MM') || ')'
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists trg_trace_affectation on public.affectations;
create trigger trg_trace_affectation
  after insert or update or delete on public.affectations
  for each row execute function public.trace_affectation();

create or replace function public.trace_planning()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare v_qui text;
begin
  v_qui := coalesce(public.nom_utilisateur_courant(), 'Système');
  if new.statut is distinct from old.statut then
    insert into public.historique (planning_id, utilisateur_nom, action, details)
    values (new.id, v_qui,
      case when new.statut = 'archive' then 'Semaine archivée' else 'Semaine réactivée' end, null);
  end if;
  if new.verrouille is distinct from old.verrouille then
    insert into public.historique (planning_id, utilisateur_nom, action, details)
    values (new.id, v_qui,
      case when new.verrouille then 'Planning verrouillé' else 'Planning déverrouillé' end, null);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_trace_planning on public.plannings;
create trigger trg_trace_planning
  after update on public.plannings
  for each row execute function public.trace_planning();

-- =========================================================================
-- Fonctions RPC pour l'accès public (lien partagé, rôle "anon")
-- =========================================================================

-- Renvoie tout le planning (métadonnées + créneaux + affectations) pour un token.
create or replace function public.planning_public(p_token text)
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select case when pl.id is null then null else jsonb_build_object(
    'planning', jsonb_build_object(
      'id', pl.id,
      'semaine_debut', pl.semaine_debut,
      'titre', pl.titre,
      'statut', pl.statut,
      'verrouille', pl.verrouille,
      'token_public', pl.token_public
    ),
    'activites', coalesce((
      select jsonb_agg(a_obj order by (a_obj ->> 'jour'), (a_obj ->> 'ordre')::int)
      from (
        select jsonb_build_object(
          'id', a.id, 'planning_id', a.planning_id, 'jour', a.jour, 'ordre', a.ordre,
          'horaires', a.horaires, 'lieu_depart', a.lieu_depart, 'vehicule', a.vehicule,
          'intitule', a.intitule, 'notes', a.notes, 'places_benevoles', a.places_benevoles,
          'created_at', a.created_at,
          'affectations', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', af.id, 'activite_id', af.activite_id, 'role_perso', af.role_perso,
              'profile_id', af.profile_id, 'nom', af.nom, 'telephone', af.telephone,
              'ordre', af.ordre, 'origine', af.origine, 'created_at', af.created_at
            ) order by af.role_perso desc, af.ordre)
            from public.affectations af where af.activite_id = a.id
          ), '[]'::jsonb)
        ) as a_obj
        from public.activites a where a.planning_id = pl.id
      ) s
    ), '[]'::jsonb),
    'lieux', coalesce((
      select jsonb_agg(jsonb_build_object('nom', l.nom, 'adresse', l.adresse, 'couleur', l.couleur)
             order by l.nom)
      from public.lieux l
    ), '[]'::jsonb)
  ) end
  from public.plannings pl
  where pl.token_public = p_token;
$$;

-- Lien public permanent : renvoie la semaine ACTIVE dont le lundi est celui de
-- la semaine en cours (Europe/Paris), ou NULL si elle n'existe pas encore.
create or replace function public.planning_public_courant()
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select public.planning_public(token_public)
  from public.plannings
  where statut = 'actif'
    and semaine_debut = (date_trunc('week', (now() at time zone 'Europe/Paris'))::date)
  limit 1;
$$;

-- Inscrit un bénévole sur un créneau (contrôles : verrou, places, doublon).
create or replace function public.inscrire_benevole(
  p_token text,
  p_activite_id uuid,
  p_nom text,
  p_telephone text
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_planning public.plannings%rowtype;
  v_activite public.activites%rowtype;
  v_count int;
  v_id uuid;
begin
  select * into v_planning from public.plannings where token_public = p_token;
  if not found then raise exception 'planning introuvable'; end if;
  if v_planning.verrouille or v_planning.statut <> 'actif' then
    raise exception 'inscriptions verrouille';
  end if;

  select * into v_activite from public.activites
    where id = p_activite_id and planning_id = v_planning.id;
  if not found then raise exception 'créneau introuvable'; end if;

  if coalesce(trim(p_nom), '') = '' then raise exception 'nom requis'; end if;

  select count(*) into v_count from public.affectations
    where activite_id = p_activite_id and role_perso = 'benevole';
  if v_count >= v_activite.places_benevoles then
    raise exception 'créneau complet : plus de places';
  end if;

  if exists (
    select 1 from public.affectations
    where activite_id = p_activite_id and role_perso = 'benevole'
      and lower(trim(nom)) = lower(trim(p_nom))
  ) then
    raise exception 'doublon : ce nom est déjà inscrit sur ce créneau';
  end if;

  insert into public.affectations (activite_id, role_perso, profile_id, nom, telephone, ordre, origine)
  values (
    p_activite_id, 'benevole', null, trim(p_nom),
    nullif(trim(coalesce(p_telephone, '')), ''), v_count, 'public'
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Retire une inscription faite via le lien public.
create or replace function public.desinscrire_benevole(p_token text, p_affectation_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare v_planning_id uuid;
begin
  select id into v_planning_id from public.plannings where token_public = p_token;
  if not found then raise exception 'planning introuvable'; end if;

  delete from public.affectations af
  using public.activites a
  where af.id = p_affectation_id
    and af.activite_id = a.id
    and a.planning_id = v_planning_id
    and af.origine = 'public'
    and af.role_perso = 'benevole';
end;
$$;

-- Duplique une semaine (créneaux + référents, pas les bénévoles).
create or replace function public.dupliquer_planning(p_source_id uuid, p_semaine_debut date)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_new_id uuid;
  v_src_debut date;
  v_act public.activites%rowtype;
  v_new_act_id uuid;
begin
  if auth.uid() is null then raise exception 'authentification requise'; end if;

  select semaine_debut into v_src_debut from public.plannings where id = p_source_id;
  if not found then raise exception 'semaine source introuvable'; end if;

  insert into public.plannings (semaine_debut, titre, created_by)
  select p_semaine_debut, titre, auth.uid()
  from public.plannings where id = p_source_id
  returning id into v_new_id;

  for v_act in select * from public.activites where planning_id = p_source_id loop
    insert into public.activites
      (planning_id, jour, ordre, horaires, lieu_depart, vehicule, intitule, notes, places_benevoles)
    values (
      v_new_id,
      p_semaine_debut + (v_act.jour - v_src_debut),
      v_act.ordre, v_act.horaires, v_act.lieu_depart, v_act.vehicule,
      v_act.intitule, v_act.notes, v_act.places_benevoles
    )
    returning id into v_new_act_id;

    insert into public.affectations
      (activite_id, role_perso, profile_id, nom, telephone, ordre, origine)
    select v_new_act_id, role_perso, profile_id, nom, telephone, ordre, 'gestionnaire'
    from public.affectations
    where activite_id = v_act.id and role_perso = 'referent';
  end loop;

  return v_new_id;
end;
$$;

-- Archive les semaines dont le dimanche est passé (Europe/Paris). Idempotent.
create or replace function public.archiver_semaines_ecoulees()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare v_n integer;
begin
  with maj as (
    update public.plannings
    set statut = 'archive'
    where statut = 'actif'
      and semaine_debut + 7 < (now() at time zone 'Europe/Paris')::date
    returning 1
  )
  select count(*) into v_n from maj;
  return v_n;
end;
$$;

-- =========================================================================
-- Row Level Security
--
-- Lecture + écriture des plannings/créneaux/affectations : tout compte connecté
-- (les seuls comptes sont les gestionnaires du planning). Suppression définitive
-- d'une semaine : admin uniquement. Le rôle "anon" (public) n'a AUCUN accès
-- direct aux tables : il ne passe que par les fonctions planning_public /
-- inscrire_benevole / desinscrire_benevole (SECURITY DEFINER).
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.plannings enable row level security;
alter table public.activites enable row level security;
alter table public.affectations enable row level security;
alter table public.historique enable row level security;
alter table public.lieux enable row level security;

drop policy if exists "profiles: lecture connectés" on public.profiles;
create policy "profiles: lecture connectés" on public.profiles
  for select using (auth.role() = 'authenticated');
drop policy if exists "profiles: admin modifie tout" on public.profiles;
create policy "profiles: admin modifie tout" on public.profiles
  for update using (public.role_utilisateur() = 'admin');

drop policy if exists "plannings: lecture connectés" on public.plannings;
create policy "plannings: lecture connectés" on public.plannings
  for select using (auth.role() = 'authenticated');
drop policy if exists "plannings: création connectés" on public.plannings;
create policy "plannings: création connectés" on public.plannings
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "plannings: modification connectés" on public.plannings;
create policy "plannings: modification connectés" on public.plannings
  for update using (auth.role() = 'authenticated');
drop policy if exists "plannings: suppression admin" on public.plannings;
create policy "plannings: suppression admin" on public.plannings
  for delete using (public.role_utilisateur() = 'admin');

drop policy if exists "activites: lecture connectés" on public.activites;
create policy "activites: lecture connectés" on public.activites
  for select using (auth.role() = 'authenticated');
drop policy if exists "activites: écriture connectés" on public.activites;
create policy "activites: écriture connectés" on public.activites
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "affectations: lecture connectés" on public.affectations;
create policy "affectations: lecture connectés" on public.affectations
  for select using (auth.role() = 'authenticated');
drop policy if exists "affectations: écriture connectés" on public.affectations;
create policy "affectations: écriture connectés" on public.affectations
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "historique: lecture connectés" on public.historique;
create policy "historique: lecture connectés" on public.historique
  for select using (auth.role() = 'authenticated');

drop policy if exists "lieux: lecture connectés" on public.lieux;
create policy "lieux: lecture connectés" on public.lieux
  for select using (auth.role() = 'authenticated');
drop policy if exists "lieux: écriture connectés" on public.lieux;
create policy "lieux: écriture connectés" on public.lieux
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- =========================================================================
-- Droits d'exécution des fonctions
-- =========================================================================
grant execute on function public.planning_public(text) to anon, authenticated;
grant execute on function public.planning_public_courant() to anon, authenticated;
grant execute on function public.inscrire_benevole(text, uuid, text, text) to anon, authenticated;
grant execute on function public.desinscrire_benevole(text, uuid) to anon, authenticated;
grant execute on function public.dupliquer_planning(uuid, date) to authenticated;
grant execute on function public.archiver_semaines_ecoulees() to authenticated;

-- Force le rechargement du cache de l'API (PostgREST) : indispensable pour que
-- les nouvelles fonctions RPC (dupliquer_planning…) soient visibles tout de suite.
notify pgrst, 'reload schema';

-- =========================================================================
-- (Optionnel) Archivage automatique quotidien via pg_cron, si l'extension est
-- disponible sur le projet Supabase. Sinon, l'archivage se fait au chargement
-- de la liste des semaines côté appli.
-- =========================================================================
-- create extension if not exists pg_cron;
-- select cron.schedule('archiver-plannings', '30 3 * * *',
--   $$ select public.archiver_semaines_ecoulees(); $$);

-- =========================================================================
-- BOOTSTRAP DU PREMIER ADMIN
-- 1) Crée ton compte via la page /inscription de l'appli (une seule fois).
-- 2) Exécute la ligne ci-dessous avec ton email, puis désactive l'inscription
--    dans Supabase (Authentication > Sign In / Providers > "Allow new users to
--    sign up" = OFF).
-- update public.profiles set role = 'admin' where email = 'ton.email@example.com';
-- =========================================================================
