import CategoriesDrawer from "@/components/CategoriesDrawer";
import QuoteScreen from "@/components/QuoteScreen";

// можно убрать если не нужно
export const dynamic = "force-dynamic";

type Props = {
  searchParams: { [k: string]: string | string[] | undefined };
};

export default function OfTheDayPage({ searchParams }: Props) {
  const maxLen = typeof searchParams.maxLen === "string" ? searchParams.maxLen : undefined;

  return (
    <main className="min-h-screen">
      <CategoriesDrawer/>
      <QuoteScreen
        // без кнопки "New one"
        showNext={false}
        // передаём сборку URL без useSearchParams
        buildUrl={() => {
          const u = new URL("/api/quotes/of-the-day", "http://localhost"); // base нужна только для конструирования
          if (maxLen) u.searchParams.set("maxLen", maxLen);
          return u.pathname + (u.search ? u.search : "");
        }}
        keySeed={`qotd:${maxLen ?? "all"}`}
        category="special"
      />
    </main>
  );
}
