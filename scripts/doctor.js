import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "package.json",
  "package-lock.json",
  "index.html",
  "vite.config.ts",
  "server/index.js",
  "src/main.tsx",
  "src/App.tsx",
];
const requiredPackages = [
  "@vitejs/plugin-react",
  "vite",
  "typescript",
  "concurrently",
  "react",
  "react-dom",
  "react-router-dom",
  "express",
  "cors",
];

const fail = (message) => {
  console.error(`\n❌ ${message}`);
  process.exitCode = 1;
};

const major = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
if (major < 20) fail(`Node.js 20+ is required. Current version: ${process.version}`);

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) fail(`Missing required file: ${file}`);
}

const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
if (!pkg.scripts?.dev) fail("package.json is missing the dev script.");

for (const name of requiredPackages) {
  if (!pkg.dependencies?.[name] && !pkg.devDependencies?.[name]) fail(`Missing dependency: ${name}`);
}

const submissionsDir = path.join(root, "submissions");
try {
  fs.mkdirSync(submissionsDir, { recursive: true });
  fs.accessSync(submissionsDir, fs.constants.W_OK);
} catch (error) {
  fail(`Cannot write to submissions folder: ${error.message}`);
}

if (!process.exitCode) {
  console.log("✅ Setup looks correct.");
  console.log("Run: npm run dev");
  console.log("Open: http://localhost:8080");
}