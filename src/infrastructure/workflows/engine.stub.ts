export function getWorkflowEngine(): never {
  throw new Error("Workflow engine is only available on the Node.js runtime");
}

export function startWorkflowEngine(): Promise<never> {
  return Promise.reject(
    new Error("Workflow engine is only available on the Node.js runtime"),
  );
}
