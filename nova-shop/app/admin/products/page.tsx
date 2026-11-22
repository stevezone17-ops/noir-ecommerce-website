import { requireAdmin } from "../../../lib/admin";
import { db } from "../../../lib/customer";
import { product, stock, variant } from "../actions";
export default async function Products() {
  await requireAdmin();
  const [products, suppliers] = await Promise.all([
    db.product.findMany({
      omit: { photo: true },
      include: { variants: { orderBy: { id: "asc" } } },
      orderBy: { id: "asc" },
    }),
    db.supplier.findMany(),
  ]);
  function editor(p?: (typeof products)[number]) {
    return (
      <form action={product}>
        <input type="hidden" name="id" value={p?.id ?? 0} />
        <label>
          Name
          <input name="name" defaultValue={p?.name} required />
        </label>
        <label>
          Category
          <input name="category" defaultValue={p?.category} required />
        </label>
        <label>
          Description
          <textarea name="description" defaultValue={p?.description} />
        </label>
        <label>
          Price (₹)
          <input
            name="price"
            type="number"
            min=".01"
            step=".01"
            defaultValue={p ? p.pricePaise / 100 : ""}
            required
          />
        </label>
        <label>
          Supplier
          <select name="supplier" defaultValue={p?.supplierId ?? 0}>
            <option value="0">Unassigned</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Unit cost (₹)
          <input
            name="cost"
            type="number"
            min="0"
            step=".01"
            defaultValue={p?.costPaise != null ? p.costPaise / 100 : ""}
          />
        </label>
        <label>
          Image (JPEG, PNG or WebP, up to 800 KB)
          <input
            type="file"
            name="image"
            accept="image/jpeg,image/png,image/webp"
          />
        </label>
        <label>
          <input
            name="active"
            type="checkbox"
            defaultChecked={p?.active ?? true}
          />
          Available in catalog
        </label>
        <button>Save product</button>
      </form>
    );
  }
  return (
    <>
      <h1>Products & inventory</h1>
      <details>
        <summary>Add product</summary>
        {editor()}
      </details>
      {products.map((p) => (
        <details key={p.id}>
          <summary>
            {p.name} · {p.active ? "Available" : "Archived"} ·{" "}
            {p.variants.reduce((n, v) => n + v.stock, 0)} in stock
          </summary>
          {editor(p)}
          <h2>Variants</h2>
          {p.variants.map((v) => (
            <form key={v.id} action={stock}>
              <input type="hidden" name="id" value={v.id} />
              <strong>
                {v.size} / {v.color} · {v.stock} available
              </strong>
              <label>
                Stock adjustment
                <input type="number" name="delta" required />
              </label>
              <label>
                Reason
                <input name="reason" required />
              </label>
              <button>Adjust stock</button>
            </form>
          ))}
          <form action={variant}>
            <input name="product" type="hidden" value={p.id} />
            <label>
              Size
              <input name="size" required />
            </label>
            <label>
              Color
              <input name="color" required />
            </label>
            <button>Add variant</button>
          </form>
        </details>
      ))}
    </>
  );
}
