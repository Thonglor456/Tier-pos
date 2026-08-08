import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, TrendingUp, ShoppingBag, Banknote, Smartphone, Heart, Users, Store, Truck } from "lucide-react";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "เงินสด",
  transfer: "โอนธนาคาร",
  thai_chuay_thai: "ไทยช่วยไทย",
};

export default function ReportsScreen() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [filterPayment, setFilterPayment] = useState<string>("all");
  const [filterStaff, setFilterStaff] = useState<number | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "cancelled">("all");

  const { data: summary } = trpc.orders.dailySummary.useQuery({ date: selectedDate });
  const { data: channels = [] } = trpc.channels.list.useQuery();
  const { data: staffList = [] } = trpc.posUsers.list.useQuery();
  const { data: orders = [] } = trpc.orders.list.useQuery({
    startDate: selectedDate,
    endDate: selectedDate,
    channel: filterChannel !== "all" ? filterChannel : undefined,
    status: filterStatus !== "all" ? filterStatus : undefined,
    staffId: filterStaff !== "all" ? filterStaff : undefined,
    limit: 200,
  });

  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    for (const o of orders) {
      if (o.status !== "completed") continue;
      const pm = o.paymentMethod ?? "cash";
      if (!map[pm]) map[pm] = { count: 0, total: 0 };
      map[pm]!.count++;
      map[pm]!.total += parseFloat(String(o.totalAmount));
    }
    return map;
  }, [orders]);

  const staffBreakdown = useMemo(() => {
    const map: Record<number, { name: string; count: number; total: number }> = {};
    for (const o of orders) {
      if (o.status !== "completed") continue;
      const sid = o.staffId ?? 0;
      const sname = staffList.find((s) => s.id === sid)?.name ?? "ไม่ระบุ";
      if (!map[sid]) map[sid] = { name: sname, count: 0, total: 0 };
      map[sid]!.count++;
      map[sid]!.total += parseFloat(String(o.totalAmount));
    }
    return Object.values(map);
  }, [orders, staffList]);

  const channelBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    for (const o of orders) {
      if (o.status !== "completed") continue;
      const ch = o.salesChannel ?? "walkin";
      if (!map[ch]) map[ch] = { count: 0, total: 0 };
      map[ch]!.count++;
      map[ch]!.total += parseFloat(String(o.totalAmount));
    }
    return map;
  }, [orders]);

  const totalRevenue = summary?.totalRevenue ?? 0;
  const totalOrders = (summary?.completedCount ?? 0) + (summary?.cancelledCount ?? 0);
  const completedOrders = summary?.completedCount ?? 0;
  const cancelledOrders = summary?.cancelledCount ?? 0;

  const filteredOrders = orders.filter((o) => filterPayment === "all" || o.paymentMethod === filterPayment);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 px-5 py-3 bg-card border-b border-border shadow-sm shrink-0">
        <Link href="/">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">กลับหน้าขาย</span>
          </button>
        </Link>
        <div className="h-5 w-px bg-border" />
        <h1 className="text-base font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>รายงานยอดขาย</h1>
        <div className="ml-auto">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "ยอดขายรวม", value: `฿${Number(totalRevenue).toLocaleString()}`, icon: <TrendingUp className="w-5 h-5" />, color: "oklch(0.38 0.08 50)" },
            { label: "จำนวนบิล", value: `${totalOrders} บิล`, icon: <ShoppingBag className="w-5 h-5" />, color: "oklch(0.52 0.18 145)" },
            { label: "สำเร็จ", value: `${completedOrders} บิล`, icon: <TrendingUp className="w-5 h-5" />, color: "oklch(0.52 0.22 200)" },
            { label: "ยกเลิก", value: `${cancelledOrders} บิล`, icon: <ShoppingBag className="w-5 h-5" />, color: "oklch(0.55 0.18 25)" },
          ].map((card) => (
            <div key={card.label} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: card.color }}>
                {card.icon}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-lg font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Breakdowns Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Banknote className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground">วิธีชำระเงิน</h3>
            </div>
            <div className="space-y-2">
              {(["cash", "transfer", "thai_chuay_thai"] as const).map((pm) => {
                const d = paymentBreakdown[pm] ?? { count: 0, total: 0 };
                const icons: Record<string, React.ReactNode> = { cash: <Banknote className="w-3.5 h-3.5" />, transfer: <Smartphone className="w-3.5 h-3.5" />, thai_chuay_thai: <Heart className="w-3.5 h-3.5" /> };
                return (
                  <div key={pm} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <span className="text-muted-foreground">{icons[pm]}</span>
                      {PAYMENT_LABELS[pm]}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">฿{d.total.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{d.count} บิล</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground">ช่องทางการขาย</h3>
            </div>
            <div className="space-y-2">
              {channels.map((ch) => {
                const d = channelBreakdown[ch.slug] ?? { count: 0, total: 0 };
                return (
                  <div key={ch.slug} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Store className="w-3.5 h-3.5 text-muted-foreground" />
                      {ch.name}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">฿{d.total.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{d.count} บิล</p>
                    </div>
                  </div>
                );
              })}
              {channels.length === 0 && <p className="text-xs text-muted-foreground">ไม่มีข้อมูล</p>}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground">ยอดขายตามพนักงาน</h3>
            </div>
            <div className="space-y-2">
              {staffBreakdown.map((s) => (
                <div key={s.name} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "oklch(0.38 0.08 50)" }}>
                      {s.name.charAt(0)}
                    </div>
                    <span className="text-sm text-foreground">{s.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">฿{s.total.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{s.count} บิล</p>
                  </div>
                </div>
              ))}
              {staffBreakdown.length === 0 && <p className="text-xs text-muted-foreground">ไม่มีข้อมูล</p>}
            </div>
          </div>
        </div>

        {/* Order List with Filters */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-foreground mr-2">รายการบิล</h3>
            <select value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none">
              <option value="all">ทุกช่องทาง</option>
              {channels.map((ch) => <option key={ch.slug} value={ch.slug}>{ch.name}</option>)}
            </select>
            <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none">
              <option value="all">ทุกวิธีชำระ</option>
              {Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value === "all" ? "all" : Number(e.target.value))} className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none">
              <option value="all">ทุกพนักงาน</option>
              {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as "all" | "completed" | "cancelled")} className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none">
              <option value="all">ทุกสถานะ</option>
              <option value="completed">สำเร็จ</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["เวลา", "บิล #", "ช่องทาง", "วิธีชำระ", "พนักงาน", "ยอด", "สถานะ"].map((h) => (
                    <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-muted-foreground ${h === "ยอด" ? "text-right" : h === "สถานะ" ? "text-center" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, idx) => {
                  const staffName = staffList.find((s) => s.id === order.staffId)?.name ?? "-";
                  const chName = channels.find((c) => c.slug === order.salesChannel)?.name ?? order.salesChannel;
                  return (
                    <tr key={order.id} className={`border-b border-border/40 last:border-0 ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-foreground">#{order.id}</td>
                      <td className="px-4 py-2.5 text-xs text-foreground">{chName}</td>
                      <td className="px-4 py-2.5 text-xs text-foreground">{PAYMENT_LABELS[order.paymentMethod ?? "cash"] ?? order.paymentMethod}</td>
                      <td className="px-4 py-2.5 text-xs text-foreground">{staffName}</td>
                      <td className="px-4 py-2.5 text-sm font-bold text-foreground text-right">฿{Number(order.totalAmount).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${order.status === "completed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {order.status === "completed" ? "สำเร็จ" : "ยกเลิก"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">ไม่มีรายการในวันที่เลือก</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
