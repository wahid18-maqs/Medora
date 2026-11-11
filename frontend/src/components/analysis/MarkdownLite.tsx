import React from "react";

function removeLetterStyle(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  while (lines.length > 0) {
    const line = lines[0].trim();
    if (!line) {
      lines.shift();
      continue;
    }
    if (/^(dear|hello|hi)\b/i.test(line)) {
      lines.shift();
      continue;
    }
    break;
  }

  while (lines.length > 0) {
    const line = lines[lines.length - 1].trim();
    if (!line) {
      lines.pop();
      continue;
    }
    if (/^(sincerely|best regards|kind regards|warm regards|regards|thank you|thanks)\b/i.test(line)) {
      lines.pop();
      continue;
    }
    break;
  }

  return lines.join("\n").trim();
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`)/g);
  return parts.filter(Boolean).map((part, index) => {
    if (/^\*\*[^*]+\*\*$/.test(part) || /^__[^_]+__$/.test(part)) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (/^`[^`]+`$/.test(part)) {
      return (
        <code
          key={index}
          className="rounded bg-muted px-1 py-0.5 text-[13px] text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export default function MarkdownLite({ content }: { content: string }) {
  const text = removeLetterStyle(content || "");
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed || /^([-*_])\1{2,}$/.test(trimmed)) {
      index += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const HeadingTag = (level <= 2 ? "h2" : "h3") as "h2" | "h3";
      blocks.push(
        <HeadingTag
          key={`heading-${index}`}
          className={
            level <= 2
              ? "mt-5 mb-2 text-base font-semibold text-foreground first:mt-0"
              : "mt-4 mb-1.5 text-sm font-semibold text-foreground"
          }
        >
          {renderInline(heading[2])}
        </HeadingTag>
      );
      index += 1;
      continue;
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*•]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*•]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul
          key={`ul-${index}`}
          className="my-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground marker:text-primary"
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(lines[index])) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+[.)]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol
          key={`ol-${index}`}
          className="my-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-foreground marker:text-primary"
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    const paragraph: string[] = [trimmed];
    index += 1;
    while (index < lines.length) {
      const next = lines[index].trim();
      if (
        !next ||
        /^(#{1,6})\s+/.test(next) ||
        /^[-*•]\s+/.test(next) ||
        /^\d+[.)]\s+/.test(next) ||
        /^([-*_])\1{2,}$/.test(next)
      ) {
        break;
      }
      paragraph.push(next);
      index += 1;
    }
    blocks.push(
      <p key={`p-${index}`} className="my-2 text-sm leading-relaxed text-foreground">
        {renderInline(paragraph.join(" "))}
      </p>
    );
  }

  return <div className="space-y-0.5">{blocks}</div>;
}
