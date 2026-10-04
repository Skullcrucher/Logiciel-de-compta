/* Tests des fonctions utilitaires de index.html (bloc <script id="pure-utils">).
   Lancer avec : node tests/run-tests.js   (aucune dépendance à installer) */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const block = html.match(/<script id="pure-utils">([\s\S]*?)<\/script>/);
if(!block) throw new Error("Bloc <script id=\"pure-utils\"> introuvable dans index.html");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(block[1], ctx);

let passed = 0, failed = 0;
function test(name, fn){
  try{ fn(); passed++; console.log("  ✓ " + name); }
  catch(e){ failed++; console.log("  ✗ " + name + "\n      " + e.message); }
}

console.log("parseFrenchNumber");
test("format français", ()=>{
  assert.strictEqual(ctx.parseFrenchNumber("1 234,56"), 1234.56);
  assert.strictEqual(ctx.parseFrenchNumber("1 234,56 €"), 1234.56);
  assert.strictEqual(ctx.parseFrenchNumber("1.234,56"), 1234.56);
  assert.strictEqual(ctx.parseFrenchNumber("-12,50"), -12.5);
});
test("format anglais", ()=>{
  assert.strictEqual(ctx.parseFrenchNumber("1,234.56"), 1234.56);
  assert.strictEqual(ctx.parseFrenchNumber("12.50"), 12.5);
  assert.strictEqual(ctx.parseFrenchNumber("0.125"), 0.125);
});
test("points de milliers seuls", ()=>{
  assert.strictEqual(ctx.parseFrenchNumber("1.234"), 1234);
  assert.strictEqual(ctx.parseFrenchNumber("12.345.678"), 12345678);
});
test("signe moins final et parenthèses", ()=>{
  assert.strictEqual(ctx.parseFrenchNumber("12,50-"), -12.5);
  assert.strictEqual(ctx.parseFrenchNumber("(12,50)"), -12.5);
  assert.strictEqual(ctx.parseFrenchNumber("+3,00"), 3);
});
test("valeurs illisibles → NaN", ()=>{
  for(const v of ["", "abc", "12abc", "1,2,3x", null, undefined, "--"]) assert.ok(Number.isNaN(ctx.parseFrenchNumber(v)), String(v));
});

console.log("parseFlexDate");
test("formats reconnus", ()=>{
  assert.strictEqual(ctx.parseFlexDate("2026-09-24"), "2026-09-24");
  assert.strictEqual(ctx.parseFlexDate("24/09/2026"), "2026-09-24");
  assert.strictEqual(ctx.parseFlexDate("4.9.2026"), "2026-09-04");
  assert.strictEqual(ctx.parseFlexDate("24/09/26"), "2026-09-24");
  assert.strictEqual(ctx.parseFlexDate("2026-9-4"), "2026-09-04");
});
test("dates invalides → chaîne vide", ()=>{
  for(const v of ["", "hier", "31/02/2026", "2026-13-01", "Solde au", null]) assert.strictEqual(ctx.parseFlexDate(v), "", String(v));
});

console.log("dates locales / périodes");
test("localMonthStr n'utilise pas l'UTC", ()=>{
  // 1er août 2026 à 00:30 heure locale : doit rester en août quel que soit le fuseau.
  assert.strictEqual(ctx.localMonthStr(new Date(2026, 7, 1, 0, 30)), "2026-08");
  assert.strictEqual(ctx.localDateStr(new Date(2026, 0, 5)), "2026-01-05");
});
test("semaines calées sur le lundi", ()=>{
  assert.strictEqual(ctx.periodKey("2026-09-21", "week"), "2026-09-21"); // lundi
  assert.strictEqual(ctx.periodKey("2026-09-27", "week"), "2026-09-21"); // dimanche
  assert.strictEqual(ctx.periodKey("2026-09-28", "week"), "2026-09-28");
  assert.strictEqual(ctx.periodKey("2026-09-24", "month"), "2026-09");
});
test("daysBetween", ()=>{
  assert.strictEqual(ctx.daysBetween("2026-03-28", "2026-03-30"), 2); // passage à l'heure d'été
  assert.strictEqual(ctx.daysBetween("x", "2026-03-30"), Infinity);
});

console.log("sécurité");
test("escapeHtml", ()=>{
  assert.strictEqual(ctx.escapeHtml(`<img src=x onerror="a('b')">&`), "&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;");
  assert.strictEqual(ctx.escapeHtml(null), "");
});
test("isSafeId", ()=>{
  assert.ok(ctx.isSafeId(ctx.uid()));
  assert.ok(!ctx.isSafeId("a');alert(1);('"));
  assert.ok(!ctx.isSafeId(""));
  assert.ok(!ctx.isSafeId(42));
});
test("csvCell", ()=>{
  assert.strictEqual(ctx.csvCell("simple"), "simple");
  assert.strictEqual(ctx.csvCell('a;b "c"'), '"a;b ""c"""');
});

