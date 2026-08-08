import { WorkflowsPageClient } from "@/components/workflows/workflows-page-client";
import { getInvocableWorkflowMeta } from "@/features/workflows/invocable";

export default function WorkflowsPage() {
  const invocableWorkflows = getInvocableWorkflowMeta();

  return <WorkflowsPageClient invocableWorkflows={invocableWorkflows} />;
}
