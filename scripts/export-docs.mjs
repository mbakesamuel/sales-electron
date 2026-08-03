import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { mdToPdf } from "md-to-pdf";
import HTMLtoDOCX from "html-to-docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const docsRoot = path.join(root, "docs");
const exportDir = path.join(docsRoot, "export");

const USER_CHAPTERS = [
  "00-overview.md",
  "01-getting-started.md",
  "02-organization-setup.md",
  "03-customers-products.md",
  "04-sales-invoices.md",
  "05-delivery-orders.md",
  "06-inventory-stock.md",
  "07-sales-budgets.md",
  "08-reports.md",
  "09-users-permissions.md",
  "10-troubleshooting.md",
];

const DEVELOPER_CHAPTERS = [
  "00-overview.md",
  "01-architecture.md",
  "02-dev-setup.md",
  "03-database-migrations.md",
  "04-auth-permissions.md",
  "05-domain-modules.md",
  "06-reports-engine.md",
  "07-ipc-and-preload.md",
  "08-ui-structure.md",
  "09-build-and-packaging.md",
];

const PRINT_CSS = `
  body {
    font-family: "Segoe UI", Calibri, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.45;
    color: #1a1a1a;
    max-width: 100%;
  }
  h1 { font-size: 20pt; margin-top: 0; page-break-before: avoid; }
  h2 { font-size: 14pt; margin-top: 1.4em; border-bottom: 1px solid #ccc; padding-bottom: 0.2em; }
  h3 { font-size: 12pt; margin-top: 1.1em; }
  table { border-collapse: collapse; width: 100%; margin: 0.8em 0; font-size: 10pt; }
  th, td { border: 1px solid #bbb; padding: 4px 8px; text-align: left; vertical-align: top; }
  th { background: #f0f0f0; }
  code { font-family: Consolas, "Courier New", monospace; font-size: 9.5pt; background: #f5f5f5; padding: 0 3px; }
  pre { background: #f5f5f5; padding: 10px; overflow-x: auto; font-size: 9pt; border: 1px solid #ddd; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 3px solid #ccc; margin-left: 0; padding-left: 1em; color: #444; }
  a { color: #0645ad; text-decoration: none; }
  hr.chapter-break { border: none; border-top: 1px solid #ddd; margin: 2em 0; page-break-before: always; }
  .title-page { text-align: center; margin: 3em 0 2em; }
  .title-page h1 { font-size: 26pt; border: none; }
  .title-page p { color: #555; }
`;

/**
 * @param {string} markdown
 */
function rewriteRelativeLinks(markdown) {
  return markdown
    .replace(
      /\[([^\]]+)\]\(\.\.\/(?:user-guide|developer-guide)\/([^)#]+)(?:#[^)]*)?\)/g,
      "$1 ($2)",
    )
    .replace(/\[([^\]]+)\]\(([^)]+\.md)(?:#[^)]*)?\)/g, (_m, label, href) => {
      if (/^https?:\/\//i.test(href)) return `[${label}](${href})`;
      const base = path.basename(href, ".md");
      return `${label} (${base})`;
    })
    .replace(/\[([^\]]+)\]\(\.\.\/README\.md\)/g, "$1 (project README)")
    .replace(/\[([^\]]+)\]\(\.\.\/\.\.\/([^)]+)\)/g, "$1 ($2)");
}

/**
 * @param {string} guideDir
 * @param {string[]} chapters
 * @param {string} title
 */
function concatGuide(guideDir, chapters, title) {
  const parts = [
    `# ${title}\n\n*Sales Management Application — generated from markdown sources.*\n`,
  ];

  for (let i = 0; i < chapters.length; i++) {
    const file = chapters[i];
    const full = path.join(guideDir, file);
    if (!fs.existsSync(full)) {
      throw new Error(`Missing chapter: ${full}`);
    }
    let body = fs.readFileSync(full, "utf8").trim();
    body = rewriteRelativeLinks(body);
    if (i > 0) {
      parts.push("\n\n<hr class=\"chapter-break\" />\n\n");
    }
    parts.push(body);
    parts.push("\n");
  }

  return parts.join("\n");
}

/**
 * @param {string} markdown
 */
function markdownToHtmlDocument(markdown, title) {
  const body = marked.parse(markdown, { async: false });
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
${body}
</body>
</html>`;
}

/**
 * @param {string} markdown
 * @param {string} pdfPath
 * @param {string} title
 */
async function writePdf(markdown, pdfPath, title) {
  const result = await mdToPdf(
    { content: markdown },
    {
      dest: pdfPath,
      pdf_options: {
        format: "A4",
        margin: { top: "18mm", right: "16mm", bottom: "18mm", left: "16mm" },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `<div style="font-size:8pt;width:100%;text-align:center;color:#666;">${title}</div>`,
        footerTemplate:
          '<div style="font-size:8pt;width:100%;text-align:center;color:#666;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      },
      css: PRINT_CSS,
    },
  );
  if (!result) {
    throw new Error(`PDF generation failed for ${pdfPath}`);
  }
}

/**
 * @param {string} html
 * @param {string} docxPath
 * @param {string} title
 */
async function writeDocx(html, docxPath, title) {
  const buffer = await HTMLtoDOCX(html, null, {
    title,
    margins: { top: 720, right: 720, bottom: 720, left: 720 },
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true,
  });
  fs.writeFileSync(docxPath, buffer);
}

/**
 * @param {{ title: string, basename: string, markdown: string }} guide
 */
async function exportGuide(guide) {
  const pdfPath = path.join(exportDir, `${guide.basename}.pdf`);
  const docxPath = path.join(exportDir, `${guide.basename}.docx`);
  const html = markdownToHtmlDocument(guide.markdown, guide.title);

  console.log(`Writing ${path.relative(root, pdfPath)} …`);
  await writePdf(guide.markdown, pdfPath, guide.title);

  console.log(`Writing ${path.relative(root, docxPath)} …`);
  await writeDocx(html, docxPath, guide.title);
}

async function main() {
  fs.mkdirSync(exportDir, { recursive: true });

  const userMd = concatGuide(
    path.join(docsRoot, "user-guide"),
    USER_CHAPTERS,
    "Sales Management Application — User Guide",
  );
  const developerMd = concatGuide(
    path.join(docsRoot, "developer-guide"),
    DEVELOPER_CHAPTERS,
    "Sales Management Application — Developer Guide",
  );

  // Intermediate concatenated markdown (handy for debugging; not gitignored individually)
  fs.writeFileSync(
    path.join(exportDir, "Sales-Management-Application-User-Guide.md"),
    userMd,
    "utf8",
  );
  fs.writeFileSync(
    path.join(exportDir, "Sales-Management-Application-Developer-Guide.md"),
    developerMd,
    "utf8",
  );

  await exportGuide({
    title: "Sales Management Application — User Guide",
    basename: "Sales-Management-Application-User-Guide",
    markdown: userMd,
  });
  await exportGuide({
    title: "Sales Management Application — Developer Guide",
    basename: "Sales-Management-Application-Developer-Guide",
    markdown: developerMd,
  });

  console.log(`Done. Files in ${path.relative(root, exportDir)}/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
