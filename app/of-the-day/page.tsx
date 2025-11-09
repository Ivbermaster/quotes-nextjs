// app/of-the-day/page.tsx
"use client";
import { useSearchParams } from "next/navigation";
import QuoteScreen from "@/components/QuoteScreen";
import CategoriesDrawer from "@/components/CategoriesDrawer";

export default function OfTheDayPage() {
  const sp = useSearchParams();
  const maxLen = sp.get("maxLen") ?? "40"; // дефолт
  const qs = () => `/api/quotes/of-the-day?user=demo&maxLen=${encodeURIComponent(maxLen)}`;
  return (
  <>
    <CategoriesDrawer />
    <QuoteScreen buildUrl={qs} keySeed={`otd:${maxLen}`} category="wisdom" showNext={false} />;
  </>)
}
