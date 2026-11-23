import { cache } from "react";
import { db } from "./customer";
export const catalog = cache(async function catalog() {
  return db.product.findMany({
    where: { active: true },
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      audience: true,
      tag: true,
      pricePaise: true,
      image: true,
      variants: {
        orderBy: { id: "asc" },
        select: { id: true, size: true, color: true, stock: true },
      },
    },
  });
});
