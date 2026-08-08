"use client";

import { CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from "@lexical/markdown";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { $getRoot } from "lexical";
import { useEffect, useRef } from "react";

import { cn } from "@/shared/utils";

const editorTheme = {
  paragraph: "mb-2",
  heading: {
    h1: "mb-3 text-2xl font-bold tracking-tight",
    h2: "mt-6 mb-2 text-xl font-semibold",
    h3: "mt-4 mb-1.5 text-lg font-semibold",
  },
  list: {
    ul: "my-2 list-disc pl-5",
    ol: "my-2 list-decimal pl-5",
    listitem: "my-0.5",
  },
  text: {
    bold: "font-semibold",
    italic: "italic",
    underline: "underline",
    code: "rounded bg-muted px-1 py-0.5 font-mono text-sm",
  },
  quote: "my-3 border-l-2 border-border pl-3 text-muted-foreground",
  link: "text-primary underline underline-offset-2",
};

function MarkdownValuePlugin({
  value,
  disabled,
  lastEmittedRef,
}: {
  value: string;
  disabled: boolean;
  lastEmittedRef: React.MutableRefObject<string | null>;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (value === lastEmittedRef.current) {
      return;
    }

    const currentMarkdown = editor.getEditorState().read(() =>
      $convertToMarkdownString(TRANSFORMERS),
    );

    if (currentMarkdown !== value) {
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        if (value.trim()) {
          $convertFromMarkdownString(value, TRANSFORMERS);
        }
      });
    }
  }, [editor, value, lastEmittedRef]);

  return null;
}

type MarkdownEditorProps = {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

export function MarkdownEditor({
  value = "",
  onChange,
  disabled = false,
  className,
  placeholder = "Write markdown…",
}: MarkdownEditorProps) {
  const initialValueRef = useRef(value);
  const lastEmittedRef = useRef<string | null>(null);

  const initialConfig = {
    namespace: "AiContextMarkdownEditor",
    theme: editorTheme,
    editable: !disabled,
    onError(error: Error) {
      console.error(error);
    },
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      LinkNode,
    ],
    editorState: () => {
      const markdown = initialValueRef.current;
      if (markdown.trim()) {
        $convertFromMarkdownString(markdown, TRANSFORMERS);
      }
    },
  };

  return (
    <div
      className={cn(
        "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background",
        disabled && "cursor-not-allowed opacity-70",
        className,
      )}
    >
      <LexicalComposer initialConfig={initialConfig}>
        <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                aria-placeholder={placeholder}
                className="min-h-full outline-none leading-relaxed"
                placeholder={
                  <div className="pointer-events-none absolute top-4 left-4 text-muted-foreground">
                    {placeholder}
                  </div>
                }
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <MarkdownValuePlugin
            disabled={disabled}
            lastEmittedRef={lastEmittedRef}
            value={value}
          />
          <OnChangePlugin
            ignoreSelectionChange
            onChange={(editorState) => {
              if (disabled) {
                return;
              }

              editorState.read(() => {
                const markdown = $convertToMarkdownString(TRANSFORMERS);
                lastEmittedRef.current = markdown;
                onChange?.(markdown);
              });
            }}
          />
        </div>
      </LexicalComposer>
    </div>
  );
}
