"use client";

import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Renders text with LaTeX math support.
 * - $...$ for inline math
 * - $$...$$ for block/display math
 */
export function TextWithMath({
  text,
  className,
  as: Component = "span",
}: {
  text: string;
  className?: string;
  as?: "span" | "div" | "p";
}) {
  const nodes = parseTextWithMath(text);
  return <Component className={className}>{nodes}</Component>;
}

let keyCounter = 0;

function parseTextWithMath(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const blockRe = /\$\$([\s\S]*?)\$\$/g;

  function processInline(segment: string): React.ReactNode[] {
    const result: React.ReactNode[] = [];
    const inlineRe = /\$([^$\n]+?)\$/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = inlineRe.exec(segment)) !== null) {
      if (match.index > lastIndex) {
        result.push(segment.slice(lastIndex, match.index));
      }
      result.push(
        <span
          key={keyCounter++}
          dangerouslySetInnerHTML={{
            __html: katex.renderToString(match[1].trim(), {
              throwOnError: false,
              displayMode: false,
            }),
          }}
        />
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < segment.length) {
      result.push(segment.slice(lastIndex));
    }
    return result.length ? result : [segment];
  }

  const blockParts = text.split(blockRe);
  if (blockParts.length > 1) {
    for (let i = 0; i < blockParts.length; i++) {
      if (i % 2 === 1) {
        nodes.push(
          <span
            key={keyCounter++}
            className="block my-2 overflow-x-auto"
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(blockParts[i].trim(), {
                throwOnError: false,
                displayMode: true,
              }),
            }}
          />
        );
      } else if (blockParts[i]) {
        nodes.push(...processInline(blockParts[i]));
      }
    }
  } else {
    nodes.push(...processInline(text));
  }

  return nodes;
}
