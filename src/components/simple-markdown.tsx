import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

const THREAD_LINK_RE = /\[([^\]]+)\]\((thread:(\d+):(\d+))\)/g;

function parseInline(
  text: string,
  options?: { onThreadLink?: (courseId: number, threadId: number) => void; keyRef?: { current: number } }
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  const keyRef = options?.keyRef ?? { current: 0 };
  const key = () => keyRef.current++;

  // First, handle thread links - they take precedence
  const re = new RegExp(THREAD_LINK_RE.source, "g");
  const threadMatch = re.exec(remaining);
  if (threadMatch) {
    const allMatches: RegExpExecArray[] = [threadMatch];
    let m: RegExpExecArray | null;
    while ((m = re.exec(remaining)) !== null) allMatches.push(m);
    let lastIndex = 0;
    for (const match of allMatches) {
      if (match.index > lastIndex) {
        nodes.push(
          ...parseInline(remaining.slice(lastIndex, match.index), { keyRef })
        );
      }
      const [, linkText, , courseIdStr, threadIdStr] = match;
      const courseId = parseInt(courseIdStr, 10);
      const threadId = parseInt(threadIdStr, 10);
      if (options?.onThreadLink) {
        const handler = options.onThreadLink;
        nodes.push(
          <button
            key={key()}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handler(courseId, threadId);
            }}
            className="text-primary hover:underline font-medium cursor-pointer bg-transparent border-none p-0 font-inherit text-inherit align-baseline"
          >
            {linkText}
          </button>
        );
      } else {
        nodes.push(
          <span key={key()} className="font-medium text-primary/70">
            {linkText}
          </span>
        );
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < remaining.length) {
      nodes.push(...parseInline(remaining.slice(lastIndex), { keyRef }));
    }
    return nodes;
  }

  while (remaining.length > 0) {
    // LaTeX: $$...$$ (block) and $...$ (inline) - check before bold/code/italic
    const blockMatch = remaining.match(/\$\$([\s\S]*?)\$\$/);
    const inlineMatch = remaining.match(/\$([^$\n]+?)\$/);
    const blockIdx = blockMatch ? remaining.indexOf("$$") : -1;
    const inlineIdx = inlineMatch ? remaining.indexOf("$") : -1;

    if (blockIdx !== -1 && (inlineIdx === -1 || blockIdx <= inlineIdx)) {
      const endIdx = remaining.indexOf("$$", blockIdx + 2) + 2;
      if (blockIdx > 0) {
        nodes.push(...parseInline(remaining.slice(0, blockIdx), { keyRef }));
      }
      nodes.push(
        <span
          key={key()}
          className="block my-2 overflow-x-auto [&_.katex]:text-[1em]"
          dangerouslySetInnerHTML={{
            __html: katex.renderToString(blockMatch![1].trim(), {
              throwOnError: false,
              displayMode: true,
            }),
          }}
        />
      );
      remaining = remaining.slice(endIdx);
      continue;
    }
    if (inlineIdx !== -1) {
      const endIdx = remaining.indexOf("$", inlineIdx + 1) + 1;
      if (inlineIdx > 0) {
        nodes.push(...parseInline(remaining.slice(0, inlineIdx), { keyRef }));
      }
      nodes.push(
        <span
          key={key()}
          className="[&_.katex]:text-[0.95em]"
          dangerouslySetInnerHTML={{
            __html: katex.renderToString(inlineMatch![1].trim(), {
              throwOnError: false,
              displayMode: false,
            }),
          }}
        />
      );
      remaining = remaining.slice(endIdx);
      continue;
    }

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
      nodes.push(<strong key={key()} className="font-semibold">{inner}</strong>);
    } else if (first.type === "code") {
      nodes.push(
        <code key={key()} className="px-1 py-0.5 rounded bg-black/5 text-[0.9em] font-mono">
          {inner}
        </code>
      );
    } else {
      nodes.push(<em key={key()}>{inner}</em>);
    }

    remaining = after.slice(endIdx + first.marker.length);
  }

  return nodes;
}

interface Props {
  text: string;
  className?: string;
  onThreadLinkClick?: (courseId: number, threadId: number) => void;
}

export function SimpleMarkdown({ text, className, onThreadLinkClick }: Props) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let blockquoteLines: string[] = [];
  let key = 0;
  const inlineKeyRef = { current: 0 };
  const parseOpts = onThreadLinkClick
    ? { onThreadLink: onThreadLinkClick, keyRef: inlineKeyRef }
    : { keyRef: inlineKeyRef };

  function parse(content: string) {
    return parseInline(content, parseOpts);
  }

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
            <p key={i}>{parse(l)}</p>
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
          {parse(heading)}
        </p>
      );
    } else if (/^\s*[-*]\s/.test(line)) {
      const indent = line.search(/\S/);
      const content = trimmed.replace(/^[-*]\s+/, "");
      if (indent >= 2) {
        listItems.push(
          <li key={key++} className="ml-4 list-[circle]">
            {parse(content)}
          </li>
        );
      } else {
        listItems.push(<li key={key++}>{parse(content)}</li>);
      }
    } else if (/^\d+\.\s/.test(trimmed)) {
      flushList();
      const content = trimmed.replace(/^\d+\.\s+/, "");
      elements.push(
        <p key={key++}>
          {trimmed.match(/^(\d+\.)\s/)![1]} {parse(content)}
        </p>
      );
    } else {
      flushList();
      elements.push(<p key={key++}>{parse(trimmed)}</p>);
    }
  }

  flushList();
  flushBlockquote();

  return <div className={className}>{elements}</div>;
}
