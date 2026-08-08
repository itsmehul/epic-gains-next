export async function register() {
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
