import { useState, useEffect } from "react";
import { Link } from "wouter";
import { BarChart2, Settings, ShoppingCart, LogOut, MapPin, LayoutDashboard } from "lucide-react";
import { useStaff } from "@/contexts/StaffContext";
import { useBranch } from "@/contexts/BranchContext";

interface Props {
  channelSlug: string;
  channels: Array<{ id: number; slug: string; name: string }>;
  onChannelChange: (slug: string) => void;
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

  const CHANNEL_COLORS: Record<string, string> = {
  walkin: "oklch(0.82 0.14 75)",
  grab: "oklch(0.52 0.18 145)",
  lineman: "oklch(0.52 0.22 200)",
};

export default function POSHeader({ channelSlug, channels, onChannelChange, cartCount }: Props) {
  const { currentStaff, logout } = useStaff();
  const { currentBranch } = useBranch();
  return (
    <header className="flex items-center justify-between px-5 py-2.5 bg-card border-b border-border shrink-0 shadow-sm">
      <div className="flex items-center gap-2.5 min-w-[160px]">
        <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm bg-black flex-shrink-0">
          <img src="/manus-storage/tier_logo_da9eb150.png" alt="Tier Coffee" className="w-full h-full object-cover" />
        </div>
        <div>
          <div className="text-base font-bold text-foreground leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Tier Coffee</div>
          {currentBranch ? (
            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground leading-none">
              <MapPin className="w-2.5 h-2.5" /><span>{currentBranch.name}</span>
            </div>
          ) : (
            <div className="text-[10px] text-muted-foreground leading-none">Point of Sale</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-6">
        <LiveClock />
        <div className="flex items-center gap-1 rounded-xl p-1 bg-muted">
          {channels.map((ch) => (
            <button
              key={ch.slug}
              onClick={() => onChannelChange(ch.slug)}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                channelSlug === ch.slug ? "text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
              }`}
              style={channelSlug === ch.slug ? { background: CHANNEL_COLORS[ch.slug] ?? "oklch(0.75 0.005 260)" } : {}}
            >
              {ch.slug === "walkin" && <ShoppingCart className="w-3.5 h-3.5" />}
              {ch.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 min-w-[160px] justify-end">
        {currentStaff && (
          <div className="flex items-center gap-2 mr-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold bg-primary">
              {currentStaff.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-muted-foreground hidden md:block">{currentStaff.name}</span>
          </div>
        )}
        <Link href="/dashboard">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden md:block">Dashboard</span>
          </button>
        </Link>
        <Link href="/reports">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <BarChart2 className="w-4 h-4" />
            <span>รายงาน</span>
          </button>
        </Link>
        <Link href="/admin">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <Settings className="w-4 h-4" />
            <span>จัดการ</span>
          </button>
        </Link>
        <button onClick={logout} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="ออกจากระบบ">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
