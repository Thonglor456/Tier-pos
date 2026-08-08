import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, ShoppingBag, Banknote, Smartphone } from "lucide-react";

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatThaiDate(d: Date) {
  return d.toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export default function ReportsScreen() {
  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()));
  const [filterChannel, setFilterChannel] = useState<"walkin" | "grab" | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<"completed" | "cancelled" | undefined>(undefined);

  const { data: summary } = trpc.orders.dailySummary.useQuery({ date: selectedDate });
  const { data: orders = [] } = trpc.orders.list.useQuery({
    startDate: selectedDate + "T00:00:00.000Z",
    endDate: selectedDate + "T23:59:59.999Z",
    channel: filterChannel,
    status: filterStatus,
    limit: 100,
  });

  const summaryCards = useMemo(() => [
    { label: "ยอดรวม", value: `฿${(summary?.totalRevenue ?? 0).toLocaleString()}`, icon: TrendingUp, color: "text-primary" },
    { label: "Walk-in", value: `฿${(summary?.walkinRevenue ?? 0).toLocaleString()}`, icon: ShoppingBag, color: "text-amber-700" },
    { label: "Grab", value: `฿${(summary?.grabRevenue ?? 0).toLocaleString()}`, icon: ShoppingBag, color: "text-green-700" },
    { label: "เงินสด", value: `฿${(summary?.cashRevenue ?? 0).toLocaleString()}`, icon: Banknote, color: "text-blue-700" },
    { label: "โอนเงิน", value: `฿${(summary?.transferRevenue ?? 0).toLocaleString()}`, icon: Smartphone, color: "text-purple-700" },
  ], [summary]);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>รายงานยอดขาย</h1>
          <p className="text-sm text-muted-foreground">{formatThaiDate(new Date(selectedDate + "T12:00:00"))}</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-card text-foreground"
        />
      </div>

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <card.icon className={`w-4 h-4 ${card.color}`} />
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
              <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Order count */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>สำเร็จ <strong className="text-foreground">{summary?.completedCount ?? 0}</strong> บิล</span>
          <span>ยกเลิก <strong className="text-destructive">{summary?.cancelledCount ?? 0}</strong> บิล</span>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {([undefined, "walkin", "grab"] as const).map((ch) => (
            <button
              key={String(ch)}
              onClick={() => setFilterChannel(ch)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterChannel === ch ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}
            >
              {ch === undefined ? "ทุกช่องทาง" : ch === "walkin" ? "Walk-in" : "Grab"}
            </button>
          ))}
          <span className="w-px h-6 bg-border self-center" />
          {([undefined, "completed", "cancelled"] as const).map((st) => (
            <button
              key={String(st)}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === st ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}
            >
              {st === undefined ? "ทุกสถานะ" : st === "completed" ? "สำเร็จ" : "ยกเลิก"}
            </button>
          ))}
        </div>

        {/* Orders Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-5 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
            <span>เลขบิล</span>
            <span>เวลา</span>
            <span>ช่องทาง</span>
            <span>ชำระ</span>
            <span className="text-right">ยอด</span>
          </div>
          {orders.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">ไม่มีรายการ</div>
          )}
          {orders.map((order) => (
            <div key={order.id} className="grid grid-cols-5 px-4 py-3 border-b border-border last:border-0 items-center hover:bg-muted/30 transition-colors">
              <span className="font-mono text-xs text-foreground">{order.orderNumber}</span>
              <span className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
              <span>
                <Badge variant={order.salesChannel === "walkin" ? "default" : "secondary"} className={order.salesChannel === "grab" ? "bg-green-100 text-green-800" : ""}>
                  {order.salesChannel === "walkin" ? "Walk-in" : "Grab"}
                </Badge>
              </span>
              <span className="text-sm text-muted-foreground">{order.paymentMethod === "cash" ? "เงินสด" : "โอนเงิน"}</span>
              <span className={`text-right font-semibold ${order.status === "cancelled" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                ฿{parseFloat(String(order.totalAmount)).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

