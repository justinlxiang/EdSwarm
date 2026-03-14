import React from "react";

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const patterns: { idx: number; type: string; marker: string }[] = [];

    const boldIdx = remaining.indexOf("**");
    if (boldIdx !== -1) patterns.push({ idx: boldIdx, type: "bold", marker: "**" });

    const codeIdx = remaining.indexOf("`");
    if (codeIdx !== -1) patterns.push({ idx: codeIdx, type: "code", marker: "`" });

    const italicIdx = remaining.search(/(?<!\*)\*(?!\*)/);
    if (italicIdx !== -1) patterns.push({ idx: italicIdx, type: "italic", marker: "*" });

    if (patterns.length === 0) {
      nodes.push(remaining);
      break;
    }

    patterns.sort((a, b) => a.idx - b.idx);
    const first = patterns[0];

    if (first.idx > 0) {
      nodes.push(remaining.slice(0, first.idx));
    }

    const after = remaining.slice(first.idx + first.marker.length);
    const endIdx = first.type === "bold"
      ? after.indexOf("**")
      : first.type === "code"
        ? after.indexOf("`")
        : after.search(/(?<!\*)\*(?!\*)/);

    if (endIdx === -1) {
      nodes.push(remaining.slice(first.idx));
      break;
    }

    const inner = after.slice(0, endIdx);

    if (first.type === "bold") {
      nodes.push(<strong key={key++} className="font-semibold">{inner}</strong>);
    } else if (first.type === "code") {
      nodes.push(
        <code key={key++} className="px-1 py-0.5 rounded bg-black/5 text-[0.9em] font-mono">
          {inner}
        </code>
      );
    } else {
      nodes.push(<em key={key++}>{inner}</em>);
    }

    remaining = after.slice(endIdx + first.marker.length);
  }

  return nodes;
}

interface Props {
  text: string;
  className?: string;
}

export function SimpleMarkdown({ text, className }: Props) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let blockquoteLines: string[] = [];
  let key = 0;

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="list-disc list-outside pl-4 space-y-0.5">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  }

  function flushBlockquote() {
    if (blockquoteLines.length > 0) {
      elements.push(
        <blockquote
          key={key++}
          className="border-l-2 border-primary/30 pl-3 text-foreground/70 italic"
        >
          {blockquoteLines.map((l, i) => (
            <p key={i}>{parseInline(l)}</p>
          ))}
        </blockquote>
      );
      blockquoteLines = [];
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      flushBlockquote();
      continue;
    }

    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      flushList();
      flushBlockquote();
      elements.push(<hr key={key++} className="border-border/40 my-1" />);
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      flushList();
      blockquoteLines.push(trimmed.replace(/^>\s?/, ""));
      continue;
    } else {
      flushBlockquote();
    }

    if (/^#{1,3}\s/.test(trimmed)) {
      flushList();
      const level = trimmed.match(/^(#{1,3})\s/)![1].length;
      const heading = trimmed.replace(/^#{1,3}\s+/, "");
      elements.push(
        <p
          key={key++}
          className={
            level === 1
              ? "font-bold text-foreground text-[1.1em]"
              : level === 2
                ? "font-semibold text-foreground"
                : "font-medium text-foreground"
          }
        >
          {parseInline(heading)}
        </p>
      );
    } else if (/^\s*[-*]\s/.test(line)) {
      const indent = line.search(/\S/);
      const content = trimmed.replace(/^[-*]\s+/, "");
      if (indent >= 2) {
        listItems.push(
          <li key={key++} className="ml-4 list-[circle]">
            {parseInline(content)}
          </li>
        );
      } else {
        listItems.push(<li key={key++}>{parseInline(content)}</li>);
      }
    } else if (/^\d+\.\s/.test(trimmed)) {
      flushList();
      const content = trimmed.replace(/^\d+\.\s+/, "");
      elements.push(
        <p key={key++}>
          {trimmed.match(/^(\d+\.)\s/)![1]} {parseInline(content)}
        </p>
      );
    } else {
      flushList();
      elements.push(<p key={key++}>{parseInline(trimmed)}</p>);
    }
  }

  flushList();
  flushBlockquote();

  return <div className={className}>{elements}</div>;
}
