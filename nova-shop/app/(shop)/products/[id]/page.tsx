import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "../../../../lib/customer";
import { catalog } from "../../../../lib/catalog";
import { photo } from "../../../../lib/shop";
import { Card } from "../../store";
import Details from "./details";
const load = cache(async (id: string) => {
  if (!/^[1-9]\d{0,9}$/.test(id)) notFound();
  const products = await catalog(),
    p = products.find((p) => String(p.id) === id);
  if (!p) notFound();
  return {
    p,
    related: products
      .filter((x) => x.id !== p.id && x.category === p.category)
      .slice(0, 4),
  };
});
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { p } = await load((await params).id),
    title = p.name + " | NOIR",
    description =
      p.description ||
      "Explore " +
        p.name +
        " from the NOIR " +
        p.category.toLowerCase() +
        " collection.";
  return {
    title,
    description,
    openGraph: { title, description, images: photo(p) ? [photo(p)!] : [] },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { p, related } = await load((await params).id);
  const [gallery] = await db.$queryRaw<
    { extra: boolean }[]
  >`SELECT "detailPhoto" IS NOT NULL AS extra FROM "Product" WHERE id=${p.id}`;
  return (
    <section className="section product-page">
      <a href="/#shop">← The collection</a>
      <Details p={p} extra={gallery?.extra ?? false} />
      {related.length > 0 && (
        <>
          <h2>Related pieces</h2>
          <div className="tiles">
            {related.map((p) => (
              <Card key={p.id} p={p} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
