"use client";
import CategoriesDrawer from "@/components/CategoriesDrawer";
import QuoteScreen from "@/components/QuoteScreen";

export default function Home() {
  return (
  <>
    <CategoriesDrawer />
    <QuoteScreen buildUrl={() => "/api/quotes?per=50&maxLen=40"} keySeed="home" />
  </>
  )
}
