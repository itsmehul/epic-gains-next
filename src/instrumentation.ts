import { registerTelemetry } from "ai";
import { braintrustAISDKTelemetry, initLogger } from "braintrust";

export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge"
  ) {
    if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.BRAINTRUST_API_KEY) {
      const { config } = await import("dotenv");
      const { join } = await import("node:path");
      config({ path: join(process.cwd(), ".env.braintrust") });
    }

    initLogger({
      projectName: "My Project",
    });
    registerTelemetry(braintrustAISDKTelemetry());
  }

  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.warn(
      "[workflows] DATABASE_URL is not set; skipping workflow engine startup",
    );
    return;
  }

  const { startWorkflowEngine } = await import(
    "@/infrastructure/workflows/engine"
  );
  await startWorkflowEngine();
}
