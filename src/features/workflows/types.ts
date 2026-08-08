export type WorkflowRunSummary = {
  id: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  resourceId: string | null;
  workflowId: string;
  status: string;
  currentStepId: string;
  error: string | null;
  retryCount: number;
  maxRetries: number;
  jobId: string | null;
  userEmail: string | null;
};

export type ListWorkflowRunsResult = {
  items: WorkflowRunSummary[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  hasPrev: boolean;
};
