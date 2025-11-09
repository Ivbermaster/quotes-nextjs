// app/favorites/page.tsx
import FavoritesList from "@/components/FavoritesList";

export default function FavoritesPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <header className="mb-8 flex items-end justify-between">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Favorites</h1>
          <a href="/" className="text-white/70 hover:text-white text-sm">← Back</a>
        </header>

        <FavoritesList />
      </div>
    </main>
  );
}
