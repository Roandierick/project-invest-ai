import { Fragment, type ReactNode } from "react";

interface ChatMarkdownProps {
  content: string;
  className?: string;
}

function renderInlineMarkdown(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

function renderParagraphLines(lines: string[]) {
  return lines.map((line, index) => (
    <Fragment key={`${line}-${index}`}>
      {index > 0 ? <br /> : null}
      {renderInlineMarkdown(line)}
    </Fragment>
  ));
}

export function ChatMarkdown({
  content,
  className = "",
}: ChatMarkdownProps) {
  const normalized = content.replace(/\r/g, "");
  const lines = normalized.split("\n");
  const blocks: ReactNode[] = [];
  let cursor = 0;

  while (cursor < lines.length) {
    const currentLine = lines[cursor]?.trim() ?? "";

    if (!currentLine) {
      cursor += 1;
      continue;
    }

    const headingMatch = currentLine.match(/^(#{1,3})\s+(.*)$/);

    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const headingClassName =
        level === 1
          ? "text-xl font-semibold"
          : level === 2
            ? "text-lg font-semibold"
            : "text-base font-semibold";

      blocks.push(
        <p key={`heading-${cursor}`} className={headingClassName}>
          {renderInlineMarkdown(headingText)}
        </p>,
      );
      cursor += 1;
      continue;
    }

    if (/^[-*]\s+/.test(currentLine)) {
      const items: string[] = [];

      while (cursor < lines.length) {
        const candidate = lines[cursor]?.trim() ?? "";

        if (!/^[-*]\s+/.test(candidate)) {
          break;
        }

        items.push(candidate.replace(/^[-*]\s+/, ""));
        cursor += 1;
      }

      blocks.push(
        <ul
          key={`bullet-list-${cursor}`}
          className="list-disc space-y-2 pl-5 text-sm leading-7"
        >
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(currentLine)) {
      const items: string[] = [];

      while (cursor < lines.length) {
        const candidate = lines[cursor]?.trim() ?? "";

        if (!/^\d+\.\s+/.test(candidate)) {
          break;
        }

        items.push(candidate.replace(/^\d+\.\s+/, ""));
        cursor += 1;
      }

      blocks.push(
        <ol
          key={`ordered-list-${cursor}`}
          className="list-decimal space-y-2 pl-5 text-sm leading-7"
        >
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraphLines: string[] = [];

    while (cursor < lines.length) {
      const candidate = lines[cursor]?.trim() ?? "";

      if (
        !candidate ||
        /^(#{1,3})\s+/.test(candidate) ||
        /^[-*]\s+/.test(candidate) ||
        /^\d+\.\s+/.test(candidate)
      ) {
        break;
      }

      paragraphLines.push(candidate);
      cursor += 1;
    }

    blocks.push(
      <p key={`paragraph-${cursor}`} className="text-sm leading-7">
        {renderParagraphLines(paragraphLines)}
      </p>,
    );
  }

  return <div className={`space-y-3 ${className}`.trim()}>{blocks}</div>;
}
