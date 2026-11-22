import { money } from "../../lib/checkout";
export function Chart({ rows }: { rows: { period: Date; revenue: bigint }[] }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.revenue)));
  return rows.length ? (
    <ul>
      {[...rows].reverse().map((r) => (
        <li key={r.period.toISOString()}>
          {r.period.toISOString().slice(0, 10)} ·{" "}
          <meter
            aria-label="Revenue"
            min={0}
            max={max}
            value={Number(r.revenue)}
          />{" "}
          {money(Number(r.revenue))}
        </li>
      ))}
    </ul>
  ) : (
    <p>No dated captures yet.</p>
  );
}
