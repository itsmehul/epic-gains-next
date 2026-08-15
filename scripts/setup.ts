import inquirer from "inquirer";
import { constants } from "node:fs";
import { access, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

async function exists(filePath: string) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const root = process.cwd();
  const envPath = path.join(root, ".env");
  const examplePath = path.join(root, ".env.example");

  const answers = await inquirer.prompt<{
    createEnv: boolean;
    appName: string;
  }>([
    {
      type: "input",
      name: "appName",
      message: "App display name",
      default: "Epic Gains",
    },
    {
      type: "confirm",
      name: "createEnv",
      message: "Create .env from .env.example if missing?",
      default: true,
    },
  ]);

  if (answers.createEnv && !(await exists(envPath))) {
    await copyFile(examplePath, envPath);
    console.log("Created .env from .env.example");
  } else if (await exists(envPath)) {
    console.log(".env already exists — left untouched");
  }

  await mkdir(path.join(root, "public", "logos", "favicon_io"), {
    recursive: true,
  });

  console.log(`
Ready, ${answers.appName}.

Next:
  1. pnpm db:up
  2. pnpm db:migrate
  3. pnpm dev
  4. (optional) pnpm workflows:worker
`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
