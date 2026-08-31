type LcConstructor = {
  lc: 1;
  type: "constructor";
  id: string[];
  kwargs: Record<string, unknown>;
};

export type PromptHubEntry = {
  name: string;
  description: string;
  tags: string[];
  role: "system" | "human";
  template: string;
  inputVariables: string[];
};

export function chatPromptManifest(entry: PromptHubEntry): LcConstructor {
  const messageId =
    entry.role === "system"
      ? ["langchain_core", "prompts", "chat", "SystemMessagePromptTemplate"]
      : ["langchain_core", "prompts", "chat", "HumanMessagePromptTemplate"];

  return {
    lc: 1,
    type: "constructor",
    id: ["langchain", "prompts", "chat", "ChatPromptTemplate"],
    kwargs: {
      input_variables: entry.inputVariables,
      messages: [
        {
          lc: 1,
          type: "constructor",
          id: messageId,
          kwargs: {
            prompt: {
              lc: 1,
              type: "constructor",
              id: ["langchain_core", "prompts", "prompt", "PromptTemplate"],
              kwargs: {
                input_variables: entry.inputVariables,
                template_format: "mustache",
                template: entry.template,
              },
            },
          },
        },
      ],
    },
  };
}

export function extractPromptTemplates(manifest: unknown): string[] {
  const texts: string[] = [];

  function walk(node: unknown) {
    if (!node || typeof node !== "object") return;
    const kwargs = (node as { kwargs?: Record<string, unknown> }).kwargs;
    if (!kwargs) return;
    if (typeof kwargs.template === "string") texts.push(kwargs.template);
    walk(kwargs.prompt);
    walk(kwargs.first);
    if (Array.isArray(kwargs.messages)) {
      for (const message of kwargs.messages) walk(message);
    }
  }

  walk(manifest);
  return texts;
}

export function extractPrimaryTemplate(manifest: unknown): string | null {
  return extractPromptTemplates(manifest)[0] ?? null;
}
