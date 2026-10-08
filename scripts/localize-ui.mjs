// One-time migration helper; only known interface copy is localized, never business data.
import fs from "node:fs";
import ts from "typescript";

const files = [
  "src/components/workspace.tsx",
  "src/components/invoice-form.tsx",
  "src/components/business-settings.tsx",
  "src/components/invoice-document.tsx",
];
const catalog = fs.readFileSync("src/lib/translations.ts", "utf8");
const known = new Set();
const catalogAst = ts.createSourceFile("catalog.ts", catalog, ts.ScriptTarget.Latest, true);
function keys(node) {
  if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.name)) known.add(node.name.text);
  if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) known.add(node.name.text);
  ts.forEachChild(node, keys);
}
keys(catalogAst);

for (const file of files) {
  let source = fs.readFileSync(file, "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const changes = [];
  const limit = file.endsWith("workspace.tsx") ? source.indexOf("export function InvoiceFormNonaktif") : source.length;
  function visit(node) {
    if (node.pos >= limit) return;
    if (ts.isJsxText(node)) {
      const text = node.getText(ast);
      const trimmed = text.trim();
      if (known.has(trimmed)) changes.push({ start: node.getStart(ast), end: node.end, text: text.replace(trimmed, `{t(${JSON.stringify(trimmed)})}`) });
    }
    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer) && ["title", "placeholder", "aria-label", "alt", "label"].includes(node.name.text) && known.has(node.initializer.text)) {
      changes.push({ start: node.initializer.getStart(ast), end: node.initializer.end, text: `{t(${JSON.stringify(node.initializer.text)})}` });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  changes.sort((a, b) => b.start - a.start).forEach(change => { source = source.slice(0, change.start) + change.text + source.slice(change.end); });
  const importAt = source.indexOf("import ");
  source = source.slice(0, importAt) + 'import { useLanguage } from "@/components/language-provider";\n' + source.slice(importAt);
  const functions = file.endsWith("workspace.tsx") ? ["Workspace", "Dialog"] : file.endsWith("invoice-form.tsx") ? ["CustomerLookup", "InvoiceForm"] : file.endsWith("business-settings.tsx") ? ["BusinessSettingsForm"] : ["InvoiceDocument"];
  for (const name of functions) {
    const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const fn = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    const position = fn.body.getStart(parsed) + 1;
    source = source.slice(0, position) + '\n  const { t, language } = useLanguage();\n' + source.slice(position);
  }
  fs.writeFileSync(file, source);
}
