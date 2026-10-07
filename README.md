# Comptes de la famille

Application de suivi de budget qui tient dans un seul fichier, `index.html` : import de relevés bancaires CSV, tri automatique par règles, plusieurs comptes, budgets mensuels et annuels, tableau de bord.

## Fonctionnalités

- **Import** de relevés CSV, OFX (« format Money ») et QIF, avec détection des doublons et des opérations absentes du relevé.
- **Saisie et modification manuelles** d'une opération (espèces, chèque…) : date, libellé, montant, compte, catégorie, moyen de paiement et note.
- **Rapprochement saisie ↔ relevé** : une opération saisie à la main est retrouvée à l'import du relevé (même compte, même montant, jusqu'à 60 jours d'écart) et n'est pas ajoutée en double ; elle garde votre libellé, votre catégorie et vos commentaires, et reçoit le libellé et la date de la banque. Le bouton 🔗 du journal rapproche aussi après coup une saisie et une ligne déjà importée.
- **Commentaires** (💬) sur chaque opération : fil daté, signé si on le souhaite, pris en compte par la recherche et l'export CSV.
- **Moyens de paiement** (carte, virement, prélèvement, chèque, espèces, ou les vôtres) : reconnus automatiquement à l'import d'après des mots-clés du libellé, modifiables dans chaque opération ou en lot, et filtrables dans le journal.
- **Plusieurs comptes**, solde initial par compte, et **solde après chaque opération** quand un compte est sélectionné.
- **Pointage et rapprochement bancaire** : cochez les opérations vérifiées, puis comparez le solde de l'appli avec celui de la banque à une date donnée.
- **Catégories et règles de tri automatique** (modifiables et ordonnables). On peut aussi créer une règle directement depuis une opération.
- **Budgets** mensuels et annuels, et provisions, en trois sous-onglets. Le **bilan mensuel** fonctionne comme des « enveloppes » : on reporte un surplus ou un dépassement sur le mois suivant, ou on met le reste de côté. Un bouton crée des **budgets moyens depuis le 1er janvier**.
- **Échéancier** :
  - opérations récurrentes (loyer, salaire, abonnements…), qui avancent automatiquement quand l'opération correspondante est importée ;
  - suggestions tirées de l'historique ;
  - **prévision de solde** avec alerte en cas de passage dans le rouge.
- **Tableau de bord** : évolution, habitudes par catégorie, état des budgets, détail mensuel et **comparaison annuelle** (N / N-1). Les graphiques se personnalisent (courbes, barres, anneau ; séries affichées ; dépenses ou revenus ; catégories principales ou sous-catégories ; nombre de postes), et un **clic sur un point, une barre ou une part** ouvre le journal sur les opérations concernées.
- **Recherche** par libellé, note, commentaire ou montant, et filtres par période, catégorie, sens (revenus / dépenses), moyen de paiement et pointage.
- **Annuler** (Ctrl+Z) les 15 dernières modifications.
- **Apparence** (Réglages) : thème Automatique, Clair, Sombre ou **Minitel** (vidéotex : fond noir, 8 couleurs, police bitmap, vidéo inverse, « 3615 MESCOMPTES »), et taille du texte (Normal, Grand, Très grand). Ce réglage est propre à chaque appareil.
- **Accessibilité** :
  - onglets utilisables au clavier (flèches, Début, Fin) et lien « Aller au contenu » ;
  - chaque champ a un nom lisible par les lecteurs d'écran ;
  - contrastes conformes au niveau AA ;
  - animations désactivées si le système le demande ;
  - sur téléphone, onglets en barre du bas.
