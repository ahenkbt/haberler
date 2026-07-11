import type { ReactNode } from "react";

type Block =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

function inlineBold(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", text: trimmed.slice(3).trim() });
      i += 1;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "h3", text: trimmed.slice(4).trim() });
      i += 1;
      continue;
    }

    if (trimmed.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i] ?? "").trim().startsWith("- ")) {
        items.push((lines[i] ?? "").trim().slice(2).trim());
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    const paraLines: string[] = [trimmed];
    i += 1;
    while (i < lines.length) {
      const next = (lines[i] ?? "").trim();
      if (!next || next.startsWith("## ") || next.startsWith("### ") || next.startsWith("- ")) break;
      paraLines.push(next);
      i += 1;
    }
    blocks.push({ type: "p", text: paraLines.join(" ") });
  }

  return blocks;
}

export function SimpleMarkdown({ source, className = "" }: { source: string; className?: string }) {
  const blocks = parseMarkdown(source);

  return (
    <article className={`space-y-4 text-sm leading-relaxed text-slate-600 ${className}`.trim()}>
      {blocks.map((block, idx) => {
        if (block.type === "h2") {
          return (
            <h2 key={idx} className="pt-2 text-lg font-bold text-slate-900">
              {inlineBold(block.text)}
            </h2>
          );
        }
        if (block.type === "h3") {
          return (
            <h3 key={idx} className="pt-1 text-base font-semibold text-slate-800">
              {inlineBold(block.text)}
            </h3>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={idx} className="list-disc space-y-2 pl-5">
              {block.items.map((item, j) => (
                <li key={j}>{inlineBold(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="text-slate-600">
            {inlineBold(block.text)}
          </p>
        );
      })}
    </article>
  );
}