console.log("import OFX / QIF");
test("OFX v1 (SGML sans balises fermantes)", ()=>{
  const ofx = `OFXHEADER:100
DATA:OFXSGML
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260921
<TRNAMT>-42,90
<FITID>123
<NAME>CB CARREFOUR
<MEMO>PARIS 15
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260925120000[+2:CEST]
<TRNAMT>2500.00
<NAME>VIR SALAIRE &amp; PRIME
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
  assert.ok(ctx.looksLikeOfx(ofx));
  const rows = ctx.parseOfx(ofx);
  assert.strictEqual(rows.length, 2);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(rows[0])), { date:"2026-09-21", label:"CB CARREFOUR PARIS 15", amount:"-42,90" });
  assert.strictEqual(rows[1].date, "2026-09-25");
  assert.strictEqual(rows[1].label, "VIR SALAIRE & PRIME");
  assert.strictEqual(ctx.parseFrenchNumber(rows[1].amount), 2500);
});
test("OFX v2 (XML)", ()=>{
  const ofx = `<?xml version="1.0"?><OFX><STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20260102</DTPOSTED><TRNAMT>-5.5</TRNAMT><NAME>BOULANGERIE</NAME><MEMO>BOULANGERIE</MEMO></STMTTRN></OFX>`;
  const rows = ctx.parseOfx(ofx);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].label, "BOULANGERIE");
  assert.strictEqual(rows[0].date, "2026-01-02");
});
test("QIF jour/mois (français)", ()=>{
  const qif = "!Type:Bank\nD24/09/2026\nT-1 234,56\nPLOYER\nMseptembre\n^\nD01/10/26\nT15.00\nPREMBOURSEMENT\n^\n";
  assert.ok(ctx.looksLikeQif(qif));
  const rows = ctx.parseQif(qif);
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].date, "2026-09-24");
  assert.strictEqual(rows[0].label, "LOYER septembre");
  assert.strictEqual(ctx.parseFrenchNumber(rows[0].amount), -1234.56);
  assert.strictEqual(rows[1].date, "2026-10-01");
});
test("QIF mois/jour (américain) détecté", ()=>{
  const rows = ctx.parseQif("!Type:Bank\nD09/24'2026\nT-10\nPA\n^\nD10/01/2026\nT-3\nPB\n^");
  assert.strictEqual(rows[0].date, "2026-09-24");
  assert.strictEqual(rows[1].date, "2026-10-01");
});
test("un CSV n'est ni OFX ni QIF", ()=>{
  const csv = "Date;Libellé;Montant\n24/09/2026;CAFE;-2";
  assert.ok(!ctx.looksLikeOfx(csv) && !ctx.looksLikeQif(csv));
});

console.log("Fusion de versions (synchronisation)");
const J = (o)=>JSON.parse(JSON.stringify(o)); // objets créés dans le contexte vm → comparables
test("une catégorisation faite sur chaque appareil est conservée des deux côtés", ()=>{
  const local = { updatedAt: 200, transactions: [
    { id:"a", label:"A", amount:-1, categoryId:"c1", mt:150 },
    { id:"b", label:"B", amount:-2, categoryId:"", mt:10 } ], categories:[{ id:"c1", name:"X" }] };
  const remote = { updatedAt: 300, transactions: [
    { id:"a", label:"A", amount:-1, categoryId:"", mt:10 },
    { id:"b", label:"B", amount:-2, categoryId:"c2", mt:250 } ], categories:[{ id:"c2", name:"Y" }] };
  const m = J(ctx.mergeSyncedStates(local, remote, 1000));
  const byId = Object.fromEntries(m.transactions.map(t=>[t.id, t]));
  assert.strictEqual(byId.a.categoryId, "c1");
  assert.strictEqual(byId.b.categoryId, "c2");
  assert.deepStrictEqual(m.categories.map(c=>c.id).sort(), ["c1","c2"]);
});
test("données sans horodatage : une catégorie présente d'un seul côté n'est pas perdue", ()=>{
  const local = { updatedAt: 100, transactions: [{ id:"a", label:"A", amount:-1, categoryId:"c1", source:"manual" }] };
  const remote = { updatedAt: 500, transactions: [{ id:"a", label:"A", amount:-1, categoryId:"" }] };
  const m = J(ctx.mergeSyncedStates(local, remote, 1000));
  assert.strictEqual(m.transactions[0].categoryId, "c1");
});
test("une suppression (pierre tombale) l'emporte sur une version plus ancienne", ()=>{
  const local = { updatedAt: 100, transactions: [{ id:"a", label:"A", amount:-1, mt:50 }, { id:"n", label:"N", amount:-3, mt:90 }] };
  const remote = { updatedAt: 300, transactions: [], deleted: { "transactions:a": 200 } };
  const m = J(ctx.mergeSyncedStates(local, remote, 1000));
  assert.deepStrictEqual(m.transactions.map(t=>t.id), ["n"]); // « n » n'existe que localement : gardée
  assert.strictEqual(m.deleted["transactions:a"], 200);
});
test("une modification postérieure à la suppression fait revenir l'enregistrement", ()=>{
  const local = { updatedAt: 400, transactions: [{ id:"a", label:"A", amount:-1, mt:350 }] };
  const remote = { updatedAt: 300, transactions: [], deleted: { "transactions:a": 200 } };
  assert.strictEqual(ctx.mergeSyncedStates(local, remote, 1000).transactions.length, 1);
});
test("les commentaires des deux appareils sont réunis, sauf ceux supprimés", ()=>{
  const local = { updatedAt: 100, transactions: [{ id:"a", label:"A", amount:-1, mt:100, comments:[{ id:"k1", text:"un", at:1 }, { id:"k3", text:"trois", at:3 }] }] };
  const remote = { updatedAt: 200, transactions: [{ id:"a", label:"A", amount:-1, mt:200, comments:[{ id:"k2", text:"deux", at:2 }] }], deleted: { "comment:k3": 150 } };
  const m = J(ctx.mergeSyncedStates(local, remote, 1000));
  assert.deepStrictEqual(m.transactions[0].comments.map(c=>c.id), ["k1","k2"]);
});
test("une catégorie « récupérée » cède la place à la vraie", ()=>{
  const local = { updatedAt: 500, categories: [{ id:"c1", name:"Catégorie récupérée 1", recovered:true, mt:400 }] };
  const remote = { updatedAt: 100, categories: [{ id:"c1", name:"Courses", mt:50 }] };
  assert.strictEqual(ctx.mergeSyncedStates(local, remote, 1000).categories[0].name, "Courses");
});
test("les pierres tombales trop anciennes sont oubliées", ()=>{
  const now = 1000 * 86400000;
  const m = ctx.mergeSyncedStates({ updatedAt:1, deleted:{ "rules:x": 1 } }, { updatedAt:2, deleted:{ "rules:y": now - 1 } }, now);
  assert.deepStrictEqual(Object.keys(m.deleted), ["rules:y"]);
});

test("differsFrom : l'ordre des clés n'est pas une différence, une opération en plus si", ()=>{
  const a = { transactions:[{ id:"a", amount:-1, label:"x" }], openingBalances:{ k1:{ amount:1 }, k2:{ amount:2 } } };
  const b = { openingBalances:{ k2:{ amount:2 }, k1:{ amount:1 } }, transactions:[{ label:"x", id:"a", amount:-1 }] };
  assert.strictEqual(ctx.differsFrom(a, b), false);
  b.transactions.push({ id:"b", amount:-2, label:"y" });
  assert.strictEqual(ctx.differsFrom(a, b), true);
});
test("une opération perdue par Drive (écriture concurrente) est conservée à la fusion", ()=>{
  const local = { updatedAt: 100, transactions: [{ id:"a", mt:90 }, { id:"b", mt:95 }] };
  const remote = { updatedAt: 200, transactions: [{ id:"a", mt:90 }] }; // « b » écrasé, sans pierre tombale
  const m = ctx.mergeSyncedStates(local, remote, 1000);
  assert.deepStrictEqual(J(m.transactions).map(t=>t.id), ["a","b"]);
  assert.strictEqual(ctx.differsFrom(m, remote), true); // → à renvoyer vers Drive
});

console.log("Moyens de paiement et rapprochement");
test("détection du moyen de paiement d'après le libellé", ()=>{
  const methods = [
    { id:"card", keywords:"CB, CARTE" }, { id:"debit", keywords:"PRLV, PRÉLÈVEMENT" }, { id:"chq", keywords:"CHQ, CHEQUE" } ];
  assert.strictEqual(ctx.detectPaymentMethod("CB CARREFOUR 12/03", methods), "card");
  assert.strictEqual(ctx.detectPaymentMethod("PRLV SEPA EDF", methods), "debit");
  assert.strictEqual(ctx.detectPaymentMethod("Prélèvement mutuelle", methods), "debit");
  assert.strictEqual(ctx.detectPaymentMethod("CHQ 1234567", methods), "chq");
  assert.strictEqual(ctx.detectPaymentMethod("CBD SHOP", methods), ""); // mot entier seulement
});
test("rapprochement : même montant, la saisie la plus proche en date, une seule fois", ()=>{
  const manual = [ { id:"m1", amount:-50, date:"2026-03-01" }, { id:"m2", amount:-50, date:"2026-03-10" }, { id:"m3", amount:-20, date:"2026-03-05" } ];
  const entries = [ { amount:-50, date:"2026-03-11" }, { amount:-50, date:"2026-03-12" }, { amount:-20, date:"2026-06-30" }, null ];
  const r = ctx.matchManualEntries(entries, manual, 60).map(m=>m && m.id);
  assert.deepStrictEqual(r, ["m2", "m1", null, null]);
});

console.log("Tutoriel Google Drive");
test("le code du script affiché dans l'appli est celui de google-apps-script.gs", ()=>{
  const embedded = html.match(/<script type="text\/plain" id="appsScriptSource">([\s\S]*?)<\/script>/);
  assert.ok(embedded, "bloc appsScriptSource introuvable");
  const file = fs.readFileSync(path.join(__dirname, "..", "google-apps-script.gs"), "utf8");
  assert.strictEqual(embedded[1].trim(), file.trim());
});

console.log(`\n${passed} réussi(s), ${failed} échoué(s)`);
process.exit(failed ? 1 : 0);
