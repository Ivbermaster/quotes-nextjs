"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { getPalette, getPaletteCategories } from "@/lib/palettes";

export default function CategoriesDrawer() {
  const pathname = usePathname();
  const cats = getPaletteCategories();

  const [open, setOpen] = useState(false);
  const isAnimating = useRef(false);

  const btnRef = useRef<HTMLButtonElement|null>(null);
  const bar1 = useRef<HTMLSpanElement|null>(null);
  const bar2 = useRef<HTMLSpanElement|null>(null);
  const bar3 = useRef<HTMLSpanElement|null>(null);

  const panelRef = useRef<HTMLDivElement|null>(null);
  const backdropRef = useRef<HTMLDivElement|null>(null);
  const listRef = useRef<HTMLUListElement|null>(null);
  const utilRef = useRef<HTMLDivElement|null>(null);

  const burgerTl = useRef<gsap.core.Timeline|null>(null);

  // бургер ↔ крестик
  useEffect(() => {
    const b1 = bar1.current, b2 = bar2.current, b3 = bar3.current;
    if (!b1 || !b2 || !b3) return;

    gsap.set([b1, b2, b3], {
      left: 0, right: 0, height: 2, borderRadius: 1, backgroundColor: "#fff",
      position: "absolute", transformOrigin: "50% 50%",
    });
    gsap.set(b1, { y: -7 });
    gsap.set(b2, { y:  1 });
    gsap.set(b3, { y:  9 });

    const tl = gsap.timeline({ paused: true, defaults: { duration: 0.18, ease: "power2.out" }});
    tl.to(b1, { y: 1, rotate: 45 }, 0)
      .to(b2, { autoAlpha: 0 }, 0)
      .to(b3, { y: 1, rotate: -45 }, 0);
    burgerTl.current = tl;
  }, []);

  const openPanel = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setOpen(true);

    const panel = panelRef.current!;
    const backdrop = backdropRef.current!;
    const items = Array.from(listRef.current?.children ?? []) as HTMLElement[];
    const utils = Array.from(utilRef.current?.querySelectorAll("a") ?? []) as HTMLElement[];

    gsap.set(panel, { display: "block" });
    gsap.set(backdrop, { display: "block" });

    gsap.timeline({
      onStart: () => { burgerTl.current?.play(); },
      onComplete: () => { isAnimating.current = false; },
    })
      .fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18 }, 0)
      .fromTo(panel, { x: -16, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.22 }, 0.04)
      .fromTo(items, { y: -6, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.18, stagger: 0.03 }, 0.08)
      .fromTo(utils, { y: -4, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.16, stagger: 0.03 }, 0.14);
  };

  const closePanel = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    const panel = panelRef.current!;
    const backdrop = backdropRef.current!;
    const items = Array.from(listRef.current?.children ?? []) as HTMLElement[];
    const utils = Array.from(utilRef.current?.querySelectorAll("a") ?? []) as HTMLElement[];

    gsap.timeline({
      onStart: () => { burgerTl.current?.reverse() },
      onComplete: () => {
        gsap.set(panel, { display: "none" });
        gsap.set(backdrop, { display: "none" });
        setOpen(false);
        isAnimating.current = false;
      },
    })
      .to(utils, { y: -4, autoAlpha: 0, duration: 0.1, stagger: { each: 0.02, from: "end" } }, 0)
      .to(items, { y: -6, autoAlpha: 0, duration: 0.12, stagger: { each: 0.02, from: "end" } }, 0.02)
      .to(panel, { x: -16, autoAlpha: 0, duration: 0.14 }, 0.06)
      .to(backdrop, { autoAlpha: 0, duration: 0.12 }, 0.08);
  };

  const toggle = () => {
    if (isAnimating.current) return;
    open ? closePanel() : openPanel();
  };

  // закрытия
  useEffect(() => { if (open) closePanel(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && open) closePanel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!open) return;
      const p = panelRef.current, b = btnRef.current;
      const t = e.target as Node;
      if (p?.contains(t) || b?.contains(t)) return;
      closePanel();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const isActive = (c: string) => pathname?.startsWith(`/${c}`);
  const colorOf = (c: string) => getPalette(c)[0];

  return (
    <>
      {/* кнопка-бургер */}
      <button
        ref={btnRef}
        aria-label="Категории"
        aria-expanded={open}
        onClick={toggle}
        className="fixed top-4 left-4 z-[60] h-10 w-10 rounded-xl border border-white/40
                   bg-black/30 backdrop-blur hover:bg-black/40 active:scale-95
                   flex items-center justify-center"
        style={{ color: "#fff" }}
      >
        <div className="relative" style={{ width: 24, height: 18, transform: "translateY(7px)" }}>
          <span ref={bar1} />
          <span ref={bar2} />
          <span ref={bar3} />
        </div>
      </button>

      {/* бэкдроп */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-[50] bg-black/40 backdrop-blur-sm"
        style={{ display: "none", opacity: 0 }}
        onClick={closePanel}
      />

      {/* панель */}
      <div
        ref={panelRef}
        role="menu"
        aria-label="Категории"
        className="fixed top-16 left-4 z-[55] w-64 rounded-2xl border border-white/30
                   bg-black/60 backdrop-blur-xl shadow-xl p-2"
        style={{ display: "none", opacity: 0 }}
      >
        {/* Ряд 1: категории */}
        <ul ref={listRef} className="flex flex-col">
          <li role="none">
            <Link
              role="menuitem"
              href="/"
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-white hover:bg-white/10 focus:bg-white/10 outline-none"
              onClick={closePanel}
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#ffffff" }} />
              <span>All</span>
            </Link>
          </li>

          {cats.map((c) => {
            const col = colorOf(c);
            return (
              <li key={c} role="none">
                <Link
                  role="menuitem"
                  href={`/category/${encodeURIComponent(c)}`}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-white hover:bg-white/10 focus:bg-white/10 outline-none"
                  onClick={closePanel}
                  style={isActive(c) ? { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)" } : undefined}
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: col }} />
                  <span className="capitalize">{c}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Ряд 2: утилиты */}
        <div ref={utilRef} className="mt-2 border-t border-white/15 pt-2 px-2 grid grid-cols-2 gap-2">
          <Link href="/of-the-day"
            onClick={closePanel}
            className="block rounded-xl px-3 py-2 text-white/90 hover:text-white hover:bg-white/10">
            <div className="text-sm">Quote of the day</div>
          </Link>
          {/* задел под избранное и т.п. */}
          <Link href="/favorites"
            onClick={closePanel}
            className="block rounded-xl px-3 py-2 text-white/90 hover:text-white hover:bg-white/10">
            <div className="text-sm">Your Favorites</div>
          </Link>
        </div>
      </div>
    </>
  );
}
