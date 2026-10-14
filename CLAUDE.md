# Allure — consignes pour Claude Code

Allure est l'application perso d'Alexandre pour suivre son sport : course, vélo, natation, musculation.
C'est une PWA (React 18 chargé en `<script>`, sans bundler) hébergée sur **GitHub Pages**, servie depuis la **racine** de la branche `main`.
Alexandre n'a aucune compétence en code : explique simplement, en français, et ne casse jamais ses données locales.

## Fichiers : source et fichiers générés
- **Source de vérité** : `src/app.jsx` (toute l'app) et `src/style.css`.
- **Fichiers servis, générés** : `app.js` et `style.css` à la racine. Ne les modifie jamais à la main.
- Après toute modification : `npm install` (la première fois) puis `npm run build`. Commite **les sources ET les fichiers générés**.
- Si `npm install` est impossible (registre npm inaccessible depuis l'environnement), compilation de secours avec TypeScript, testée en octobre 2026 :
  `tsc src/app.jsx --allowJs --jsx react --target es2020 --noCheck --removeComments --outDir /tmp/out && sed '1{/^"use strict";$/d}' /tmp/out/app.js > app.js && cp src/style.css style.css`
  (on retire `"use strict"` pour rester identique au comportement de la sortie Babel). Le dire dans le message de commit.
- `sw.js` : incrémente la constante `CACHE` (allure-vNN) à chaque livraison, sinon les téléphones gardent l'ancienne version.
- `vendor/` : React et Leaflet embarqués (ne pas remplacer par des CDN).
- `index.html`, `manifest.webmanifest` : rarement modifiés.

## Test local
- `npm run serve` puis ouvrir http://localhost:8765 (viewport mobile, environ 390 px de large).
- Une nouvelle installation (localStorage vide) affiche l'introduction : cliquer « Passer l'introduction » dans les tests.
- Avec Playwright, `page.route(...)` désactive le cache HTTP du navigateur : ne pas s'en servir pour tester les problèmes de cache.
- Mode démo sans compte Intervals.icu : définir `window.ALLURE_DEMO = true` avant le chargement (activités, bien-être et tracés fictifs).
- Pour tester dans un navigateur automatisé (Playwright) : simuler les API externes avec des routes interceptées plutôt que de dépendre du réseau.

## Données de l'utilisateur (localStorage) — ne jamais les perdre
- `allure_state_v1` : `{ workouts, program, profile, templates, steps, planVersion }`. Toute évolution de structure passe par `bootState()` (migration par `planVersion` / `PLAN_VERSION`). Conserver l'historique `workouts`.
- `allure_icu_conn_v1` (clé Intervals.icu), `allure_icu_cache_v3`, `allure_routes_v1` (tracés GPS en cache), `allure_ors_key_v1` (clé OpenRouteService), `allure_route_prefs_v1`.
- Les clés API ne sont jamais exportées, jamais affichées, jamais écrites dans le dépôt.

## Architecture de `src/app.jsx`
- Plan = `program` : tableau de semaines `{ id, sessions: [{ id, discipline, day(0=lundi), desc, target, templateId?, done }] }` ; la semaine 1 commence à `profile.programStart`. `locateWeek` crée/décale les semaines quand on déplace une séance.
- `buildProgram(templates, zones)` génère le programme type de 12 semaines (3 blocs de 3 semaines + 1 semaine allégée). Semaine type : lun Push + footing facile · mar Pull · mer course qualité · jeu Jambes · ven repos · sam sortie longue vélo + Rappel haut du corps · dim natation.
- Zones de FC : `profile.zones` (5 zones) et `profile.maxHR`, **vides par défaut** (`DEFAULT_PROFILE`) : chaque utilisateur les renseigne dans Réglages. `zoneOk()` teste une zone ; sans zones, `buildProgram` écrit « Z1 » sans bpm et le coach reçoit « non renseignées ». Les données déjà enregistrées gardent leurs zones.
- Introduction : `Onboarding`, affichée seulement à une nouvelle installation (`bootState` renvoie `fresh: true`) ou après « Tout effacer », ou à la demande (Réglages → Revoir l'introduction). Elle demande le prénom (`profile.firstName`, affiché « Bonjour Prénom » dans Aujourd'hui) puis explique comment obtenir les clés (Intervals.icu, OpenRouteService, Gemini). Les instructions et limites citées ont été vérifiées en octobre 2026 : à revérifier si elles changent.
- Coach : bouton « Effacer » (barre au-dessus de la conversation) pour repartir de zéro ; la conversation est dans `allure_coach_v1` (40 derniers messages conservés) mais **est vidée à chaque lancement de l'app** (choix d'Alexandre, octobre 2026 : code juste après `saveCoach`) ; clé, objectif et réglages du coach sont conservés.
- Coach (`CoachPage`) : conversation avec l'API Gemini appelée directement depuis le navigateur (clé gratuite de l'utilisateur dans `allure_coach_key_v1`, jamais envoyée ailleurs). `buildCoachContext()` prépare le dossier de données (plan avec références [A1]…, séances réalisées, bien-être, charges) ; le modèle répond en JSON `{reply, actions}`. Les actions (`adjust`, `move`, `delete`) sont validées par `resolveActions()` puis appliquées seulement après clic de l'utilisateur via `coachApply()` dans `App`. Ne jamais appliquer une action automatiquement.
- Base d'exercices (`EXO_RAW` → `EXERCISES`, composants `ExerciseLibrary` et `ExerciseInfoSheet`) : 118 exercices en français, textes originaux (ne pas copier de contenu protégé d'autres sites). Les noms suivent « Exercice – Matériel » comme les séances de l'utilisateur ; la colonne « Autres noms » rattache les variantes (G/D) au journal via `normEx`. Pour ajouter un exercice, ajouter une ligne à `EXO_RAW`.
- L'Historique n'est plus un onglet : il s'ouvre depuis Réglages.
- Écrans : Aujourd'hui (`Today`), Calendrier (`Calendar`, glisser-déposer par appui long), Musculation (`MuscuHome` : séances + journal des charges et records), Carte (`MapPage` : `MyRoutes` et `RouteBuilder`), Historique (`History`), Réglages (`Settings`).
- Intervals.icu : activités + bien-être (`icuGet`, `icuFetch`, `fetchIcuAll`) ; détails d'activité et tracé GPS via `/activity/{id}`, `/map` et `/streams.json?types=latlng`. Les activités Strava sont illisibles par l'API (« stubs »).
- Itinéraires : OpenRouteService (`orsLoop`, `generateLoops`, profil `foot-walking`, `round_trip`), géocodage Nominatim, export GPX (`toGpx`). Carte : Leaflet + tuiles OpenStreetMap.

