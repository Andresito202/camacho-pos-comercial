import { execFileSync } from "node:child_process";

const envTemplates = new Set([".env.example", ".env.template", ".env.sample"]);
const generatedDirectories = new Set([".next", ".vercel", ".cache", "node_modules"]);
const localKeyFiles = /(?:\.(?:key|p12|pfx|jks|keystore)$)|^(?:id_rsa|id_ed25519)$/i;
const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0");

for (const path of paths.filter(Boolean)) {
  const parts = path.split("/");
  const name = parts.at(-1);
  const generated = parts.some((part) => generatedDirectories.has(part)) || path.startsWith("apps/web/out/");
  const localEnv = name === ".env" || (name.startsWith(".env.") && !envTemplates.has(name));
  if (generated || localEnv || localKeyFiles.test(name)) {
    console.error("Forbidden tracked deployment file", JSON.stringify(path));
    process.exitCode = 1;
  }
}
