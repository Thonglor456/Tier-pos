import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { BarChart2, Settings, ShoppingCart, LogOut, MapPin, LayoutDashboard, ChevronDown } from "lucide-react";
import { useStaff } from "@/contexts/StaffContext";
import { useBranch } from "@/contexts/BranchContext";
import { trpc } from "@/lib/trpc";

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
    <div className="text-center hidden sm:block">
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
  const { currentBranch, setCurrentBranch } = useBranch();
  const isAdmin = currentStaff?.role === "admin";
  const { data: allBranches = [] } = trpc.branches.list.useQuery(undefined, { enabled: isAdmin });
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setBranchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return (
    <header className="bg-card border-b border-border shrink-0 shadow-sm">
      {/* Row 1: Logo | Clock | Nav icons */}
      <div className="flex items-center px-3 sm:px-5 py-2 gap-2">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden shadow-sm bg-black flex-shrink-0">
            <img src="/manus-storage/tier_logo_da9eb150.png" alt="Tier Coffee" className="w-full h-full object-cover" />
          </div>
          <div className="hidden sm:block">
            <div className="text-base font-bold text-foreground leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Tier Coffee</div>
            {isAdmin ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setBranchDropdownOpen((v) => !v)}
                  className="flex items-center gap-0.5 text-[10px] text-primary leading-none hover:underline"
                >
                  <MapPin className="w-2.5 h-2.5" />
                  <span>{currentBranch?.name ?? "เลือกสาขา"}</span>
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>
                {branchDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[140px]">
                    {allBranches.filter((b) => b.isActive).map((b) => (
                      <button
                        key={b.id}
                        onClick={() => { setCurrentBranch({ id: b.id, name: b.name }); setBranchDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg ${currentBranch?.id === b.id ? "text-primary font-semibold" : "text-foreground"}`}
                      >
                        {b.name}
                      </button>
                    ))}
                    {allBranches.filter((b) => b.isActive).length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">ยังไม่มีสาขา</p>
                    )}
                  </div>
                )}
              </div>
            ) : currentBranch ? (
              <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground leading-none">
                <MapPin className="w-2.5 h-2.5" /><span>{currentBranch.name}</span>
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground leading-none">Point of Sale</div>
            )}
          </div>
        </div>

        {/* Clock — desktop only */}
        <div className="hidden sm:flex flex-1 justify-center">
          <LiveClock />
        </div>

        {/* Mobile: branch name center */}
        <div className="flex sm:hidden flex-1 flex-col items-center">
          <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Tier Coffee</span>
          {isAdmin ? (
            <button onClick={() => setBranchDropdownOpen((v) => !v)} className="flex items-center gap-0.5 text-[10px] text-primary">
              <MapPin className="w-2.5 h-2.5" /><span>{currentBranch?.name ?? "เลือกสาขา"}</span><ChevronDown className="w-2.5 h-2.5" />
            </button>
          ) : currentBranch ? (
            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <MapPin className="w-2.5 h-2.5" /><span>{currentBranch.name}</span>
            </div>
          ) : null}
        </div>

        {/* Right: staff + nav */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {currentStaff && (
            <div className="flex items-center gap-1.5 mr-1">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center bg-primary text-sm leading-none">
                {currentStaff.role === "admin" ? "🔑" : currentStaff.role === "manager" ? "👑" : "⚡"}
              </div>
              <span className="text-xs text-muted-foreground hidden md:block">{currentStaff.name}</span>
            </div>
          )}
          <Link href="/dashboard">
            <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Dashboard">
              <LayoutDashboard className="w-4 h-4" />
            </button>
          </Link>
          <Link href="/reports">
            <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="รายงาน">
              <BarChart2 className="w-4 h-4" />
            </button>
          </Link>
          <Link href="/admin">
            <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="จัดการ">
              <Settings className="w-4 h-4" />
            </button>
          </Link>
          <button onClick={logout} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="ออกจากระบบ">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 2: Channel selector (all sizes) */}
      <div className="flex items-center gap-1 px-3 sm:px-5 pb-2 overflow-x-auto scrollbar-none">
        {channels.map((ch) => (
          <button
            key={ch.slug}
            onClick={() => onChannelChange(ch.slug)}
            className={`flex items-center gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-sm font-semibold transition-all duration-200 shrink-0 ${
              channelSlug === ch.slug ? "text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground bg-muted"
            }`}
            style={channelSlug === ch.slug ? { background: CHANNEL_COLORS[ch.slug] ?? "oklch(0.75 0.005 260)" } : {}}
          >
            {ch.slug === "walkin" && <ShoppingCart className="w-3.5 h-3.5" />}
            {ch.name}
          </button>
        ))}
      </div>
    </header>
  );
}