- Export CSV et PDF, sauvegarde JSON (avec un rappel si aucune n'a été faite depuis 30 jours), synchronisation Google Drive.

## Mettre à jour l'appli

Repartez **toujours du `index.html` actuel de la branche `main`** pour faire une modification, puis renvoyez-le sur GitHub. Si vous renvoyez une copie plus ancienne, les fonctions ajoutées depuis disparaissent, et la connexion à Google Drive peut échouer (le code secret n'est plus envoyé). Au prochain chargement de la bonne version, l'appli récupère automatiquement depuis Drive les données que l'ancienne version a effacées.

## Utilisation

Ouvrez `index.html` dans un navigateur, ou publiez-le (GitHub Pages par exemple). Les données restent dans le navigateur (`localStorage`). Il est prudent d'exporter régulièrement une sauvegarde JSON (bouton « Exporter la sauvegarde »).

Une connexion internet est nécessaire au chargement : PapaParse, Chart.js et jsPDF sont chargés depuis cdnjs.

## Sauvegarde automatique sur Google Drive (optionnel)

1. Suivez le **tutoriel pas à pas** de l'application (Réglages → « 📘 Tutoriel : créer votre lien Google Drive ») : il contient le code du script à copier, la création du **code secret** (`TOKEN`) et le déploiement. Les mêmes instructions figurent en tête de [`google-apps-script.gs`](google-apps-script.gs).
2. Dans l'application, collez l'URL `/exec` et le code secret, puis cliquez sur « Connecter ».

Fonctionnement :
- Chaque opération, catégorie, règle… porte l'heure de sa dernière modification, et chaque suppression est mémorisée. Si deux appareils ont modifié les données chacun de leur côté, les deux versions sont **fusionnées automatiquement** : pour chaque élément, la modification la plus récente l'emporte, et rien n'est perdu (auparavant, il fallait choisir une version entière, ce qui pouvait effacer les catégorisations faites sur l'autre appareil).
- Une opération qui pointe vers une catégorie disparue (par exemple après l'import d'une ancienne sauvegarde) n'est plus affichée « à trier » : une catégorie « Catégorie récupérée » est recréée dans le groupe « À renommer » pour que vous puissiez la renommer.
- Si le Drive est vide (script tout neuf), les données locales y sont envoyées : elles ne sont jamais effacées.
- Un ancien script qui ne renvoie pas le champ `updatedAt` fonctionne toujours, mais les conflits ne sont alors détectés qu'à la première connexion.

## Protection contre la perte de données

Plusieurs filets de sécurité se complètent :

- **Rien n'est jamais remplacé en bloc.** Quand deux versions se rencontrent (deux appareils via Drive, deux onglets ouverts sur le même appareil, copie de secours), elles sont fusionnées élément par élément. Seule une suppression que vous avez faite retire quelque chose ; ce qu'une version aurait perdu est conservé puis renvoyé.
- **Écriture protégée sur Drive** (script version 2) : le script refuse une écriture si Drive a changé entre-temps (l'appli fusionne puis réessaie), refuse de vider toutes les opérations sans suppression volontaire, et garde chaque jour une copie dans le dossier « Comptes famille - sauvegardes » de votre Drive (30 jours). L'appli signale un script à mettre à jour.
- **Copie de secours locale** (IndexedDB) : si le navigateur refuse d'enregistrer (stockage plein) ou si les données locales sont effacées ou abîmées, l'appli repart de cette copie. Un bandeau rouge signale tout échec d'enregistrement ; des données illisibles ne sont jamais écrasées.
- **Points de restauration** (Réglages) : un par jour d'utilisation pendant 14 jours, plus un avant chaque opération lourde (import d'une sauvegarde, réinitialisation, suppression d'un import, d'un compte ou d'une sélection, synchronisation qui supprime beaucoup d'opérations). Restaurables ou téléchargeables d'un clic.
- **Envoi immédiat** des modifications quand la page est masquée ou fermée, et récupération immédiate de celles des autres appareils quand elle revient au premier plan.
- **Horloge protégée** : un appareil dont l'heure retarde ne voit pas ses modifications écartées.
- Et toujours : ↶ Annuler (15 étapes) et la sauvegarde manuelle exportable.

## Sauvegarde dans un dossier OneDrive, Dropbox… (optionnel)

Sur ordinateur avec Chrome ou Edge, Réglages → « 📁 Sauvegarde automatique dans un dossier » : choisissez un fichier dans votre dossier OneDrive synchronisé, et l'application y réécrit la sauvegarde après chaque modification. C'est une sauvegarde à sens unique (elle ne synchronise pas plusieurs appareils) ; « Restaurer depuis ce fichier » la recharge. Une connexion directe à l'API OneDrive demanderait d'enregistrer l'application auprès de Microsoft (Azure) et n'est pas fournie.

## Virements internes

Cochez « Virement interne » sur une catégorie (onglet Règles & catégories) pour que les virements entre vos propres comptes ne soient comptés ni en revenus ni en dépenses. Le solde de chaque compte, lui, en tient compte.

## Tests

```sh
node tests/run-tests.js
```

Ces tests couvrent les fonctions « pures » du bloc `<script id="pure-utils">` de `index.html` : lecture des montants et des dates, périodes, échappement HTML/CSV. Aucune dépendance n'est à installer.
