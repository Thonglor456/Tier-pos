import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Legend,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { useStaff } from "@/contexts/StaffContext";
import { Button } from "@/components/ui/button";
import { toCSV, downloadFile, formatDateForFilename } from "@/lib/exportUtils";
import { Download, TrendingUp, TrendingDown, Minus, MapPin, GitCompareArrows } from "lucide-react";
import { toast } from "sonner";

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtB(n: number) { return `฿${fmt(n)}`; }

type ChartPeriod = "week" | "month";
type TopPeriod = "day" | "month";
type TopItem = { itemId: number; itemName: string; variantName: string; totalQty: number; totalRevenue: number };
type ChartEntry = { date: string; revenue: number; orders: number };
type RecentOrder = {
  id: number; createdAt: Date; salesChannel: string; paymentMethod: string;
  totalAmount: string | number; status: string;
};

function changePct(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((current - prev) / prev) * 100);
}

export default function DashboardScreen() {
  const { currentStaff } = useStaff();
  const [, navigate] = useLocation();
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("week");
  const [topPeriod, setTopPeriod] = useState<TopPeriod>("day");
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined);

  if (currentStaff?.role !== "manager" && currentStaff?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-primary text-lg font-medium">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
          <p className="text-muted-foreground text-sm mt-1">เฉพาะผู้จัดการและแอดมินเท่านั้น</p>
          <Button onClick={() => navigate("/")} className="mt-4 bg-primary text-white">กลับหน้าขาย</Button>
        </div>
      </div>
    );
  }

  const { data: branches = [] } = trpc.branches.list.useQuery();
  const activeBranches = branches.filter((b) => b.isActive);
  const branchInput = selectedBranchId ? { branchId: selectedBranchId } : undefined;

  const { data: summary, isLoading: loadingSummary } = trpc.dashboard.todaySummary.useQuery(branchInput, { refetchInterval: 30000 });
  const { data: monthComp } = trpc.dashboard.monthComparison.useQuery(branchInput, { refetchInterval: 60000 });
  const { data: topItems, isLoading: loadingTop } = trpc.dashboard.topItemsWithVariant.useQuery(
    { period: topPeriod, limit: 12, branchId: selectedBranchId }, { refetchInterval: 60000 }
  );
  const { data: weeklyData } = trpc.dashboard.weeklyRevenue.useQuery(branchInput, { refetchInterval: 60000 });
  const { data: monthlyData } = trpc.dashboard.monthlyRevenue.useQuery(branchInput, { refetchInterval: 60000 });
  const { data: hourlyData } = trpc.dashboard.hourlyRevenue.useQuery(branchInput, { refetchInterval: 60000 });
  const { data: recentOrders } = trpc.dashboard.recentOrders.useQuery({ limit: 10 }, { refetchInterval: 15000 });
  const { data: channels = [] } = trpc.channels.list.useQuery();

  const chartData: ChartEntry[] | undefined = chartPeriod === "week"
    ? weeklyData
    : monthlyData?.map((d: { day: number; revenue: number; orders: number }) => ({ date: `${d.day}`, revenue: d.revenue, orders: d.orders }));

  const paymentLabel: Record<string, string> = {
    cash: "เงินสด", transfer: "โอนธนาคาร", thai_chuay_thai: "ไทยช่วยไทย",
  };
  function channelLabel(slug: string) {
    return channels.find((c) => c.slug === slug)?.name ?? slug;
  }

  const handleExportTopItems = useCallback(() => {
    if (!topItems || topItems.length === 0) { toast.error("ไม่มีข้อมูลสินค้าขายดีที่จะ Export"); return; }
    const csv = toCSV((topItems as TopItem[]).map((item, idx) => ({
      rank: idx + 1, itemName: item.itemName, variantName: item.variantName,
      totalQty: item.totalQty, totalRevenue: item.totalRevenue.toFixed(2),
    })), [
      { key: "rank", label: "อันดับ" }, { key: "itemName", label: "ชื่อสินค้า" },
      { key: "variantName", label: "ประเภท" }, { key: "totalQty", label: "จำนวน (แก้ว)" },
      { key: "totalRevenue", label: "ยอดรวม (บาท)" },
    ]);
    downloadFile(csv, `tier_coffee_top_items_${topPeriod}_${formatDateForFilename(new Date())}.csv`);
    toast.success(`Export สินค้าขายดี ${topItems.length} รายการ`);
  }, [topItems, topPeriod]);

  const handleExportRecentOrders = useCallback(() => {
    if (!recentOrders || recentOrders.length === 0) { toast.error("ไม่มีบิลที่จะ Export"); return; }
    const csv = toCSV((recentOrders as RecentOrder[]).map((o) => ({
      id: o.id,
      time: new Date(o.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
      channel: channelLabel(o.salesChannel),
      payment: paymentLabel[o.paymentMethod] ?? o.paymentMethod,
      total: parseFloat(String(o.totalAmount)).toFixed(2),
      status: o.status === "completed" ? "สำเร็จ" : "ยกเลิก",
    })), [
      { key: "id", label: "เลขบิล" }, { key: "time", label: "เวลา" },
      { key: "channel", label: "ช่องทาง" }, { key: "payment", label: "วิธีชำระ" },
      { key: "total", label: "ยอดรวม (บาท)" }, { key: "status", label: "สถานะ" },
    ]);
    downloadFile(csv, `tier_coffee_recent_orders_${formatDateForFilename(new Date())}.csv`);
    toast.success(`Export บิลล่าสุด ${recentOrders.length} รายการ`);
  }, [recentOrders, channels]);

  const revPct = changePct(monthComp?.thisMonth ?? 0, monthComp?.lastMonth ?? 0);
  const ordPct = changePct(monthComp?.thisMonthOrders ?? 0, monthComp?.lastMonthOrders ?? 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/">
            <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          </Link>
          <img src="/tier-logo.svg" alt="Tier Coffee" className="h-8 w-8 rounded-full object-cover shrink-0" />
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-tight truncate" style={{ fontFamily: "'Playfair Display', serif" }}>Dashboard</h1>
            <p className="text-xs text-muted-foreground truncate">ยินดีต้อนรับ, {currentStaff?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {/* Branch Filter */}
          {activeBranches.length > 1 && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <select
                value={selectedBranchId ?? ""}
                onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : undefined)}
                className="text-xs bg-secondary border border-border rounded-lg px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">ทุกสาขา</option>
                {activeBranches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          {/* Branch Compare */}
          {currentStaff?.role === "admin" && activeBranches.length > 1 && (
            <Link href="/branch-compare">
              <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-secondary text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="เปรียบเทียบสาขา">
                <GitCompareArrows className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">เปรียบเทียบ</span>
              </button>
            </Link>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="hidden sm:inline">อัปเดตทุก 30 วินาที</span>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-6 space-y-5 max-w-7xl mx-auto">

        {/* ─── KPI วันนี้ ─────────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">สรุปยอดวันนี้</h2>
          {loadingSummary ? (
            <div className="grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-5 gap-3">
              {[...Array(5)].map((_, i) => <div key={i} className="bg-card rounded-xl p-4 h-24 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-5 gap-3">
              <KPICard label="ยอดขายรวม" value={fmtB(summary?.revenue ?? 0)} sub="บิลที่สำเร็จ" color="text-emerald-400" icon="💰" />
              <KPICard label="จำนวนบิล" value={fmt(summary?.orders ?? 0)} sub={`สำเร็จ ${summary?.completed ?? 0} / ยกเลิก ${summary?.cancelled ?? 0}`} color="text-blue-400" icon="🧾" />
              <KPICard label="แก้วที่ขาย" value={`${fmt(summary?.cupsSold ?? 0)} แก้ว`} sub="จากบิลที่สำเร็จ" color="text-cyan-400" icon="☕" />
              <KPICard label="เฉลี่ย/บิล" value={fmtB(summary?.avgOrderValue ?? 0)} sub="เฉพาะบิลที่สำเร็จ" color="text-purple-400" icon="📊" />
              <KPICard label="บิลยกเลิก" value={fmt(summary?.cancelled ?? 0)} sub={`จาก ${summary?.orders ?? 0} บิลทั้งหมด`} color="text-red-400" icon="❌" />
            </div>
          )}
        </div>

        {/* ─── KPI เดือนนี้ vs เดือนที่แล้ว ─────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">เดือนนี้ vs เดือนที่แล้ว</h2>
          <div className="grid grid-cols-2 gap-3">
            <MonthKPICard
              label="ยอดขายเดือนนี้"
              value={fmtB(monthComp?.thisMonth ?? 0)}
              prev={fmtB(monthComp?.lastMonth ?? 0)}
              pct={revPct}
              icon="📈"
            />
            <MonthKPICard
              label="บิลเดือนนี้"
              value={`${fmt(monthComp?.thisMonthOrders ?? 0)} บิล`}
              prev={`${fmt(monthComp?.lastMonthOrders ?? 0)} บิล`}
              pct={ordPct}
              icon="🧾"
            />
          </div>
        </div>

        {/* ─── Channel Summary ─────────────────────────────────────────────── */}
        <div className="bg-card rounded-xl p-5 border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-sm">สรุปตามช่องทางการขาย</h2>
              <p className="text-xs text-muted-foreground mt-0.5">วันนี้</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {channels.map((channel) => {
              const detail = summary?.channelBreakdown?.[channel.slug] ?? { cupsSold: 0, orderCount: 0, revenue: 0 };
              return (
                <div key={channel.slug} className="rounded-lg border border-border bg-secondary/30 p-4">
                  <p className="text-sm font-semibold text-foreground">{channel.name}</p>
                  <p className="text-lg font-bold text-primary mt-2">{fmtB(Number(detail.revenue ?? 0))}</p>
                  <p className="text-xs text-muted-foreground mt-1">{detail.orderCount ?? 0} บิล · {detail.cupsSold ?? 0} แก้ว</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Revenue Chart + Top Items ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Revenue + Orders ComposedChart */}
          <div className="lg:col-span-2 bg-card rounded-xl p-5 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">ยอดขาย & จำนวนบิล</h2>
              <div className="flex gap-1 bg-secondary rounded-lg p-1">
                <button
                  onClick={() => setChartPeriod("week")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${chartPeriod === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >7 วัน</button>
                <button
                  onClick={() => setChartPeriod("month")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${chartPeriod === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >เดือนนี้</button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.008 260)" />
                <XAxis dataKey="date" tick={{ fill: "oklch(0.60 0.008 260)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="revenue" orientation="left" tick={{ fill: "oklch(0.60 0.008 260)", fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `฿${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <YAxis yAxisId="orders" orientation="right" tick={{ fill: "oklch(0.55 0.008 260)", fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${v}บิล`} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.18 0.007 260)", border: "1px solid oklch(0.28 0.008 260)", borderRadius: "8px", color: "oklch(0.93 0.005 260)", fontSize: "12px" }}
                  formatter={(value: number, name: string) => [name === "revenue" ? fmtB(value) : `${value} บิล`, name === "revenue" ? "ยอดขาย" : "จำนวนบิล"]}
                />
                <Legend formatter={(v) => v === "revenue" ? "ยอดขาย" : "จำนวนบิล"} wrapperStyle={{ fontSize: "11px" }} />
                <Bar yAxisId="revenue" dataKey="revenue" fill="oklch(0.75 0.005 260)" radius={[4, 4, 0, 0]} />
                <Line yAxisId="orders" type="monotone" dataKey="orders" stroke="oklch(0.65 0.18 230)" strokeWidth={2} dot={{ r: 3, fill: "oklch(0.65 0.18 230)" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Top Items (with variant) */}
          <div className="bg-card rounded-xl p-5 border border-border">
            <div className="flex items-center justify-between mb-4 gap-2">
              <h2 className="font-semibold text-sm shrink-0">สินค้าขายดี</h2>
              <div className="flex gap-1 bg-secondary rounded-lg p-1">
                <button onClick={() => setTopPeriod("day")}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${topPeriod === "day" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >วันนี้</button>
                <button onClick={() => setTopPeriod("month")}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${topPeriod === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >เดือนนี้</button>
              </div>
              <button onClick={handleExportTopItems} className="p-1.5 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0" title="Export">
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
            {loadingTop ? (
              <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-8 bg-secondary rounded animate-pulse" />)}</div>
            ) : !topItems || topItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                <span className="text-3xl mb-2">☕</span>ยังไม่มีข้อมูล
              </div>
            ) : (
              <div className="space-y-2">
                {(topItems as TopItem[]).map((item, idx) => {
                  const maxQty = (topItems as TopItem[])[0]?.totalQty ?? 1;
                  const pct = Math.round((item.totalQty / maxQty) * 100);
                  return (
                    <div key={`${item.itemId}-${item.variantName}`} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4 text-right">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="min-w-0">
                            <span className="text-xs font-medium truncate block">{item.itemName}</span>
                            {item.variantName && (
                              <span className="text-[10px] text-muted-foreground">{item.variantName}</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground ml-2 shrink-0">{item.totalQty} แก้ว</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: idx === 0 ? "oklch(0.75 0.005 260)" : "oklch(0.50 0.008 260)" }} />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right shrink-0">{fmtB(item.totalRevenue)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── Peak Hours Chart ────────────────────────────────────────────── */}
        <div className="bg-card rounded-xl p-5 border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-sm">ช่วงเวลาขายดี (Peak Hours)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">ยอดขายรายชั่วโมงวันนี้ · วางแผนจัดพนักงานได้</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={hourlyData ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.008 260)" />
              <XAxis dataKey="hour" tick={{ fill: "oklch(0.60 0.008 260)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="revenue" orientation="left" tick={{ fill: "oklch(0.60 0.008 260)", fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v === 0 ? "" : `฿${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <YAxis yAxisId="orders" orientation="right" tick={{ fill: "oklch(0.55 0.008 260)", fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v === 0 ? "" : `${v}`} />
              <Tooltip
                contentStyle={{ background: "oklch(0.18 0.007 260)", border: "1px solid oklch(0.28 0.008 260)", borderRadius: "8px", color: "oklch(0.93 0.005 260)", fontSize: "12px" }}
                formatter={(value: number, name: string) => [name === "revenue" ? fmtB(value) : `${value} บิล`, name === "revenue" ? "ยอดขาย" : "บิล"]}
              />
              <Bar yAxisId="revenue" dataKey="revenue" fill="oklch(0.65 0.15 35)" radius={[4, 4, 0, 0]} name="revenue" />
              <Line yAxisId="orders" type="monotone" dataKey="orders" stroke="oklch(0.70 0.18 145)" strokeWidth={2} dot={{ r: 3, fill: "oklch(0.70 0.18 145)" }} name="orders" />
            </ComposedChart>
          </ResponsiveContainer>
          {hourlyData && hourlyData.length > 0 && (() => {
            const peak = [...hourlyData].sort((a, b) => b.revenue - a.revenue)[0];
            if (!peak || peak.revenue === 0) return null;
            return (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                ⭐ ชั่วโมงขายดีที่สุดวันนี้: <span className="font-semibold text-foreground">{peak.hour}</span> — {fmtB(peak.revenue)} · {peak.orders} บิล
              </p>
            );
          })()}
        </div>

        {/* ─── Recent Orders ───────────────────────────────────────────────── */}
        <div className="bg-card rounded-xl p-5 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">บิลล่าสุด</h2>
            <button onClick={handleExportRecentOrders}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-background text-muted-foreground text-xs hover:text-foreground hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" />Export CSV
            </button>
          </div>
          {!recentOrders || recentOrders.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">ยังไม่มีบิล</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground text-xs border-b border-border">
                    <th className="pb-2 font-medium">บิล #</th>
                    <th className="pb-2 font-medium">เวลา</th>
                    <th className="pb-2 font-medium">ช่องทาง</th>
                    <th className="pb-2 font-medium">ชำระ</th>
                    <th className="pb-2 font-medium text-right">ยอดรวม</th>
                    <th className="pb-2 font-medium text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(recentOrders as RecentOrder[]).map((order) => (
                    <tr key={order.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="py-2 text-muted-foreground">#{order.id}</td>
                      <td className="py-2 text-xs">{new Date(order.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="py-2 text-xs">{channelLabel(order.salesChannel)}</td>
                      <td className="py-2 text-xs">{paymentLabel[order.paymentMethod] ?? order.paymentMethod}</td>
                      <td className="py-2 font-medium text-right">{fmtB(parseFloat(String(order.totalAmount)))}</td>
                      <td className="py-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${order.status === "completed" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                          {order.status === "completed" ? "สำเร็จ" : "ยกเลิก"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── KPI Card (วันนี้) ────────────────────────────────────────────────────────
function KPICard({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color: string; icon: string }) {
  return (
    <div className="bg-card rounded-xl p-3 sm:p-4 border border-border">
      <div className="flex items-start justify-between mb-1 sm:mb-2">
        <span className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{label}</span>
        <span className="text-base sm:text-lg shrink-0 ml-1">{icon}</span>
      </div>
      <div className={`text-lg sm:text-2xl font-bold ${color} mb-0.5 truncate`}>{value}</div>
      <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{sub}</div>
    </div>
  );
}

// ─── Month KPI Card (เดือนนี้ vs เดือนที่แล้ว) ───────────────────────────────
function MonthKPICard({ label, value, prev, pct, icon }: { label: string; value: string; prev: string; pct: number | null; icon: string }) {
  const positive = pct !== null && pct > 0;
  const negative = pct !== null && pct < 0;
  return (
    <div className="bg-card rounded-xl p-3 sm:p-4 border border-border">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] sm:text-xs text-muted-foreground">{label}</span>
        <span className="text-base sm:text-lg">{icon}</span>
      </div>
      <div className="text-lg sm:text-2xl font-bold text-foreground mb-1 truncate">{value}</div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-muted-foreground">เดือนที่แล้ว {prev}</span>
        {pct !== null && (
          <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${positive ? "bg-emerald-500/15 text-emerald-400" : negative ? "bg-red-500/15 text-red-400" : "bg-secondary text-muted-foreground"}`}>
            {positive ? <TrendingUp className="w-3 h-3" /> : negative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {positive ? "+" : ""}{pct}%
          </span>
        )}
        {pct === null && <span className="text-[10px] text-muted-foreground">ยังไม่มีข้อมูลเดือนที่แล้ว</span>}
      </div>
    </div>
  );
}
