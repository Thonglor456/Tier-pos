import { Link } from "wouter";
import { BarChart2, Settings, Coffee } from "lucide-react";
import type { SalesChannel } from "@/types/pos";

interface Props {
  channel: SalesChannel;
  onChannelChange: (ch: SalesChannel) => void;
  cartCount: number;
}

export default function POSHeader({ channel, onChannelChange, cartCount }: Props) {
  return (
    <header className="flex items-center justify-between px-5 py-3 bg-card border-b border-border shrink-0 shadow-sm">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "oklch(0.38 0.08 50)" }}>
          <Coffee className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
          Tier Coffee
        </span>
      </div>

      {/* Channel Selector */}
      <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
        <button
          onClick={() => onChannelChange("walkin")}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
            channel === "walkin"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          หน้าร้าน
        </button>
        <button
          onClick={() => onChannelChange("grab")}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
            channel === "grab"
              ? "shadow-sm text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
          style={channel === "grab" ? { background: "oklch(0.52 0.18 145)" } : {}}
        >
          Grab
        </button>
      </div>

      {/* Nav */}
      <div className="flex items-center gap-2">
        <Link href="/reports">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <BarChart2 className="w-4 h-4" />
            <span className="hidden sm:inline">รายงาน</span>
          </button>
        </Link>
        <Link href="/admin">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">จัดการ</span>
          </button>
        </Link>
      </div>
    </header>
  );
}

