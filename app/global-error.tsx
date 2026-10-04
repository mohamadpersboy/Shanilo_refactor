"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <main style={{ padding: 24 }}>
          <h1>خطایی رخ داد</h1>
          <button type="button" onClick={reset}>
            تلاش دوباره
          </button>
        </main>
      </body>
    </html>
  );
}
