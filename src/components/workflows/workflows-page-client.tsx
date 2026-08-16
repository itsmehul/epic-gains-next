"use client";

import { useState } from "react";

import { AppShellBody, AppShellHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InvocableWorkflowMeta } from "@/features/workflows/invocable";
import {
  useStartWorkflow,
  useWorkflowRun,
  useWorkflowRuns,
} from "@/features/workflows/hooks";
import { parseWorkflowTimeline } from "@/features/workflows/timeline";
import { Badge } from "@/components/ui/badge";

type WorkflowsPageClientProps = {
  invocableWorkflows: InvocableWorkflowMeta[];
};

export function WorkflowsPageClient({
  invocableWorkflows,
}: WorkflowsPageClientProps) {
  const hello = invocableWorkflows.find((item) => item.id === "hello");
  const [name, setName] = useState("World");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const runsQuery = useWorkflowRuns({
    workflowId: "hello",
    pollingEnabled: true,
  });
  const startMutation = useStartWorkflow();
  const runDetailQuery = useWorkflowRun(selectedRunId, {
    pollingEnabled: true,
  });

  const timeline = runDetailQuery.data
    ? parseWorkflowTimeline({
        timeline: runDetailQuery.data.run.timeline ?? {},
        currentStepId: runDetailQuery.data.run.currentStepId,
        runStatus: runDetailQuery.data.run.status,
      })
    : [];

  async function onInvoke() {
    if (!hello) return;
    const result = await startMutation.mutateAsync({
      workflowId: "hello",
      input: { name: name.trim() || "World" },
    });
    setSelectedRunId(result.runId);
  }

  return (
    <>
      <AppShellHeader title="Workflows" />
      <AppShellBody className="gap-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>{hello?.label ?? "Hello workflow"}</CardTitle>
            <CardDescription>
              {hello?.description ??
                "Invoke the sample pg-workflows job via API + TanStack Query."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="hello-name">Name</Label>
              <Input
                id="hello-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="World"
              />
            </div>
            <Button
              disabled={startMutation.isPending}
              onClick={() => void onInvoke()}
            >
              {startMutation.isPending ? "Starting…" : "Invoke"}
            </Button>
          </CardContent>
          {startMutation.error ? (
            <p className="px-6 pb-4 text-sm text-destructive">
              {startMutation.error.message}
            </p>
          ) : null}
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent runs</CardTitle>
              <CardDescription>Polled via TanStack Query</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {runsQuery.isLoading ? (
                <div
                  aria-busy="true"
                  aria-label="Loading"
                  className="flex justify-center py-4"
                  role="status"
                >
                  <Spinner className="size-6" />
                </div>
              ) : null}
              {runsQuery.error ? (
                <p className="text-sm text-destructive">
                  {runsQuery.error.message}
                </p>
              ) : null}
              {(runsQuery.data?.items ?? []).map((run) => (
                <button
                  key={run.id}
                  type="button"
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted/50"
                  onClick={() => setSelectedRunId(run.id)}
                >
                  <span className="truncate font-mono text-xs">{run.id}</span>
                  <Badge variant="secondary">{run.status}</Badge>
                </button>
              ))}
              {!runsQuery.isLoading &&
              (runsQuery.data?.items.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No runs yet. Invoke hello above.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Run timeline</CardTitle>
              <CardDescription>
                {selectedRunId
                  ? `Selected ${selectedRunId}`
                  : "Select a run to inspect steps"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {runDetailQuery.isLoading ? (
                <div
                  aria-busy="true"
                  aria-label="Loading"
                  className="flex justify-center py-4"
                  role="status"
                >
                  <Spinner className="size-6" />
                </div>
              ) : null}
              {runDetailQuery.data ? (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge>{runDetailQuery.data.run.status}</Badge>
                    <span className="text-muted-foreground">
                      {runDetailQuery.data.progress.completionPercentage}%
                    </span>
                  </div>
                  {timeline.map((step) => (
                    <div
                      key={step.id}
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{step.label}</span>
                        <Badge variant="outline">{step.status}</Badge>
                      </div>
                      {step.output !== undefined ? (
                        <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">
                          {JSON.stringify(step.output, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ))}
                  {runDetailQuery.data.run.output != null ? (
                    <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
                      {JSON.stringify(runDetailQuery.data.run.output, null, 2)}
                    </pre>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Timeline appears after you select a run.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </AppShellBody>
    </>
  );
}
