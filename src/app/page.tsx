"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [guestName, setGuestName] = useState("");
  const router = useRouter();

  useEffect(() => {
    // If already joined, redirect to their personalized slug
    const savedName = localStorage.getItem("snapmoment_guest_name");
    if (savedName) {
      const slug = savedName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
      router.push(`/e/${slug}`);
    }
  }, [router]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (guestName.trim()) {
      localStorage.setItem("snapmoment_guest_name", guestName.trim());
      const slug = guestName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
      router.push(`/e/${slug}`);
    }
  };

  return (
    <main className="flex flex-col min-h-screen bg-neutral-950 items-center justify-center p-4">
      <div className="bg-neutral-900 p-8 rounded-3xl w-full max-w-sm text-center border border-neutral-800 shadow-2xl">
        <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">SnapMoment</h1>
        <p className="text-neutral-400 text-sm mb-8">
          Kamera sekali pakai digital untuk acaramu. Masukkan nama untuk mulai memotret.
        </p>
        <form onSubmit={handleJoin} className="flex flex-col space-y-4">
          <input
            type="text"
            placeholder="Nama Anda"
            required
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700] transition-all"
          />
          <button
            type="submit"
            className="w-full bg-[#FFD700] text-black font-bold rounded-xl px-4 py-3 hover:bg-yellow-400 active:scale-[0.98] transition-all"
          >
            Mulai Memotret
          </button>
        </form>
      </div>
    </main>
  );
}
