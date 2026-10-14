"use client";

import { useEffect, useState } from "react";

interface EcoItem {
  id: number;
  title: string;
  description: string;
  category: string;
  eco_impact_score: number;
  is_active: boolean;
}

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [items, setItems] = useState<EcoItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const fallbackItems: EcoItem[] = [
    {
      id: 1,
      title: "Industrial Recycled Polypropylene Pellets",
      description: "High-grade post-consumer recycled PP pellets suitable for automotive & consumer injection molding.",
      category: "Plastics",
      eco_impact_score: 45.2,
      is_active: true,
    },
    {
      id: 2,
      title: "Reclaimed Architectural Timber Beams",
      description: "Salvaged historic pine and oak beams preserved from urban deconstruction projects.",
      category: "Timber",
      eco_impact_score: 120.0,
      is_active: true,
    },
    {
      id: 3,
      title: "Recovered Post-Industrial Textile Fibers",
      description: "Clean shredded denim and cotton blend fibers engineered for thermal and acoustic insulation.",
      category: "Textiles",
      eco_impact_score: 32.5,
      is_active: true,
    },
  ];

  useEffect(() => {
    async function checkBackend() {
      try {
        const res = await fetch("http://localhost:8000/api/v1/health", {
          signal: AbortSignal.timeout(2500),
        });
        if (res.ok) {
          setBackendStatus("online");
          const itemsRes = await fetch("http://localhost:8000/api/v1/items");
          if (itemsRes.ok) {
            const data = await itemsRes.json();
            setItems(data);
            return;
          }
        } else {
          setBackendStatus("offline");
        }
      } catch {
        setBackendStatus("offline");
      }
      setItems(fallbackItems);
    }

    checkBackend();
  }, []);

  const categories = ["All", "Plastics", "Timber", "Textiles"];
  const displayItems = activeCategory === "All" ? items : items.filter((i) => i.category === activeCategory);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-emerald-500/15 blur-[120px] rounded-full" />
        <div className="absolute top-1/3 -right-40 w-[420px] h-[300px] bg-teal-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 flex flex-col gap-16">
        {/* Navigation Bar */}
        <header className="flex items-center justify-between border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-950 text-lg shadow-lg shadow-emerald-500/20">
              ♺
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white">Eco<span className="text-emerald-400">Loop</span></span>
              <p className="text-xs text-slate-400">Circular Economy Monorepo</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Backend Connectivity Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/60 text-xs font-medium">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendStatus === "online"
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                    : backendStatus === "checking"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-rose-400"
                }`}
              />
              <span>
                FastAPI:{" "}
                <span className={backendStatus === "online" ? "text-emerald-400" : backendStatus === "checking" ? "text-amber-300" : "text-rose-400"}>
                  {backendStatus === "online" ? "Connected (:8000)" : backendStatus === "checking" ? "Connecting..." : "Offline (Mock Mode)"}
                </span>
              </span>
            </div>

            <a
              href="http://localhost:8000/api/v1/docs"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all"
            >
              API Docs (Swagger) &rarr;
            </a>
          </div>
        </header>

        {/* Hero Section */}
        <section className="text-center flex flex-col items-center gap-6 pt-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <span>🌱</span> Built with Next.js 15 & FastAPI Monorepo
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-tight">
            Accelerating the <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">Closed-Loop</span> Resource Economy
          </h1>
          <p className="text-slate-400 max-w-2xl text-base sm:text-lg leading-relaxed">
            EcoLoop empowers enterprises to trace, exchange, and re-circulate secondary materials, minimizing landfill waste and quantifying carbon offsets in real-time.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="#catalog"
              className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-lg shadow-emerald-500/20"
            >
              Explore Circular Catalog
            </a>
            <a
              href="https://github.com/aashikvilla/ecoloop"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors"
            >
              View on GitHub
            </a>
          </div>
        </section>

        {/* Core Pillars */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl">
              🔄
            </div>
            <h3 className="font-semibold text-lg text-white">Closed-Loop Tracing</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Track raw material provenance, lifecycle cycles, and transformations across manufacturing lifecycles.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center text-xl">
              📊
            </div>
            <h3 className="font-semibold text-lg text-white">CO₂ Impact Quantification</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Automated greenhouse gas reduction metrics calculation for verified sustainability compliance and reporting.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xl">
              ⚡
            </div>
            <h3 className="font-semibold text-lg text-white">High-Speed API Core</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              High-performance asynchronous Python FastAPI backend with Pydantic type safety and OpenAPI auto-generation.
            </p>
          </div>
        </section>

        {/* Circular Material Catalog Section */}
        <section id="catalog" className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Active Circular Materials</h2>
              <p className="text-sm text-slate-400 mt-1">
                Real-time listings synchronized with the FastAPI backend service
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                    activeCategory === cat
                      ? "bg-emerald-500 text-slate-950 font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayItems.map((item) => (
              <div
                key={item.id}
                className="group p-5 rounded-2xl bg-slate-900/30 border border-slate-800/90 hover:border-emerald-500/40 hover:bg-slate-900/60 transition-all flex flex-col justify-between"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2.5 py-0.5 rounded-md font-medium bg-slate-800 text-emerald-300 border border-slate-700">
                      {item.category}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">ID #{item.id}</span>
                  </div>
                  <h3 className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Carbon Saved:</span>
                  <span className="font-bold text-emerald-400">
                    +{item.eco_impact_score} kg CO₂e
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Monorepo Architecture Reference */}
        <section className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 text-xs font-mono">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-emerald-400 font-semibold"># Monorepo Development Environment</span>
            <span className="text-slate-500">v0.1.0</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-slate-300">
            <div>
              <div className="text-slate-400 font-semibold mb-1">Frontend Server (Next.js)</div>
              <code>npm run dev:frontend</code>
              <div className="text-slate-500 text-[11px] mt-0.5">Listening at: http://localhost:3000</div>
            </div>
            <div>
              <div className="text-slate-400 font-semibold mb-1">Backend Server (FastAPI)</div>
              <code>uvicorn app.main:app --reload --port 8000</code>
              <div className="text-slate-500 text-[11px] mt-0.5">API Docs: http://localhost:8000/api/v1/docs</div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 pt-6 pb-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 EcoLoop. Designed for circular economy and sustainability acceleration.</p>
          <div className="flex items-center gap-4">
            <span>Next.js 15</span>
            <span>•</span>
            <span>FastAPI</span>
            <span>•</span>
            <span>TypeScript</span>
            <span>•</span>
            <span>Python 3.12</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
