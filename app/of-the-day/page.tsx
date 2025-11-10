"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CategoriesDrawer from "@/components/CategoriesDrawer";
import QuoteScreen from "@/components/QuoteScreen";

export const dynamic = "force-dynamic";

function OfTheDayContent() {
  const params = useSearchParams();
  const maxLen = params.get("maxLen") ?? undefined;

  return (
    <main className="min-h-screen">
      <CategoriesDrawer />
      <QuoteScreen
        showNext={false}
        buildUrl={() => {
          const u = new URL("/api/quotes/of-the-day", "http://localhost");
          if (maxLen) u.searchParams.set("maxLen", maxLen);
          return u.pathname + (u.search ? u.search : "");
        }}
        keySeed={`qotd:${maxLen ?? "all"}`}
        category="special"
      />
    </main>
  );
}

export default function OfTheDayPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OfTheDayContent />
    </Suspense>
  );
}
