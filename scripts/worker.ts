import "dotenv/config";

import { startWorkflowEngine } from "../src/infrastructure/workflows/engine";

async function main() {
  await startWorkflowEngine();
  console.log("pg-workflows engine is running");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
