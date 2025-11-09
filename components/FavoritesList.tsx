"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

type Fav = {
  id: string;         // приходит строкой из /api/favorites
  text: string;
  author: string;
  categories?: string[];
};

export default function FavoritesList() {
  const [items, setItems] = useState<Fav[] | null>(null);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // загрузка списка
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/favorites", { cache: "no-store", keepalive: true });
        const data: Fav[] = res.ok ? await res.json() : [];
        if (!alive) return;
        setItems(data);

        // входная анимация карточек
        requestAnimationFrame(() => {
          const cards = wrapRef.current?.querySelectorAll(".fav-card");
          if (!cards) return;
          gsap.from(cards, {
            duration: 0.5,
            opacity: 0,
            y: 16,
            stagger: 0.05,
            ease: "power2.out",
          });
        });
      } catch {
        if (!alive) return;
        setItems([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  const removeOne = async (id: string) => {
    if (busy) return;
    setBusy(true);
    // локально: плавно скрыть, потом удалить из стейта
    const card = wrapRef.current?.querySelector(`[data-id="${id}"]`);
    try {
      if (card) {
        await gsap.to(card, { duration: 0.25, opacity: 0, y: -8, ease: "power2.inOut" });
      }
      // запрос
      await fetch("/api/favorites", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quoteId: id }),
      });
      setItems(prev => (prev ?? []).filter(x => x.id !== id));
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    if (!items?.length || busy) return;
    setBusy(true);
    try {
      // анимация исчезновения всех
      const cards = wrapRef.current?.querySelectorAll(".fav-card");
      if (cards && cards.length) {
        await gsap.to(cards, { duration: 0.25, opacity: 0, y: -8, stagger: 0.02, ease: "power2.in" });
      }
      // последовательные DELETE (просто и надёжно для MVP)
      for (const it of items) {
        // не блокируем UI на каждом DELETE
        fetch("/api/favorites", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ quoteId: it.id }),
        }).catch(() => {});
      }
      setItems([]);
    } finally {
      setBusy(false);
    }
  };

  if (items === null) {
    // скелетон
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" ref={wrapRef}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="fav-card rounded-3xl border border-white/10 p-5 bg-white/5">
            <div className="h-6 w-3/4 bg-white/10 rounded mb-3" />
            <div className="h-6 w-2/3 bg-white/10 rounded mb-3" />
            <div className="h-4 w-1/3 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-white/70 text-sm">
          {items.length ? `${items.length} saved` : "No favorites yet"}
        </p>
        {items.length > 0 && (
          <button
            onClick={clearAll}
            disabled={busy}
            className="text-sm rounded-2xl border border-white/15 px-3 py-1.5 text-white/80 hover:text-white hover:border-white/30 disabled:opacity-50"
          >
            Clear all
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyHint />
      ) : (
        <div ref={wrapRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((q) => (
            <article
              key={q.id}
              data-id={q.id}
              className="fav-card group relative rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
            >
              {/* кнопка удалить */}
              <button
                onClick={() => removeOne(q.id)}
                className="absolute right-3 top-3 inline-flex items-center justify-center h-9 w-9 rounded-2xl border border-white/15 text-white/80 hover:text-black hover:bg-white"
                title="Remove from favorites"
                aria-label="Remove from favorites"
              >
                {/* иконка крестика */}
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              {/* текст */}
              <h3 className="text-xl leading-snug">
                “{q.text}”
              </h3>
              <p className="mt-3 text-white/70 text-right">— {q.author}</p>

              {/* чипы категорий, если есть */}
              {!!q.categories?.length && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {q.categories.map((c) => (
                    <a
                      key={c}
                      href={`/${encodeURIComponent(c)}`}
                      className="text-xs rounded-full border border-white/10 px-2 py-1 text-white/70 hover:text-white hover:border-white/30"
                    >
                      {c}
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyHint() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { y: 8, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.45, ease: "power2.out" }
    );
  }, []);
  return (
    <div ref={ref} className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
      <p className="text-white/80">Nothing here yet.</p>
      <p className="text-white/60 text-sm mt-1">Add quotes with the ★ button.</p>
    </div>
  );
}
