import { requireAdmin } from "../../../lib/admin";
import { db } from "../../../lib/customer";
import { supplier } from "../actions";
export default async function Suppliers() {
  await requireAdmin();
  const rows = await db.supplier.findMany({
    include: { products: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  function editor(s?: (typeof rows)[number]) {
    return (
      <form action={supplier}>
        <input name="id" type="hidden" value={s?.id ?? 0} />
        {(["name", "contact", "email", "phone"] as const).map((k) => (
          <label key={k}>
            {
              {
                name: "Supplier name",
                contact: "Contact person",
                email: "Email",
                phone: "Phone",
              }[k]
            }
            <input
              name={k}
              type={k === "email" ? "email" : "text"}
              defaultValue={s?.[k]}
              required
            />
          </label>
        ))}
        <label>
          Estimated delivery days
          <input
            name="days"
            type="number"
            min="0"
            max="730"
            required
            defaultValue={s?.deliveryDays}
          />
        </label>
        <button>Save supplier</button>
      </form>
    );
  }
  return (
    <>
      <h1>Suppliers</h1>
      <details>
        <summary>Add supplier</summary>
        {editor()}
      </details>
      {rows.map((s) => (
        <details key={s.id}>
          <summary>
            {s.name} · {s.deliveryDays} days
          </summary>
          {editor(s)}
          <p>
            Assigned products ·{" "}
            {s.products.map((p) => p.name).join(", ") || "None"}
          </p>
        </details>
      ))}
    </>
  );
}
