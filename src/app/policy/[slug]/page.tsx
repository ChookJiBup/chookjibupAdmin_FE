import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { POLICY_CONTENT, type PolicySlug } from "@/features/auth/admin/policyContent";

function isPolicySlug(value: string): value is PolicySlug {
  return value in POLICY_CONTENT;
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isPolicySlug(slug)) notFound();

  const { title, body } = POLICY_CONTENT[slug];

  return (
    <>
      <Header />
      <main className="flex flex-1 justify-center p-8">
        <article className="w-2/3 max-w-[720px]">
          <h1 className="heading-regular text-zinc-950">{title}</h1>
          <p className="body-regular mt-6 whitespace-pre-line text-zinc-950">{body}</p>
        </article>
      </main>
    </>
  );
}
