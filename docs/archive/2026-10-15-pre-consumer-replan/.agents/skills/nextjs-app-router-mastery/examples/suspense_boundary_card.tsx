import { Suspense } from "react";

interface Item {
  id: number;
  title: string;
  category: string;
  eco_impact_score: number;
}

// Simulated asynchronous server fetch
async function FetchedCatalogItems() {
  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  const res = await fetch(`${backendUrl}/api/v1/items`, { cache: "no-store" });
  if (!res.ok) return <p className="text-rose-400 text-sm">Failed to load circular items.</p>;
  const items: Item[] = await res.json();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((item) => (
        <div key={item.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
            {item.category}
          </span>
          <h4 className="font-semibold text-white mt-2">{item.title}</h4>
          <p className="text-xs text-emerald-400 mt-2">+{item.eco_impact_score} kg CO2e saved</p>
        </div>
      ))}
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="h-28 rounded-xl bg-slate-900/60 border border-slate-800" />
      ))}
    </div>
  );
}

export function StreamingCatalogSection() {
  return (
    <section className="mt-8">
      <h3 className="text-lg font-bold text-white mb-4">Live Circular Inventory</h3>
      <Suspense fallback={<CatalogSkeleton />}>
        <FetchedCatalogItems />
      </Suspense>
    </section>
  );
}
