"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import SplitText from "gsap/dist/SplitText";
gsap.registerPlugin(SplitText);

type ZQ = { q: string; a: string; h?: string };

export default function Home() {
  const colors = [
    "#1A1A40","#3C096C","#5A189A","#7B2CBF","#9D4EDD",
    "#0F4C5C","#2A9D8F","#1D3557","#264653","#2C2A4A",
    "#5C374C","#6A040F","#9D0208","#DC2F02","#283618"
  ];

  const [bgColor, setBgColor] = useState(colors[0]);
  const [quote, setQuote] = useState("");
  const [author, setAuthor] = useState("");

  const quoteEl = useRef<HTMLHeadingElement>(null);
  const authorEl = useRef<HTMLParagraphElement>(null);

  const splitQuoteRef = useRef<SplitText | null>(null);
  const splitAuthorRef = useRef<SplitText | null>(null);

  const btnRef = useRef<HTMLButtonElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  // актуальный цвет фона для hover без смены deps
  const bgRef = useRef(bgColor);
  useEffect(() => { bgRef.current = bgColor; }, [bgColor]);

  // буфер цитат
  const bufferRef = useRef<ZQ[]>([]);
  const fetchingRef = useRef(false);

  // ждать шрифты, чтобы не было "SplitText called before fonts loaded"
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    const anyDoc = document as any;
    if ("fonts" in document) {
      anyDoc.fonts.ready.then(() => { if (mounted) setFontsReady(true); });
    } else {
      setFontsReady(true);
    }
    return () => { mounted = false; };
  }, []);

  // загрузка пачки из /api/quotes
  const loadBatch = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await fetch("/api/quotes", { cache: "no-store" });
      if (!res.ok) throw new Error("Upstream error");
      const data: ZQ[] = await res.json();
      const cleaned = (Array.isArray(data) ? data : []).filter(d => d?.q && d?.a).slice(0, 50);
      bufferRef.current = bufferRef.current.concat(cleaned).slice(0, 100);
    } catch (e) {
      if (bufferRef.current.length === 0) {
        bufferRef.current.push({ q: "Не удалось загрузить цитаты. Попробуйте позже.", a: "" });
      }
      console.error("loadBatch error:", e);
    } finally {
      fetchingRef.current = false;
    }
  };

  const ensureBuffer = async () => {
    if (bufferRef.current.length === 0) await loadBatch();
    if (bufferRef.current.length <= 5) void loadBatch();
  };

  const nextFromBuffer = async (): Promise<ZQ> => {
    await ensureBuffer();
    const item = bufferRef.current.shift();
    return item ?? { q: "Please try again.", a: "" };
  };

  // эффект появления нового текста
  useLayoutEffect(() => {
    if (!fontsReady) return;
    const q = quoteEl.current, a = authorEl.current;
    if (!q || !a || !quote) return;

    // вернуть прошлые сплиты
    splitQuoteRef.current?.revert();
    splitAuthorRef.current?.revert();

    // родители видимы
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

  // кнопка — показать следующую цитату
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

    await gsap.to(chars, {
      duration: 0.45,
      autoAlpha: 0,
      scale: 0.5,
      y: -20,
      stagger: 0.02,
    });

    // спрятать родителей и откатить SplitText
    gsap.set([q, a], { autoAlpha: 0 });
    splitQuoteRef.current?.revert();
    splitAuthorRef.current?.revert();
    splitQuoteRef.current = null;
    splitAuthorRef.current = null;

    // очистить, затем поставить новые данные
    setQuote("");
    setAuthor("");
    const item = await nextFromBuffer();
    setQuote(item.q);
    setAuthor(item.a);
  };

  // первичная загрузка
  useEffect(() => {
    (async () => {
      await ensureBuffer();
      const item = await nextFromBuffer();
      setQuote(item.q);
      setAuthor(item.a);
    })();
  }, []);

  // смена фона
  useEffect(() => {
    const id = setInterval(() => {
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      setBgColor(randomColor);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // hover-анимация кнопки: заливка белым, текст «исчезает» за счёт покраски в цвет фона
  useEffect(() => {
    const btn = btnRef.current, fill = fillRef.current, label = labelRef.current;
    if (!btn || !fill || !label) return;

    gsap.set(fill, { scaleX: 0, transformOrigin: "left center" });
    gsap.set(label, { css: { color: "#fff", "-webkit-text-fill-color": "#fff", opacity: 1 } });

    const enter = () => {
      const c = bgRef.current;
      const tl = gsap.timeline({ defaults: { duration: 0.35, ease: "power2.out" } });
      tl.to(fill, { scaleX: 1 }, 0);
      // буквы закрашиваем цветом фона страницы => на белой заливке визуально «вырезаны»
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
    // для тач-устройств: имитируем hover при touchstart
    btn.addEventListener("touchstart", enter, { passive: true });
    btn.addEventListener("touchend", leave, { passive: true });

    return () => {
      btn.removeEventListener("mouseenter", enter);
      btn.removeEventListener("mouseleave", leave);
      btn.removeEventListener("touchstart", enter);
      btn.removeEventListener("touchend", leave);
    };
  }, []); // фиксированный размер deps

  return (
    <div
      className="flex flex-col items-center justify-center h-screen px-4"
      style={{ position: "relative", zIndex: 1, backgroundColor: bgColor, transition: "background-color 10s ease" }}
    >
      <div className="max-w-3xl w-full quote-container">
        <h1 ref={quoteEl} className="text-4xl md:text-6xl font-serif text-white leading-snug px-4 text-center">
          {quote ? `"${quote}"` : "\u00A0"}
        </h1>
        <p ref={authorEl} className="mt-4 text-2xl text-white/70 text-right">
          {author ? `— ${author}` : "\u00A0"}
        </p>
      </div>

      <button
        ref={btnRef}
        className="relative mt-16 inline-flex items-center justify-center overflow-hidden rounded-4xl border border-white px-8 py-4"
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
    </div>
  );
}
