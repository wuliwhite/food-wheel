"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Disc3, UtensilsCrossed, UserCheck, ShieldAlert } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { isGuest, toggleGuestMode, deviceId } = useAuth();

  const navLinks = [
    { href: "/wheel", label: "Wheel", icon: Disc3 },
    { href: "/restaurants", label: "Restaurants", icon: UtensilsCrossed },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/wheel" className="flex items-center gap-2 font-black text-xl text-[#bd0f72]">
          <Disc3 className="w-7 h-7 text-[#bd0f72] animate-spin-slow" />
          <span>FOOD WHEEL</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#bd0f72]/10 text-[#bd0f72] border border-[#bd0f72]/30"
                    : "text-slate-600 hover:text-[#bd0f72] hover:bg-slate-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleGuestMode(!isGuest)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              isGuest
                ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            }`}
            title={`Device ID: ${deviceId}`}
          >
            {isGuest ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>Guest Mode (Read-Only)</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Device Logged In</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}