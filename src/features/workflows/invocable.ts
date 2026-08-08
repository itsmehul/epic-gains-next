import { createWorkflowRef } from "pg-workflows/client";
import { z } from "zod";

export type InvocableField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "json";
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number;
};

export type InvocableWorkflowMeta = {
  id: string;
  label: string;
  description: string;
  fields: InvocableField[];
};

const helloWorkflowRef = createWorkflowRef("hello", {
  inputSchema: z.object({
    name: z.string().min(1),
  }),
});

const invocableWorkflows: Array<
  InvocableWorkflowMeta & {
    ref: typeof helloWorkflowRef;
  }
> = [
  {
    id: "hello",
    label: "Hello workflow",
    description: "Simple test workflow that greets by name.",
    fields: [
      {
        name: "name",
        label: "Name",
        type: "text",
        required: true,
        placeholder: "World",
      },
    ],
    ref: helloWorkflowRef,
  },
];

const invocableWorkflowById = new Map(
  invocableWorkflows.map((workflow) => [workflow.id, workflow]),
);

export function getInvocableWorkflowMeta(): InvocableWorkflowMeta[] {
  return invocableWorkflows.map(({ id, label, description, fields }) => ({
    id,
    label,
    description,
    fields,
  }));
}

export function getInvocableWorkflow(workflowId: string) {
  return invocableWorkflowById.get(workflowId);
}
