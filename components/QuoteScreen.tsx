"use client";
import { useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import gsap from "gsap";
import SplitText from "gsap/dist/SplitText";
import { getPalette } from "@/lib/palettes";
import FavButton from "./FavButton";

gsap.registerPlugin(SplitText);

type ZQ = { id?: string | number; q: string; a: string; h?: string };

type Props = {
  buildUrl: () => string;   // например: "/api/quotes?per=50&categories=life"
  keySeed?: string;         // меняй при смене категории, чтобы сбрасывать буфер
  category?: string;
  showNext?: boolean;
};

export default function QuoteScreen({ buildUrl, keySeed, category, showNext = true }: Props) {
  // палитра от категории
  const palette = useMemo(() => getPalette(category), [category]);

  // состояние
  const [bgColor, setBgColor] = useState<string>(palette[0] ?? "#000");
  const [quote, setQuote] = useState("");
  const [author, setAuthor] = useState("");
  const [currentId, setCurrentId] = useState<string | null>(null);


  // refs для анимаций
  const quoteEl = useRef<HTMLHeadingElement>(null);
  const authorEl = useRef<HTMLParagraphElement>(null);
  const splitQuoteRef = useRef<SplitText | null>(null);
  const splitAuthorRef = useRef<SplitText | null>(null);

  // refs для кнопки
  const btnRef = useRef<HTMLButtonElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  // актуальный фон для hover
  const bgRef = useRef(bgColor);
  useEffect(() => { bgRef.current = bgColor; }, [bgColor]);

  // буфер данных
  const bufferRef = useRef<ZQ[]>([]);
  const fetchingRef = useRef(false);

  // ждем загрузки шрифтов
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    const anyDoc = document as any;
    if ("fonts" in document) {
      anyDoc.fonts.ready.then(() => mounted && setFontsReady(true));
    } else {
      setFontsReady(true);
    }
    return () => { mounted = false; };
  }, []);

  // сброс буфера и цвета при смене категории/палитры
  useEffect(() => {
    bufferRef.current = [];
    setQuote("");
    setAuthor("");

    const first = (palette && palette.length ? palette[0] : "#000");
    setBgColor(first);
    bgRef.current = first;
  }, [keySeed, category, palette]);

  // загрузка пачки
    const loadBatch = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
        // увеличим выборку
        const url = new URL(buildUrl(), window.location.origin);
        if (!url.searchParams.has("per")) url.searchParams.set("per", "80");

        const res = await fetch(url.toString(), { cache: "no-store", keepalive: true });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();

        const list = (payload?.data ?? payload?.items) as any[] | undefined;
        const single = !list && payload?.text && payload?.author ? payload : null;

        let mapped: ZQ[] = [];
        if (Array.isArray(list)) {
        mapped = list.map((d: any) => ({
            id: d.id ?? d._id ?? undefined,
            q: d.q ?? d.text ?? "",
            a: d.a ?? d.author ?? "",
        })).filter((d: ZQ) => d.q && d.a);
        } else if (single) {
        mapped = [{
            id: single.id ?? single._id ?? undefined,
            q: String(single.text),
            a: String(single.author),
        }];
        }

        if (mapped.length) {
        bufferRef.current = bufferRef.current.concat(mapped).slice(0, 150);
        }
    } catch (e) {
        console.error("loadBatch error:", e);
    } finally {
        fetchingRef.current = false;
    }
    };

    const ensureBuffer = async () => {
    if (bufferRef.current.length === 0) await loadBatch();
    // стартуем дозагрузку заранее
    if (!fetchingRef.current && bufferRef.current.length <= 10) void loadBatch();
    };


  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const nextFromBuffer = async (): Promise<ZQ | null> => {
    await ensureBuffer();
    // подождать буфер до 250–300 мс, если идёт fetch
    for (let i = 0; i < 8 && bufferRef.current.length === 0 && fetchingRef.current; i++) {
        await sleep(30);
    }
    const item = bufferRef.current.shift();
    return item ?? null; // НЕТ "Please try again."
  };

  // анимация появления
  useLayoutEffect(() => {
    if (!fontsReady) return;
    const q = quoteEl.current, a = authorEl.current;
    if (!q || !a || !quote) return;

    splitQuoteRef.current?.revert();
    splitAuthorRef.current?.revert();

    gsap.set([q, a], { autoAlpha: 1 });

    const ctx = gsap.context(() => {
      const sq = new SplitText(q, { type: "words,chars", wordsClass: "split-word", charsClass: "split-char" });
      const sa = new SplitText(a, { type: "words,chars", wordsClass: "split-word", charsClass: "split-char" });
      splitQuoteRef.current = sq;
      splitAuthorRef.current = sa;

      gsap.from([...sq.chars, ...sa.chars], {
        duration: 0.6,
        autoAlpha: 0,
        y: 8,
        scale: 0.8,
        force3D: true,
        stagger: 0.02,
        onComplete: () => { gsap.set([q, a], { clearProps: "opacity,visibility" }); },
      });
    });

    return () => {
      ctx?.revert();
      quoteEl.current?.isConnected && splitQuoteRef.current?.revert();
      authorEl.current?.isConnected && splitAuthorRef.current?.revert();
      splitQuoteRef.current = null;
      splitAuthorRef.current = null;
    };
  }, [fontsReady, quote, author]);

  // кнопка: следующая цитата
  const fetchQuote = async () => {
    const q = quoteEl.current, a = authorEl.current;
    if (!q || !a) return;

    if (!splitQuoteRef.current || !splitAuthorRef.current) {
      splitQuoteRef.current = new SplitText(q, { type: "words,chars", wordsClass: "split-word", charsClass: "split-char" });
      splitAuthorRef.current = new SplitText(a, { type: "words,chars", wordsClass: "split-word", charsClass: "split-char" });
    }

    const chars = [
      ...(splitQuoteRef.current?.chars ?? []),
      ...(splitAuthorRef.current?.chars ?? []),
    ];

    await gsap.to(chars, { duration: 0.45, autoAlpha: 0, scale: 0.5, y: -20, stagger: 0.02 });

    gsap.set([q, a], { autoAlpha: 0 });
    splitQuoteRef.current?.revert();
    splitAuthorRef.current?.revert();
    splitQuoteRef.current = null;
    splitAuthorRef.current = null;

    setQuote("");
    setAuthor("");
    const item = await nextFromBuffer();
    if (item) {
        setQuote(item.q);
        setAuthor(item.a);
        setCurrentId(item.id ? String(item.id) : null);
    }
  };

  // первичная загрузка
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
            const url = new URL(buildUrl(), window.location.origin);
            if (!url.searchParams.has("per")) url.searchParams.set("per", "80");

            const res = await fetch(url.toString(), { cache: "no-store", keepalive: true });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const payload = await res.json();

            const list = (payload?.data ?? payload?.items) as any[] | undefined;
            const single = !list && payload?.text && payload?.author ? payload : null;

            let mapped: ZQ[] = [];
            if (Array.isArray(list)) mapped = list.map((d: any) => ({ id: d.id ?? d._id, q: d.text, a: d.author })).filter((d: ZQ) => d.q && d.a);
            else if (single) mapped = [{ id: single.id ?? single._id, q: String(single.text), a: String(single.author) }];

            if (!mapped.length || cancelled) return;

            // фон под категорию
            const firstColor = (palette && palette.length ? palette[0] : "#000");
            setBgColor(firstColor);
            bgRef.current = firstColor;

            // показать первую и закинуть хвост в буфер
            const [first, ...rest] = mapped;
            setQuote(first.q);
            setAuthor(first.a);
            setCurrentId(first.id ? String(first.id) : null);
            bufferRef.current = rest.slice(0, 149);

            // стартовать фоновую дозагрузку независимо от наличия ?per=
            void loadBatch();
            } catch (e) {
            console.error("initial load failed:", e);
            }
        })();
        return () => { cancelled = true; };
        // важно: реагируем на смену ключа и URL-билдера
        }, [keySeed, buildUrl, palette]);

        // 3) Необязательно, но полезно: прогрев буфера на маунте
        useEffect(() => { void ensureBuffer(); }, [keySeed, buildUrl]);

  // смена фона каждые 30 сек на основе palette
  useEffect(() => {
    if (!palette || palette.length === 0) return;
    const id = setInterval(() => {
      setBgColor(prev => {
        let next = palette[Math.floor(Math.random() * palette.length)];
        if (palette.length > 1 && next === prev) {
          const i = (palette.indexOf(prev) + 1) % palette.length;
          next = palette[i];
        }
        bgRef.current = next;
        return next;
      });
    }, 30000);
    return () => clearInterval(id);
  }, [palette]);

  // hover-анимация кнопки
  useEffect(() => {
    const btn = btnRef.current, fill = fillRef.current, label = labelRef.current;
    if (!btn || !fill || !label) return;

    gsap.set(fill, { scaleX: 0, transformOrigin: "left center" });
    gsap.set(label, { css: { color: "#fff", "-webkit-text-fill-color": "#fff", opacity: 1 } });

    const enter = () => {
      const c = bgRef.current;
      const tl = gsap.timeline({ defaults: { duration: 0.35, ease: "power2.out" } });
      tl.to(fill, { scaleX: 1 }, 0);
      tl.to(label, { color: c }, 0);
      tl.to(label, { css: { "-webkit-text-fill-color": c } }, 0); // Safari
    };

    const leave = () => {
      const tl = gsap.timeline({ defaults: { duration: 0.35, ease: "power2.inOut" } });
      tl.to(fill, { scaleX: 0, transformOrigin: "right center" }, 0);
      tl.to(label, { color: "#fff" }, 0);
      tl.to(label, { css: { "-webkit-text-fill-color": "#fff" } }, 0);
    };

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

  return (
    <div
      className="flex flex-col items-center justify-center h-screen px-4"
      style={{
        position: "relative",
        zIndex: 1,
        backgroundColor: bgColor,
        transition: "background-color 10s linear",
      }}
    >
      <div className="max-w-3xl w-full quote-container">
        <h1
          ref={quoteEl}
          className="text-4xl md:text-6xl font-serif text-white leading-snug px-4 text-center"
        >
          {quote ? `"${quote}"` : "\u00A0"}
        </h1>
        <p ref={authorEl} className="mt-4 text-2xl text-white/70 text-right">
          {author ? `— ${author}` : "\u00A0"}
        </p>
      </div>
      <div className="mt-16 flex items-center">
        {showNext && (
            <button
            ref={btnRef}
            className="relative inline-flex items-center justify-center overflow-hidden rounded-4xl border border-white px-8 py-4"
            onClick={fetchQuote}
            style={{ WebkitTapHighlightColor: "transparent" }}
            >
            <span
                ref={fillRef}
                className="absolute inset-0 z-0 pointer-events-none"
                style={{ background: "#fff", transform: "scaleX(0)", transformOrigin: "left center" }}
            />
            <span
                ref={labelRef}
                className="relative z-10 font-semibold select-none"
                style={{ color: "#fff" }}
            >
                New one
            </span>
            </button>
        )}

        {/* справа от New one */}
        <FavButton quoteId={currentId} />
      </div>

    </div>
  );
}
