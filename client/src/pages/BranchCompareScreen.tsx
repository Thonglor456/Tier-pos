import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useStaff } from "@/contexts/StaffContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { MapPin, TrendingUp, ShoppingCart, Coffee, XCircle, BarChart2 } from "lucide-react";

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtB(n: number) { return `฿${fmt(n)}`; }

type BranchRow = {
  branchId: number;
  branchName: string;
  revenue: number;
  orders: number;
  completed: number;
  cancelled: number;
  avgOrderValue: number;
};

export default function BranchCompareScreen() {
  const { currentStaff } = useStaff();
  const [, navigate] = useLocation();

  if (currentStaff?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-primary text-lg font-medium">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
          <p className="text-muted-foreground text-sm mt-1">เฉพาะแอดมินเท่านั้น</p>
          <Button onClick={() => navigate("/")} className="mt-4">กลับหน้าขาย</Button>
        </div>
      </div>
    );
  }

  const { data: rows = [], isLoading } = trpc.dashboard.branchComparison.useQuery(undefined, { refetchInterval: 30000 });

  const branchData = rows as BranchRow[];
  const topRevenue = branchData.length > 0 ? Math.max(...branchData.map((b) => b.revenue)) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <Link href="/dashboard">
          <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
        </Link>
        <img src="/tier-logo.svg" alt="Tier Coffee" className="h-8 w-8 rounded-full object-cover shrink-0" />
        <div className="min-w-0">
          <h1 className="font-bold text-base leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>เปรียบเทียบสาขา</h1>
          <p className="text-xs text-muted-foreground">วันนี้ · ทุกสาขา</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="hidden sm:inline">อัปเดตทุก 30 วินาที</span>
        </div>
      </div>

      <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-5">

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card rounded-2xl p-5 border border-border h-56 animate-pulse" />
            ))}
          </div>
        ) : branchData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm gap-3">
            <MapPin className="w-10 h-10 opacity-30" />
            <p>ยังไม่มีข้อมูลสาขา หรือยังไม่มีบิลวันนี้</p>
          </div>
        ) : (
          <>
            {/* Summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-card rounded-xl p-3 border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">สาขาทั้งหมด</p>
                <p className="text-2xl font-bold text-foreground">{branchData.length}</p>
              </div>
              <div className="bg-card rounded-xl p-3 border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">ยอดรวมทุกสาขา</p>
                <p className="text-xl font-bold text-emerald-400">{fmtB(branchData.reduce((s, b) => s + b.revenue, 0))}</p>
              </div>
              <div className="bg-card rounded-xl p-3 border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">บิลทั้งหมด</p>
                <p className="text-2xl font-bold text-blue-400">{fmt(branchData.reduce((s, b) => s + b.completed, 0))}</p>
              </div>
              <div className="bg-card rounded-xl p-3 border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">สาขายอดขายสูงสุด</p>
                <p className="text-sm font-bold text-primary truncate mt-1">
                  {branchData.sort((a, b) => b.revenue - a.revenue)[0]?.branchName ?? "-"}
                </p>
              </div>
            </div>

            {/* Branch cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...branchData].sort((a, b) => b.revenue - a.revenue).map((branch, idx) => {
                const revPct = topRevenue > 0 ? Math.round((branch.revenue / topRevenue) * 100) : 0;
                const isTop = idx === 0;
                return (
                  <div
                    key={branch.branchId}
                    className={`bg-card rounded-2xl p-5 border transition-all ${isTop ? "border-primary/50 shadow-md shadow-primary/10" : "border-border"}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isTop ? "bg-primary/20" : "bg-secondary"}`}>
                          <MapPin className={`w-4 h-4 ${isTop ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{branch.branchName}</p>
                          {isTop && <span className="text-[10px] text-primary font-medium">🏆 ยอดสูงสุด</span>}
                        </div>
                      </div>
                      <span className="text-lg font-bold text-muted-foreground/40 shrink-0">#{idx + 1}</span>
                    </div>

                    {/* Revenue bar */}
                    <div className="mb-4">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs text-muted-foreground">ยอดขาย</span>
                        <span className="text-base font-bold text-emerald-400">{fmtB(branch.revenue)}</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${revPct}%`, background: isTop ? "oklch(0.70 0.18 145)" : "oklch(0.50 0.008 260)" }}
                        />
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-secondary/50 rounded-lg p-2 flex items-center gap-2">
                        <ShoppingCart className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <div>
                          <p className="text-muted-foreground">บิลสำเร็จ</p>
                          <p className="font-semibold text-foreground">{fmt(branch.completed)}</p>
                        </div>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-2 flex items-center gap-2">
                        <BarChart2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <div>
                          <p className="text-muted-foreground">เฉลี่ย/บิล</p>
                          <p className="font-semibold text-foreground">{fmtB(branch.avgOrderValue)}</p>
                        </div>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-2 flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-muted-foreground">บิลทั้งหมด</p>
                          <p className="font-semibold text-foreground">{fmt(branch.orders)}</p>
                        </div>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-2 flex items-center gap-2">
                        <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <div>
                          <p className="text-muted-foreground">ยกเลิก</p>
                          <p className="font-semibold text-foreground">{fmt(branch.cancelled)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table view */}
            <div className="bg-card rounded-xl p-5 border border-border overflow-x-auto">
              <h2 className="font-semibold text-sm mb-4">ตารางเปรียบเทียบ</h2>
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="text-left text-muted-foreground text-xs border-b border-border">
                    <th className="pb-2 font-medium">สาขา</th>
                    <th className="pb-2 font-medium text-right">ยอดขาย</th>
                    <th className="pb-2 font-medium text-right">บิลสำเร็จ</th>
                    <th className="pb-2 font-medium text-right">ยกเลิก</th>
                    <th className="pb-2 font-medium text-right">เฉลี่ย/บิล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...branchData].sort((a, b) => b.revenue - a.revenue).map((branch, idx) => (
                    <tr key={branch.branchId} className={idx === 0 ? "bg-primary/5" : "hover:bg-secondary/30 transition-colors"}>
                      <td className="py-2.5 flex items-center gap-2">
                        {idx === 0 && <span className="text-xs">🏆</span>}
                        <span className={`font-medium ${idx === 0 ? "text-primary" : "text-foreground"}`}>{branch.branchName}</span>
                      </td>
                      <td className="py-2.5 text-right font-bold text-emerald-400">{fmtB(branch.revenue)}</td>
                      <td className="py-2.5 text-right text-blue-400">{fmt(branch.completed)}</td>
                      <td className="py-2.5 text-right text-red-400">{fmt(branch.cancelled)}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{fmtB(branch.avgOrderValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
