"use client";

import { useRef, useCallback, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Code,
  Link,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  ImagePlus,
  Loader2,
  Minus,
} from "lucide-react";

interface Props {
  token: string;
  editorRef: React.RefObject<HTMLDivElement | null>;
  placeholder?: string;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="w-px h-5 bg-border/60 mx-0.5" />;
}

export function RichEditor({ token, editorRef, placeholder }: Props) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, [editorRef]);

  function handleHeading(level: 1 | 2) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    let block = range.startContainer as HTMLElement;
    if (block.nodeType === Node.TEXT_NODE) block = block.parentElement!;

    while (block && block !== editorRef.current && !["P", "H1", "H2", "DIV"].includes(block.tagName)) {
      block = block.parentElement!;
    }

    if (!block || block === editorRef.current) {
      exec("formatBlock", `h${level}`);
      return;
    }

    const tag = `H${level}`;
    if (block.tagName === tag) {
      exec("formatBlock", "p");
    } else {
      exec("formatBlock", `h${level}`);
    }
  }

  function handleLink() {
    const sel = window.getSelection();
    const existing = sel?.anchorNode?.parentElement;
    if (existing?.tagName === "A") {
      exec("unlink");
      return;
    }
    const url = prompt("Enter URL:");
    if (url) exec("createLink", url);
  }

  function handleCode() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const selectedText = range.toString();

    if (selectedText) {
      const code = document.createElement("code");
      code.textContent = selectedText;
      code.style.background = "#f1f5f9";
      code.style.padding = "1px 4px";
      code.style.borderRadius = "3px";
      code.style.fontFamily = "monospace";
      code.style.fontSize = "0.9em";
      range.deleteContents();
      range.insertNode(code);
      sel.collapseToEnd();
    }
  }

  async function handleImageUpload(file: File) {
    if (!file.type.startsWith("image/") && !file.type.startsWith("application/")) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("file", file);

      const res = await fetch("/api/ed/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const fileId = data.file?.id;
        if (fileId) {
          const url = `https://static.us.edusercontent.com/files/${fileId}`;
          if (file.type.startsWith("image/")) {
            exec("insertHTML", `<img src="${url}" style="max-width:100%;border-radius:8px;margin:8px 0" />`);
          } else {
            exec("insertHTML", `<a href="${url}" target="_blank">${file.name}</a>`);
          }
        }
      }
    } finally {
      setUploading(false);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleImageUpload(file);
        return;
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageUpload(files[0]);
    }
  }

  const iconSize = "w-4 h-4";

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border/60 bg-muted/20 flex-wrap">
        <ToolbarButton onClick={() => handleHeading(1)} title="Heading">
          <Heading1 className={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => handleHeading(2)} title="Subheading">
          <Heading2 className={iconSize} />
        </ToolbarButton>

        <Separator />

        <ToolbarButton onClick={() => exec("bold")} title="Bold (Cmd+B)">
          <Bold className={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("italic")} title="Italic (Cmd+I)">
          <Italic className={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("underline")} title="Underline (Cmd+U)">
          <Underline className={iconSize} />
        </ToolbarButton>

        <Separator />

        <ToolbarButton onClick={handleCode} title="Inline Code">
          <Code className={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={handleLink} title="Link">
          <Link className={iconSize} />
        </ToolbarButton>

        <Separator />

        <ToolbarButton onClick={() => exec("insertUnorderedList")} title="Bulleted List">
          <List className={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("insertOrderedList")} title="Numbered List">
          <ListOrdered className={iconSize} />
        </ToolbarButton>

        <Separator />

        <ToolbarButton onClick={() => exec("insertHorizontalRule")} title="Divider">
          <Minus className={iconSize} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Upload Image"
        >
          {uploading ? (
            <Loader2 className={`${iconSize} animate-spin`} />
          ) : (
            <ImagePlus className={iconSize} />
          )}
        </ToolbarButton>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.zip,.txt,.py,.java,.c,.cpp,.js,.ts"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        data-placeholder={placeholder || "Write your content..."}
        className="min-h-[180px] max-h-[400px] overflow-y-auto px-4 py-3 text-sm text-foreground leading-relaxed focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1 [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[0.9em] [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_img]:rounded-lg [&_img]:max-w-full [&_img]:my-2"
      />
    </div>
  );
}

/** Convert contentEditable HTML to Ed Discussion XML format */
export function htmlToEdXml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, "text/html");

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeXml(node.textContent || "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = node as HTMLElement;
    const children = Array.from(el.childNodes).map(processNode).join("");

    switch (el.tagName) {
      case "H1":
        return `<heading level="1">${children}</heading>`;
      case "H2":
        return `<heading level="2">${children}</heading>`;
      case "P":
      case "DIV":
        if (el.querySelector("img")) return children;
        return `<paragraph>${children || " "}</paragraph>`;
      case "B":
      case "STRONG":
        return `<bold>${children}</bold>`;
      case "I":
      case "EM":
        return `<italic>${children}</italic>`;
      case "U":
        return `<underline>${children}</underline>`;
      case "CODE":
        return `<code>${children}</code>`;
      case "A":
        return `<link href="${escapeXml(el.getAttribute("href") || "")}">${children}</link>`;
      case "UL":
        return `<list style="bullet">${children}</list>`;
      case "OL":
        return `<list style="number">${children}</list>`;
      case "LI":
        return `<list-item><paragraph>${children}</paragraph></list-item>`;
      case "IMG": {
        const src = el.getAttribute("src") || "";
        return `<figure><image src="${escapeXml(src)}" /></figure>`;
      }
      case "HR":
        return `<break />`;
      case "BR":
        return `</paragraph><paragraph>`;
      default:
        return children;
    }
  }

  function escapeXml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const body = doc.body;
  let result = Array.from(body.childNodes).map(processNode).join("");

  if (!result.startsWith("<")) {
    result = `<paragraph>${result}</paragraph>`;
  }

  return `<document version="2.0">${result}</document>`;
}