## Conventions
- Interface 100 % en français ; vocabulaire : « Musculation » (pas « Muscu »), « Calendrier », « Carte », « pas ».
- Mobile d'abord. Pas de zoom au double-tap (`touch-action: manipulation` global).
- Pas de dépendance npm au runtime : tout reste dans `src/app.jsx` + `vendor/`. Pas de `localStorage` hors des clés listées ci-dessus.
- Accessibilité : libellés `aria-label` sur les boutons-icônes, éléments cliquables atteignables au clavier.
- Avant de livrer : vérifier qu'il n'y a pas d'erreur console, que `npm run build` passe, que l'ancien état (`allure_state_v1`) se charge toujours.

## Livraison
Choix d'Alexandre (octobre 2026) : **mise en ligne directe sur `main`**, sans pull request, pour qu'il n'ait rien à faire sur GitHub.
1. Faire la modification, `npm run build`, incrémenter `CACHE` dans `sw.js`.
2. Tester (mode démo, pas d'erreur console, ancien état chargé) **avant** de pousser : chaque push sur `main` est en ligne environ une minute après.
3. Commit avec un message clair en français, puis `git push origin main`.
4. Expliquer à Alexandre ce qui a changé et lui rappeler d'ouvrir l'app deux fois sur le téléphone.
En cas de problème après mise en ligne, revenir en arrière avec `git revert` (jamais de `push --force`).
