import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { POLICY_CONTENT, type PolicySlug } from "@/features/auth/admin/policyContent";

function isPolicySlug(value: string): value is PolicySlug {
  return value in POLICY_CONTENT;
}

function inlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\[([^\]]+)]\(([^)]+)\)/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(text.slice(cursor, index));
    const href = match[2];
    nodes.push(
      <a
        key={`${index}-${href}`}
        href={href}
        className="font-medium text-primary underline underline-offset-2"
        {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {match[1]}
      </a>,
    );
    cursor = index + match[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function renderPolicy(body: string) {
  const lines = body.trim().split("\n");
  const result: ReactNode[] = [];
  let index = 0;
  const cells = (line: string) =>
    line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    if (line.startsWith("## ")) {
      result.push(<h2 key={index} className="mt-9 text-xl font-bold text-zinc-950 first:mt-0">{line.slice(3)}</h2>);
      index += 1;
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(cells(lines[index]));
        index += 1;
      }
      const visibleRows = rows.filter((row) => !row.every((cell) => /^:?-{3,}:?$/.test(cell)));
      const [header, ...bodyRows] = visibleRows;
      result.push(
        <div key={`table-${index}`} className="my-5 overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm leading-6">
            <thead className="bg-zinc-50"><tr>{header.map((cell, at) => <th key={at} className="border-b border-zinc-200 px-4 py-3 font-semibold text-zinc-950">{inlineMarkdown(cell)}</th>)}</tr></thead>
            <tbody>{bodyRows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-zinc-100 last:border-0">{row.map((cell, at) => <td key={at} className="px-4 py-3 align-top text-zinc-700">{inlineMarkdown(cell)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("- ")) {
        items.push(lines[index].trim().slice(2));
        index += 1;
      }
      result.push(<ul key={`list-${index}`} className="my-3 list-disc space-y-1 pl-6 text-base leading-7 text-zinc-700">{items.map((item, at) => <li key={at}>{inlineMarkdown(item)}</li>)}</ul>);
      continue;
    }
    result.push(<p key={index} className="mt-3 text-base leading-7 text-zinc-700">{inlineMarkdown(line)}</p>);
    index += 1;
  }
  return result;
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isPolicySlug(slug)) notFound();

  const { title, body } = POLICY_CONTENT[slug];

  return (
    <>
      <Header />
      <main className="flex flex-1 justify-center bg-zinc-50 px-4 py-10 sm:px-8">
        <article className="w-full max-w-[920px] rounded-2xl border border-zinc-200 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10">
          <h1 className="text-center text-3xl font-bold tracking-tight text-zinc-950">{title}</h1>
          <div className="mt-8">{renderPolicy(body)}</div>
        </article>
      </main>
    </>
  );
}
