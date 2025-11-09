"use client";
import CategoriesDrawer from "@/components/CategoriesDrawer";
import { useParams } from "next/navigation";
import QuoteScreen from "@/components/QuoteScreen";

export default function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const cat = Array.isArray(category) ? category[0] : category; // safety
  const q = decodeURIComponent(cat || "");
  const qs = () => `/api/quotes?per=50&maxLen=60&categories=${encodeURIComponent(q)}`;
  return (
  <>
    <CategoriesDrawer />
    <QuoteScreen buildUrl={qs} keySeed={`cat:${q}`} category={q}/>
  </>)
}
