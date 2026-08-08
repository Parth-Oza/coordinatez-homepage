import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const outputDir = path.join(projectRoot, "docs");
const sourceUrl = process.env.EXPORT_SOURCE_URL ?? "http://localhost:3001";
const publicUrl = (process.env.GITHUB_PAGES_URL ?? "").replace(/\/$/, "");

const response = await fetch(`${sourceUrl}/`);
if (!response.ok) {
  throw new Error(`Could not render the homepage: ${response.status}`);
}

let html = await response.text();

await rm(outputDir, { recursive: true, force: true });
await cp(path.join(projectRoot, "dist", "client"), outputDir, {
  recursive: true,
});

html = html
  .replaceAll('href="/', 'href="./')
  .replaceAll('src="/', 'src="./')
  .replaceAll('href=\\"/', 'href=\\"./')
  .replaceAll(`${sourceUrl}/og.png`, publicUrl ? `${publicUrl}/og.png` : "./og.png");

const cssDirectory = path.join(outputDir, "_next", "static", "css");
for (const cssFile of await import("node:fs/promises").then(({ readdir }) =>
  readdir(cssDirectory),
)) {
  if (!cssFile.endsWith(".css")) continue;
  const cssPath = path.join(cssDirectory, cssFile);
  const css = await readFile(cssPath, "utf8");
  await writeFile(
    cssPath,
    css.replaceAll("url(/assets/", "url(../../../assets/"),
  );
}

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "index.html"), html);
await writeFile(path.join(outputDir, ".nojekyll"), "");

console.log(`GitHub Pages export ready in ${outputDir}`);
