# Imposteur ◈

Jeu de soirée en français sur un seul téléphone, pour 3 à 20 personnes. Application web responsive sans compte, backend ni clé API. Adaptation du jeu de déduction à deux mots : civils, imposteurs et Mr White.

## Développer

Node.js **22.12+** (ou 24 LTS) et npm.

```sh
npm ci
npm run dev
```

Le serveur écoute sur toutes les interfaces, port 5173 par défaut. Pour jouer sur téléphone, héberger le build sur un hébergement web statique ou utiliser le réseau local si celui-ci permet d'atteindre la machine de développement.

```sh
npm test          # tests de la distribution, des règles et du dictionnaire
npm run build    # sortie statique dans dist/
npm run preview  # vérifier le build localement
```

Publier le contenu de `dist/` sur un hébergeur statique. Aucune configuration serveur, variable d'environnement ou authentification applicative nécessaire. Les polices Hanken Grotesk et JetBrains Mono sont auto-hébergées via les paquets Fontsource, sans requête vers Google Fonts.

## Jouer

1. Inscrire les prénoms, choisir le nombre d'imposteurs et de Mr White, puis un ou plusieurs thèmes. Les civils doivent rester majoritaires au départ.
2. Passer le téléphone au joueur indiqué. Il maintient la pastille 450 ms pour lire son mot, puis relâche pour le voiler avant de passer le téléphone. Un écran neutre confirme chaque destinataire. Les civils et imposteurs ne connaissent pas explicitement leur rôle. Mr White sait qu'il n'a pas de mot.
3. Donner chacun un indice sans prononcer, traduire ou épeler le mot. Le premier joueur n'est jamais Mr White ; les tours suivants sont mélangés parmi les survivants. Discuter, avec ou sans chronomètre.
4. Voter à voix haute et sélectionner le joueur choisi sur le téléphone. En cas d'égalité, discuter et revoter : aucune élimination arbitraire. Confirmer révèle le rôle et élimine le joueur.
5. Un Mr White éliminé fait **une tentative** pour deviner le mot des civils. Correspondance exacte hors casse, accents, espaces et ponctuation. S'il réussit, il gagne seul. Sinon, la partie continue.
6. Les civils gagnent quand tous les infiltrés sont éliminés. Les infiltrés encore en jeu gagnent dès qu'ils sont aussi nombreux que les civils.

Ce sont les règles retenues par cette application, avec des variantes possibles par rapport aux éditions commerciales. La source officielle Yanstar n'a pas pu être consultée pendant le développement (accès réseau refusé).

## Mots et confidentialité

96 paires originales dans `src/game.js` : Internet français, Pop culture, La vie en France et Les valeurs sûres. Les thèmes peuvent être mélangés. Pas de répétition de paire avant épuisement du choix dans la session ; l'orientation civil/imposteur est aléatoire.

Seuls les prénoms et paramètres sont conservés en localStorage. Aucun mot ni rôle sauvegardé, aucune donnée de partie envoyée à un serveur. Un rechargement abandonne donc la manche. Le mot est visuellement flouté et retiré de l’arbre d’accessibilité au relâchement, quand la fenêtre perd le focus ou quand l’application passe en arrière-plan. L’écran neutre de passage ne contient ni mot ni rôle. Cette protection visuelle n'empêche pas une inspection technique du navigateur, une capture d'écran ou quelqu'un qui regarde par-dessus l'épaule. Le propriétaire du téléphone doit aussi jouer sans inspecter le code.

Les mots sont gardés secrets jusqu'à la fin de partie, sauf la carte personnelle de chaque joueur. Aucun service tiers requis pour le jeu ni pour les polices.

## GitHub Pages

Le workflow `.github/workflows/pages.yml` teste et compile le site à chaque push sur `main`, puis le déploie sur Pages. Dans **Settings → Pages → Build and deployment → Source**, sélectionner **GitHub Actions**. Si nécessaire, lancer ensuite **Actions → Deploy to GitHub Pages → Run workflow**. Après succès du déploiement, l'adresse attendue est `https://nono-el-nino.github.io/Imposteur/`. Le lien n'est actif qu'après activation de Pages et réussite du workflow. La configuration Vite utilise des chemins relatifs pour servir les ressources sous `/Imposteur/`.


## Interface Voile et installation mobile

Direction artistique givrée, verre dépoli, halos de phase et transitions de mise au point. Les couleurs, polices et jetons de mouvement sont centralisés dans `src/theme.css`. Les composants visuels et la lecture protégée sont dans `src/components.js`. Le moteur et les 96 paires de `src/game.js` restent inchangés.

- L’appui long révèle après 450 ms. Le bouton de passage devient disponible après une lecture complète. Le relâchement, Échap, le changement d’application ou la perte de focus referment le secret.
- Option double appui dans les réglages : deux appuis rapides pour lire, un pour refermer, fermeture automatique après 7 secondes. Au clavier : Espace/Entrée maintenu, ou bascule en mode alternatif.
- Mr White conserve une barre floutée même pendant la lecture ; son rôle devient alors net.
- Les votes restent collectifs et oraux. L’application enregistre uniquement la personne désignée.
- Les animations respectent `prefers-reduced-motion`, tout en gardant le flou statique de protection.

Sur iPhone : ouvrir le site dans Safari, puis **Partager → Sur l’écran d’accueil**. Sur Android : **Installer l’application** dans le navigateur (ou bouton proposé à l’accueil lorsque disponible). L’application utilise un manifeste, des icônes et un service worker en production HTTPS ; le serveur de développement ne l’active pas.

Après une première ouverture connectée et la mise en cache terminée, le jeu et les polices fonctionnent hors ligne. La mise en cache ne conserve que les fichiers statiques, jamais la partie. Les mises à jour s’activent après fermeture de tous les onglets/fenêtres de l’application ; aucune mise à jour ne force l’interruption d’une partie en cours.

Validation Voile : tests des règles, build, parcours Chromium mobile (appui interrompu/complet, Mr White, double appui, vote et victoire), rechargement hors ligne sous `/Imposteur/`, lecture au clavier et réduction des animations. L’installation dans l’interface système iOS/Android reste à vérifier sur appareil physique.
