// app/api/quotes/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ZEN_URL = "https://zenquotes.io/api/quotes";
const FETCH_TIMEOUT = 8000;

async function fetchWithTimeout(url: string, timeout = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "quotes-proxy/1.0" },
      cache: "no-store",
    });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET() {
  try {
    const res = await fetchWithTimeout(ZEN_URL);
    if (!res.ok) {
      // на dev иногда 429 — вернём безопасный мок, чтобы UI жил
      if (res.status === 429) {
        const mock = [{ q: "Too many requests. Please try again later.", a: "ZenQuotes" }];
        return NextResponse.json(mock, {
          status: 200,
          headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" },
        });
      }
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: "Upstream error", status: res.status, body: text.slice(0, 200) },
        { status: res.status, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const data = await res.json().catch(() => []);
    const cleaned = Array.isArray(data)
      ? data.filter((d: any) => d?.q && d?.a).slice(0, 50)
      : [];

    return NextResponse.json(cleaned, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    const message = err?.name === "AbortError" ? "Upstream timeout" : "Fetch failed";
    return NextResponse.json(
      { error: message },
      { status: 504, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
