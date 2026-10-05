// Post-build: calls the SSR handler once for "/" and writes dist/client/index.html.
// This is needed because TanStack Start generates HTML at request time, not build time.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = resolve(__dirname, "../dist/server/server.js");

const { default: handler } = await import(serverPath);

const response = await handler.fetch(new Request("http://localhost/"), {}, {});

const contentType = response.headers.get("content-type") ?? "";
if (!contentType.includes("text/html")) {
  console.error("SSR returned unexpected content-type:", contentType);
  process.exit(1);
}

const html = await response.text();
const outPath = resolve(__dirname, "../dist/client/index.html");
writeFileSync(outPath, html);
console.log("Generated dist/client/index.html (" + html.length + " bytes)");
