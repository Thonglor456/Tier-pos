import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { BarChart2, Settings, Coffee, Package, ClipboardList, ShoppingCart, Users, Tag } from "lucide-react";
import type { SalesChannel } from "@/types/pos";

interface Props {
  channel: SalesChannel;
  onChannelChange: (ch: SalesChannel) => void;
  cartCount: number;
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-foreground leading-none" style={{ fontFamily: "'Playfair Display', serif" }}>{time}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{date}</div>
    </div>
  );
}

export default function POSHeader({ channel, onChannelChange, cartCount }: Props) {
  return (
    <header className="flex items-center justify-between px-5 py-2.5 bg-card border-b border-border shrink-0 shadow-sm">
      {/* Brand */}
      <div className="flex items-center gap-2.5 min-w-[160px]">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm" style={{ background: "oklch(0.38 0.08 50)" }}>
          <Coffee className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <div className="text-base font-bold text-foreground leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Tier Coffee</div>
          <div className="text-[10px] text-muted-foreground leading-none">Point of Sale</div>
        </div>
      </div>

      {/* Center: Clock + Channel Selector */}
      <div className="flex items-center gap-6">
        <LiveClock />
        {/* Channel Selector */}
        <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: "oklch(0.93 0.015 75)" }}>
          <button
            onClick={() => onChannelChange("walkin")}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              channel === "walkin"
                ? "text-white shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
            style={channel === "walkin" ? { background: "oklch(0.38 0.08 50)" } : {}}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            หน้าร้าน
          </button>
          <button
            onClick={() => onChannelChange("grab")}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              channel === "grab"
                ? "text-white shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
            style={channel === "grab" ? { background: "oklch(0.52 0.18 145)" } : {}}
          >
            Grab
          </button>
        </div>
      </div>

      {/* Right Nav */}
      <div className="flex items-center gap-1 min-w-[160px] justify-end">
        <Link href="/reports">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <BarChart2 className="w-4 h-4" />
            <span>รายงาน</span>
          </button>
        </Link>
        <Link href="/admin">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Settings className="w-4 h-4" />
            <span>จัดการ</span>
          </button>
        </Link>
      </div>
    </header>
  );
}
