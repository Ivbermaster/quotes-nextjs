"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

type Props = { quoteId: string | null };

const YELLOW = "#FFD54F";

export default function FavButton({ quoteId }: Props) {
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(false);

  // refs DOM
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const starRef = useRef<SVGPathElement | null>(null);
  const ringRef = useRef<SVGCircleElement | null>(null);
  const rays = useRef<Array<SVGPathElement | null>>([]);
  const dots = useRef<Array<SVGCircleElement | null>>([]);

  // кеш избранного
  const cacheRef = useRef<Set<string>>(new Set());
  const bootRef = useRef(false);

  // ------- utils: анимации -------
  const playReset = (
    star: SVGPathElement,
    ring: SVGCircleElement,
    rayEls: SVGPathElement[],
    dotEls: SVGCircleElement[],
  ) => {
    gsap.killTweensOf([star, ring, ...rayEls, ...dotEls]);
    gsap.set(ring, { clearProps: "all", opacity: 0, scale: 1, transformOrigin: "50% 50%" });
    gsap.set(rayEls, { clearProps: "all", opacity: 0, scale: 1, x: 0, y: 0, transformOrigin: "0 50%" });
    gsap.set(dotEls, { clearProps: "all", opacity: 0, scale: 1, x: 0, y: 0 });
  };

  const playOn = (
    star: SVGPathElement,
    ring: SVGCircleElement,
    rayEls: SVGPathElement[],
    dotEls: SVGCircleElement[],
  ) => {
    playReset(star, ring, rayEls, dotEls);

    const tl = gsap.timeline({ onComplete: () => { gsap.set(star, { fill: YELLOW, stroke: YELLOW }); } });

    gsap.set(ring, { scale: 0.3, opacity: 0.9, transformOrigin: "50% 50%" });
    gsap.set(rayEls, { scale: 0.2, opacity: 0, transformOrigin: "0 50%" });
    dotEls.forEach((d, i) => {
      const angle = (i / dotEls.length) * Math.PI * 2;
      const r = 3;
      gsap.set(d, { x: Math.cos(angle) * r, y: Math.sin(angle) * r, opacity: 0, scale: 0.6 });
    });

    tl.to(star, { duration: 0.12, scale: 1.18, ease: "power2.out" }, 0)
      .to(star, { duration: 0.12, scale: 1.0, ease: "power2.in" }, 0.12)
      .to(star, { fill: YELLOW, stroke: YELLOW, duration: 0.01 }, 0.12);

    tl.to(ring, { duration: 0.38, scale: 1.6, opacity: 0, ease: "power2.out" }, 0.02);

    tl.to(
      rayEls,
      {
        duration: 0.32,
        opacity: 1,
        scale: 1,
        ease: "back.out(2)",
        stagger: { each: 0.03, from: "random" },
      },
      0.08,
    ).to(
      rayEls,
      {
        duration: 0.28,
        opacity: 0,
        scale: 1.25,
        ease: "power2.in",
        stagger: { each: 0.03, from: "random" },
      },
      0.24,
    );

    tl.to(
      dotEls,
      {
        keyframes: [
          { opacity: 1, duration: 0.01 },
          {
            duration: 0.34,
            x: (i: number) => Math.cos((i / dotEls.length) * Math.PI * 2) * 12,
            y: (i: number) => Math.sin((i / dotEls.length) * Math.PI * 2) * 12,
            scale: 1,
            ease: "power2.out",
          },
          { duration: 0.18, opacity: 0, scale: 0.6, ease: "power2.in" },
        ],
        stagger: { each: 0.02 },
      },
      0.06,
    );
  };

  const playOff = (
    star: SVGPathElement,
    ring: SVGCircleElement,
    rayEls: SVGPathElement[],
    dotEls: SVGCircleElement[],
  ) => {
    playReset(star, ring, rayEls, dotEls);
    gsap
      .timeline({
        onComplete: () => {
          playReset(star, ring, rayEls, dotEls);
          gsap.set(star, { fill: "none", stroke: "#FFFFFF" });
        },
      })
      .to(star, { duration: 0.1, scale: 0.9, ease: "power2.in" }, 0)
      .to(star, { duration: 0.12, scale: 1.0, ease: "power2.out" }, 0.1)
      .fromTo(ring, { scale: 0.8, opacity: 0.15 }, { scale: 0.3, opacity: 0, duration: 0.2, ease: "power2.in" }, 0.06);
  };

  // ------- инициализация избранного -------
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    fetch("/api/favorites", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr: any[]) => {
        arr.forEach((q: any) => cacheRef.current.add(String(q.id ?? q.quoteId)));
        if (quoteId && cacheRef.current.has(quoteId)) setActive(true);
      })
      .catch(() => {});
  }, []);

  // при смене цитаты синхронизировать индикатор
  useEffect(() => {
    if (!quoteId) {
      setActive(false);
      return;
    }
    setActive(cacheRef.current.has(quoteId));
  }, [quoteId]);

  // hover-пульс
  useEffect(() => {
    const btn = btnRef.current;
    const star = starRef.current;
    if (!btn || !star) return;

    const enter = () => gsap.to(star, { duration: 0.16, scale: 1.08, rotate: 6, transformOrigin: "50% 50%", ease: "power2.out" });
    const leave = () => gsap.to(star, { duration: 0.16, scale: 1, rotate: 0, ease: "power2.inOut" });

    btn.addEventListener("mouseenter", enter);
    btn.addEventListener("mouseleave", leave);
    btn.addEventListener("touchstart", enter, { passive: true });
    btn.addEventListener("touchend", leave, { passive: true });

    return () => {
      btn.removeEventListener("mouseenter", enter);
      btn.removeEventListener("mouseleave", leave);
      btn.removeEventListener("touchstart", enter);
      btn.removeEventListener("touchend", leave);
    };
  }, []);

  // ------- оптимистичный тоггл -------
  const toggle = () => {
    if (!quoteId || pending) return;
    setPending(true);

    const willActivate = !active;

    const star = starRef.current;
    const ring = ringRef.current;
    const rayEls = rays.current.filter(Boolean) as SVGPathElement[];
    const dotEls = dots.current.filter(Boolean) as SVGCircleElement[];
    if (!star || !ring) {
      setPending(false);
      return;
    }

    // 1) мгновенно меняем UI и играем анимацию
    setActive(willActivate);
    if (willActivate) {
      cacheRef.current.add(quoteId);
      playOn(star, ring, rayEls, dotEls);
    } else {
      cacheRef.current.delete(quoteId);
      playOff(star, ring, rayEls, dotEls);
    }

    // 2) запрос идёт параллельно
    fetch("/api/favorites", {
      method: willActivate ? "POST" : "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quoteId }),
      keepalive: true,
    })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
      })
      .catch(() => {
        // откат при ошибке
        const revertTo = !willActivate;
        setActive(revertTo);
        if (revertTo) {
          cacheRef.current.add(quoteId);
          playOn(star, ring, rayEls, dotEls);
        } else {
          cacheRef.current.delete(quoteId);
          playOff(star, ring, rayEls, dotEls);
        }
      })
      .finally(() => setPending(false));
  };

  // стили кнопки
  const btnActiveStyle: React.CSSProperties = { background: "#fff", borderColor: "#fff" };
  const btnIdleStyle: React.CSSProperties = { background: "transparent", borderColor: "#fff" };

  return (
    <button
      ref={btnRef}
      onClick={toggle}
      disabled={!quoteId || pending}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      title={active ? "В избранном" : "В избранное"}
      className={`relative inline-flex items-center justify-center rounded-4xl border px-5 py-4 transition-colors ${
        active ? "text-black" : "text-white"
      } ${pending ? "opacity-60" : ""}`}
      style={{ WebkitTapHighlightColor: "transparent", ...(active ? btnActiveStyle : btnIdleStyle) }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" className="block">
        {/* кольцо */}
        <circle ref={ringRef} cx="12" cy="12" r="9.5" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0" />
        {/* лучи — 8 шт */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const x1 = 12 + Math.cos(angle) * 9;
          const y1 = 12 + Math.sin(angle) * 9;
          const x2 = 12 + Math.cos(angle) * 12.5;
          const y2 = 12 + Math.sin(angle) * 12.5;
          return (
            <path
              key={`ray-${i}`}
              ref={(el) => {
                rays.current[i] = el;
              }}
              d={`M ${x1} ${y1} L ${x2} ${y2}`}
              stroke="#FFFFFF"
              strokeWidth="1.2"
              opacity="0"
            />
          );
        })}
        {/* искры — 6 точек */}
        {Array.from({ length: 6 }).map((_, i) => (
          <circle
            key={`dot-${i}`}
            ref={(el) => {
              dots.current[i] = el;
            }}
            cx="12"
            cy="12"
            r="1.2"
            fill="#FFFFFF"
            opacity="0"
          />
        ))}
        {/* звезда */}
        <path
          ref={starRef}
          d="M12 17.27L18.18 21l-1.64-7.03L22 9.245l-7.19-.61L12 2 9.19 8.635 2 9.245l5.46 4.725L5.82 21z"
          fill={active ? YELLOW : "none"}
          stroke={active ? YELLOW : "#FFFFFF"}
          strokeWidth="1.6"
        />
      </svg>
    </button>
  );
}
