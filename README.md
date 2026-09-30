# Comptes de la famille

Application de suivi de budget qui tient dans un seul fichier, `index.html` : import de relevés bancaires CSV, tri automatique par règles, plusieurs comptes, budgets mensuels et annuels, tableau de bord.

## Fonctionnalités

- **Import** de relevés CSV, OFX (« format Money ») et QIF, avec détection des doublons et des opérations absentes du relevé.
- **Saisie et modification manuelles** d'une opération (espèces, chèque…) : date, libellé, montant, compte, catégorie et note.
- **Plusieurs comptes**, solde initial par compte, et **solde après chaque opération** quand un compte est sélectionné.
- **Pointage et rapprochement bancaire** : cochez les opérations vérifiées, puis comparez le solde de l'appli avec celui de la banque à une date donnée.
- **Catégories et règles de tri automatique** (modifiables et ordonnables). On peut aussi créer une règle directement depuis une opération.
- **Budgets** mensuels et annuels, et provisions, en trois sous-onglets. Le **bilan mensuel** fonctionne comme des « enveloppes » : on reporte un surplus ou un dépassement sur le mois suivant, ou on met le reste de côté. Un bouton crée des **budgets moyens depuis le 1er janvier**.
- **Échéancier** :
  - opérations récurrentes (loyer, salaire, abonnements…), qui avancent automatiquement quand l'opération correspondante est importée ;
  - suggestions tirées de l'historique ;
  - **prévision de solde** avec alerte en cas de passage dans le rouge.
- **Tableau de bord** : évolution, habitudes par catégorie, état des budgets, détail mensuel et **comparaison annuelle** (N / N-1).
- **Recherche** par libellé, note ou montant, et filtres par période, catégorie et pointage.
- **Annuler** (Ctrl+Z) les 15 dernières modifications.
- Export CSV et PDF, sauvegarde JSON (avec un rappel si aucune n'a été faite depuis 30 jours), synchronisation Google Drive.

## Mettre à jour l'appli

Repartez **toujours du `index.html` actuel de la branche `main`** pour faire une modification, puis renvoyez-le sur GitHub. Si vous renvoyez une copie plus ancienne, les fonctions ajoutées depuis disparaissent, et la connexion à Google Drive peut échouer (le code secret n'est plus envoyé). Au prochain chargement de la bonne version, l'appli récupère automatiquement depuis Drive les données que l'ancienne version a effacées.

## Utilisation

Ouvrez `index.html` dans un navigateur, ou publiez-le (GitHub Pages par exemple). Les données restent dans le navigateur (`localStorage`). Il est prudent d'exporter régulièrement une sauvegarde JSON (bouton « Exporter la sauvegarde »).

Une connexion internet est nécessaire au chargement : PapaParse, Chart.js et jsPDF sont chargés depuis cdnjs.

## Sauvegarde automatique sur Google Drive (optionnel)

1. Suivez les instructions en tête de [`google-apps-script.gs`](google-apps-script.gs) pour déployer le script et définir un **code secret** (`TOKEN`).
2. Dans l'application, collez l'URL `/exec` et le code secret, puis cliquez sur « Connecter ».

Fonctionnement :
- Chaque sauvegarde est horodatée. Si un autre appareil a modifié Drive pendant que celui-ci avait des modifications non envoyées, l'application demande quelle version garder au lieu d'écraser l'une par l'autre.
- Si le Drive est vide (script tout neuf), les données locales y sont envoyées : elles ne sont jamais effacées.
- Un ancien script qui ne renvoie pas le champ `updatedAt` fonctionne toujours, mais les conflits ne sont alors détectés qu'à la première connexion.

## Virements internes

Cochez « Virement interne » sur une catégorie (onglet Règles & catégories) pour que les virements entre vos propres comptes ne soient comptés ni en revenus ni en dépenses. Le solde de chaque compte, lui, en tient compte.

## Tests

```sh
node tests/run-tests.js
```

Ces tests couvrent les fonctions « pures » du bloc `<script id="pure-utils">` de `index.html` : lecture des montants et des dates, périodes, échappement HTML/CSV. Aucune dépendance n'est à installer.
