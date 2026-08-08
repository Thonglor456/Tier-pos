import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { useStaff } from "@/contexts/StaffContext";

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtB(n: number) {
  return `฿${fmt(n)}`;
}

type ChartPeriod = "week" | "month";
type TopPeriod = "day" | "month";


type TopItem = { itemId: number; itemName: string; totalQty: number; totalRevenue: number };
type ChartEntry = { date: string; revenue: number; orders: number };
type RecentOrder = {
  id: number;
  createdAt: Date;
  salesChannel: string;
  paymentMethod: string;
  totalAmount: string | number;
  status: string;
};

export default function DashboardScreen() {
  const { currentStaff } = useStaff();
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("week");
  const [topPeriod, setTopPeriod] = useState<TopPeriod>("day");

  const { data: summary, isLoading: loadingSummary } = trpc.dashboard.todaySummary.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: topItems, isLoading: loadingTop } = trpc.dashboard.topItems.useQuery(
    { period: topPeriod, limit: 10 },
    { refetchInterval: 60000 }
  );
  const { data: weeklyData } = trpc.dashboard.weeklyRevenue.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const { data: monthlyData } = trpc.dashboard.monthlyRevenue.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const { data: recentOrders } = trpc.dashboard.recentOrders.useQuery(
    { limit: 8 },
    { refetchInterval: 15000 }
  );

  const chartData: ChartEntry[] | undefined = chartPeriod === "week" ? weeklyData : monthlyData?.map((d: { day: number; revenue: number; orders: number }) => ({ date: `${d.day}`, revenue: d.revenue, orders: d.orders }));

  const paymentLabel: Record<string, string> = {
    cash: "เงินสด",
    bank_transfer: "โอนธนาคาร",
    thai_chuay_thai: "ไทยช่วยไทย",
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <img src="/manus-storage/tier_logo_da9eb150.png" alt="Tier Coffee" className="h-9 w-9 rounded-full object-cover" />
          <div>
            <h1 className="font-bold text-lg leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">ยินดีต้อนรับ, {currentStaff?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          อัปเดตอัตโนมัติทุก 30 วินาที
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* KPI Cards */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">สรุปยอดวันนี้</h2>
          {loadingSummary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-card rounded-xl p-4 h-24 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard
                label="ยอดขายรวม"
                value={fmtB(summary?.revenue ?? 0)}
                sub="บิลที่สำเร็จ"
                color="text-emerald-400"
                icon="💰"
              />
              <KPICard
                label="จำนวนบิลทั้งหมด"
                value={fmt(summary?.orders ?? 0)}
                sub={`สำเร็จ ${summary?.completed ?? 0} / ยกเลิก ${summary?.cancelled ?? 0}`}
                color="text-blue-400"
                icon="🧾"
              />
              <KPICard
                label="ค่าเฉลี่ยต่อบิล"
                value={fmtB(summary?.avgOrderValue ?? 0)}
                sub="เฉพาะบิลที่สำเร็จ"
                color="text-purple-400"
                icon="📊"
              />
              <KPICard
                label="บิลยกเลิก"
                value={fmt(summary?.cancelled ?? 0)}
                sub={`จาก ${summary?.orders ?? 0} บิลทั้งหมด`}
                color="text-red-400"
                icon="❌"
              />
            </div>
          )}
        </div>

        {/* Revenue Chart + Top Items */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-card rounded-xl p-5 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">ยอดขาย</h2>
              <div className="flex gap-1 bg-secondary rounded-lg p-1">
                <button
                  onClick={() => setChartPeriod("week")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${chartPeriod === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  7 วัน
                </button>
                <button
                  onClick={() => setChartPeriod("month")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${chartPeriod === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  เดือนนี้
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.008 260)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "oklch(0.60 0.008 260)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "oklch(0.60 0.008 260)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `฿${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.18 0.007 260)",
                    border: "1px solid oklch(0.28 0.008 260)",
                    borderRadius: "8px",
                    color: "oklch(0.93 0.005 260)",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [fmtB(value), "ยอดขาย"]}
                />
                <Bar dataKey="revenue" fill="oklch(0.75 0.005 260)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Items */}
          <div className="bg-card rounded-xl p-5 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">สินค้าขายดี</h2>
              <div className="flex gap-1 bg-secondary rounded-lg p-1">
                <button
                  onClick={() => setTopPeriod("day")}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${topPeriod === "day" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  วันนี้
                </button>
                <button
                  onClick={() => setTopPeriod("month")}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${topPeriod === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  เดือนนี้
                </button>
              </div>
            </div>
            {loadingTop ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-8 bg-secondary rounded animate-pulse" />
                ))}
              </div>
            ) : !topItems || topItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                <span className="text-3xl mb-2">☕</span>
                ยังไม่มีข้อมูล
              </div>
            ) : (
              <div className="space-y-2">
                {(topItems as TopItem[]).map((item: TopItem, idx: number) => {
                  const maxQty = (topItems as TopItem[])[0]?.totalQty ?? 1;
                  const pct = Math.round((item.totalQty / maxQty) * 100);
                  return (
                    <div key={item.itemId} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4 text-right">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium truncate">{item.itemName}</span>
                          <span className="text-xs text-muted-foreground ml-2 shrink-0">{item.totalQty} แก้ว</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: idx === 0 ? "oklch(0.75 0.005 260)" : "oklch(0.50 0.008 260)" }}
                          />
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

        {/* Recent Orders */}
        <div className="bg-card rounded-xl p-5 border border-border">
          <h2 className="font-semibold text-sm mb-4">บิลล่าสุด</h2>
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
                  {(recentOrders as RecentOrder[]).map((order: RecentOrder) => (
                    <tr key={order.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="py-2 text-muted-foreground">#{order.id}</td>
                      <td className="py-2 text-xs">
                        {new Date(order.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2 text-xs">{order.salesChannel}</td>
                      <td className="py-2 text-xs">{paymentLabel[order.paymentMethod] ?? order.paymentMethod}</td>
                      <td className="py-2 font-medium text-right">{fmtB(parseFloat(String(order.totalAmount)))}</td>
                      <td className="py-2 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            order.status === "completed"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-red-500/15 text-red-400"
                          }`}
                        >
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

function KPICard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  icon: string;
}) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${color} mb-1`}>{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
