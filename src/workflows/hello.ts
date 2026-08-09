import { workflow } from "pg-workflows";
import { z } from "zod";

export const helloWorkflow = workflow(
  "hello",
  async ({ step, input }) => {
    const message = await step.run("greet", async () => {
      return `Hello, ${input.name}!`;
    });

    return { message };
  },
  {
    inputSchema: z.object({
      name: z.string().min(1).default("World"),
    }),
    // schedule: "*/30 * * * * *",
  },
);
