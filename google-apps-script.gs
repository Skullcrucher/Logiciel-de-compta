/**
 * Script Google Apps Script de sauvegarde pour « Comptes de la famille » — version 2.
 *
 * Installation (une seule fois) :
 *  1. https://script.google.com → Nouveau projet → collez ce fichier à la place du contenu.
 *  2. Paramètres du projet (roue dentée) → Propriétés du script → Ajouter :
 *       TOKEN = une longue phrase secrète (ex. générée par un gestionnaire de mots de passe)
 *  3. Déployer → Nouveau déploiement → type « Application Web »
 *       Exécuter en tant que : Moi · Qui a accès : Tout le monde
 *  4. Copiez l'URL qui se termine par /exec dans l'application, avec le même code secret.
 *
 * Mise à jour d'un script existant : collez ce code, Enregistrer, puis Déployer → Gérer les
 * déploiements → ✎ → Version : « Nouvelle version » → Déployer (le lien /exec ne change pas).
 *
 * Protections contre la perte de données (version 2) :
 *  - écriture conditionnelle : l'appli indique sur quelle version de Drive elle s'est basée
 *    (`base`) ; si un autre appareil a écrit entre-temps, l'écriture est refusée (« conflict »)
 *    et l'appli fusionne avant de réessayer : deux appareils ne peuvent plus s'écraser ;
 *  - une écriture qui viderait toutes les opérations est refusée, sauf suppression volontaire ;
 *  - avant la première écriture de chaque jour, une copie du fichier est gardée dans le dossier
 *    « Comptes famille - sauvegardes » de votre Drive (les 30 dernières).
 *
 * Sans propriété TOKEN, le script accepte toutes les requêtes (ancien comportement) :
 * toute personne connaissant l'URL pourrait alors lire vos opérations.
 */
const FILE_NAME = "comptes-famille.json";
const BACKUP_FOLDER = "Comptes famille - sauvegardes";
const BACKUPS_KEPT = 30;
const VERSION = 2;

function isAuthorized_(e) {
  const expected = PropertiesService.getScriptProperties().getProperty("TOKEN");
  if (!expected) return true;
  return !!(e && e.parameter && e.parameter.token === expected);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getFile_() {
  const files = DriveApp.getFilesByName(FILE_NAME);
  return files.hasNext() ? files.next() : null;
}

function readJson_(text) {
  try {
    const v = JSON.parse(text || "{}");
    return v && typeof v === "object" ? v : {};
  } catch (err) {
    return null; // fichier abîmé : on ne bloque pas l'écriture, mais on le sauvegarde d'abord
  }
}

function getBackupFolder_() {
  const folders = DriveApp.getFoldersByName(BACKUP_FOLDER);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(BACKUP_FOLDER);
}

/* Copie du fichier actuel, une fois par jour, avant qu'il soit remplacé. */
function backupDaily_(text) {
  const folder = getBackupFolder_();
  const day = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const name = "comptes-famille-" + day + ".json";
  if (folder.getFilesByName(name).hasNext()) return;
  folder.createFile(name, text, MimeType.PLAIN_TEXT);
  const all = [];
  const it = folder.getFiles();
  while (it.hasNext()) all.push(it.next());
  all.sort(function (a, b) { return b.getName() < a.getName() ? -1 : b.getName() > a.getName() ? 1 : 0; });
  all.slice(BACKUPS_KEPT).forEach(function (f) { f.setTrashed(true); });
}

function doGet(e) {
  if (!isAuthorized_(e)) return json_({ error: "unauthorized" });
  const file = getFile_();
  if (!file) return json_({});
  return ContentService.createTextOutput(file.getBlob().getDataAsString())
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  if (!isAuthorized_(e)) return json_({ error: "unauthorized" });
  const body = e.postData && e.postData.contents;
  let data;
  try {
    data = JSON.parse(body);
    if (!data || typeof data !== "object") throw new Error("format");
  } catch (err) {
    return json_({ error: "invalid_json" });
  }
  const params = (e && e.parameter) || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const file = getFile_();
    if (file) {
      const currentText = file.getBlob().getDataAsString();
      const current = readJson_(currentText);
      if (current) {
        // Écriture conditionnelle : refusée si Drive a changé depuis la version lue par l'appli.
        const cur = current.updatedAt;
        if (params.base !== undefined && cur !== undefined && cur !== null && String(cur) !== String(params.base)) {
          return json_({ error: "conflict", updatedAt: cur, version: VERSION });
        }
        // Jamais de remise à zéro des opérations sans suppression volontaire.
        const had = Array.isArray(current.transactions) ? current.transactions.length : 0;
        const has = Array.isArray(data.transactions) ? data.transactions.length : 0;
        if (had > 0 && has === 0 && params.allowEmpty !== "1") {
          return json_({ error: "refused_empty", version: VERSION });
        }
      }
      if (currentText) backupDaily_(currentText);
      file.setContent(body);
    } else {
      DriveApp.createFile(FILE_NAME, body, MimeType.PLAIN_TEXT);
    }
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true, version: VERSION });
}
