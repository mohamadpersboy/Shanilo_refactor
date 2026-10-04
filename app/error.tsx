"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-3 p-6">
      <h1 className="text-xl font-bold">خطایی رخ داد</h1>
      <button type="button" onClick={reset} className="rounded border px-4 py-2">
        تلاش دوباره
      </button>
    </main>
  );
}
