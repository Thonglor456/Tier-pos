import { useState, useMemo, useCallback } from "react";
import { Link } from "wouter";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, TrendingUp, ShoppingBag, Banknote, Smartphone, Heart, Users, Store, Truck, XCircle, CalendarRange, Download, CupSoda, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useStaff } from "@/contexts/StaffContext";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { format, startOfDay, endOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { toCSV, downloadFile, formatDateForFilename } from "@/lib/exportUtils";
import { getDateRangeLength, shiftDateRange } from "@/lib/dateRangeUtils";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "เงินสด",
  transfer: "โอนธนาคาร",
  thai_chuay_thai: "ไทยช่วยไทย",
};

const PAYMENT_LABELS_EN: Record<string, string> = {
  cash: "Cash",
  transfer: "Bank Transfer",
  thai_chuay_thai: "Thai Chuay Thai",
};

function formatDateRangeLabel(range: DateRange) {
  if (!range.from) return "เลือกวันที่";
  if (!range.to || range.from.toDateString() === range.to.toDateString()) {
    return format(range.from, "dd/MM/yyyy");
  }
  return `${format(range.from, "dd/MM/yyyy")} – ${format(range.to, "dd/MM/yyyy")}`;
}

export default function ReportsScreen() {
  const today = useMemo(() => new Date(), []);
  const { currentStaff } = useStaff();
  const [, navigate] = useLocation();
  const [dateRange, setDateRange] = useState<DateRange>(() => ({ from: new Date(), to: new Date() }));

  // Guard: only staff or manager can access reports (staff see only their branch)
  if (!currentStaff) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-primary text-lg font-medium">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
          <p className="text-muted-foreground text-sm mt-1">กรุณาเข้าสู่ระบบ</p>
          <Button onClick={() => navigate("/")} className="mt-4 bg-primary text-white">กลับหน้าขาย</Button>
        </div>
      </div>
    );
  }

  const [dateDrawerOpen, setDateDrawerOpen] = useState(false);
  const [draftDateRange, setDraftDateRange] = useState<DateRange>(() => ({ from: new Date(), to: new Date() }));
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [filterPayment, setFilterPayment] = useState<string>("all");
  const [filterStaff, setFilterStaff] = useState<number | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "cancelled">("all");
  const isBranchLocked = (currentStaff?.role === "staff" || currentStaff?.role === "manager") && !!currentStaff?.branchId;
  const isStaffBranchLocked = isBranchLocked; // kept for compat
  const [filterBranch, setFilterBranch] = useState<number | "all">(() =>
    isBranchLocked && currentStaff?.branchId ? currentStaff.branchId : "all"
  );
  const [cancelConfirmId, setCancelConfirmId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const utils = trpc.useUtils();
  const startDateStr = useMemo(() => startOfDay(dateRange.from ?? today).toISOString(), [dateRange.from, today]);
  const endDateStr = useMemo(() => endOfDay(dateRange.to ?? dateRange.from ?? today).toISOString(), [dateRange.to, dateRange.from, today]);
  const summaryDate = useMemo(() => (dateRange.from ?? today).toISOString().slice(0, 10), [dateRange.from, today]);

  const { data: summary } = trpc.orders.dailySummary.useQuery({ date: summaryDate });
  const { data: channels = [] } = trpc.channels.list.useQuery();
  const { data: branches = [] } = trpc.branches.list.useQuery();
  const { data: staffList = [] } = trpc.posUsers.list.useQuery();
  const { data: orders = [] } = trpc.orders.list.useQuery({
    startDate: startDateStr,
    endDate: endDateStr,
    channel: filterChannel !== "all" ? filterChannel : undefined,
    status: filterStatus !== "all" ? filterStatus : undefined,
    staffId: filterStaff !== "all" ? filterStaff : undefined,
    branchId: filterBranch !== "all" ? filterBranch : undefined,
    limit: 500,
  });
  const { data: quantitySummary } = trpc.orders.quantitySummary.useQuery({
    startDate: startDateStr,
    endDate: endDateStr,
    channel: filterChannel !== "all" ? filterChannel : undefined,
    staffId: filterStaff !== "all" ? filterStaff : undefined,
    branchId: filterBranch !== "all" ? filterBranch : undefined,
    paymentMethod: filterPayment !== "all" ? filterPayment as "cash" | "transfer" | "thai_chuay_thai" : undefined,
    status: filterStatus !== "all" ? filterStatus : undefined,
  });

  const cancelMutation = trpc.orders.cancelDirect.useMutation({
    onSuccess: () => {
      toast.success("ยกเลิกบิลสำเร็จ");
      setCancelConfirmId(null);
      setCancelReason("");
      utils.orders.list.invalidate();
      utils.orders.dailySummary.invalidate();
      utils.orders.quantitySummary.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCancelClick = useCallback((orderId: number) => {
    setCancelConfirmId(orderId);
    setCancelReason("");
  }, []);

  const handleConfirmCancel = useCallback(() => {
    if (cancelConfirmId === null) return;
    cancelMutation.mutate({ orderId: cancelConfirmId, cancelReason: cancelReason || "ยกเลิกโดยพนักงาน" });
  }, [cancelConfirmId, cancelReason, cancelMutation]);

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
  const channelMetrics = quantitySummary?.channelBreakdown ?? channelBreakdown;

  // For range display: compute totals from orders (not dailySummary which is single-day)
  const isMultiDay = dateRange.from && dateRange.to && dateRange.from.toDateString() !== dateRange.to.toDateString();
  const rangeRevenue = useMemo(() => orders.filter(o => o.status === "completed").reduce((s, o) => s + parseFloat(String(o.totalAmount)), 0), [orders]);
  const rangeCompleted = useMemo(() => orders.filter(o => o.status === "completed").length, [orders]);
  const rangeCancelled = useMemo(() => orders.filter(o => o.status === "cancelled").length, [orders]);

  const totalRevenue = isMultiDay ? rangeRevenue : (summary?.totalRevenue ?? rangeRevenue);
  const totalOrders = isMultiDay ? orders.length : ((summary?.completedCount ?? 0) + (summary?.cancelledCount ?? 0));
  const completedOrders = isMultiDay ? rangeCompleted : (summary?.completedCount ?? rangeCompleted);
  const cancelledOrders = isMultiDay ? rangeCancelled : (summary?.cancelledCount ?? rangeCancelled);
  const filteredOrders = orders.filter((o) => filterPayment === "all" || o.paymentMethod === filterPayment);


  const handleExportCSV = useCallback(() => {
    if (filteredOrders.length === 0) {
      toast.error("ไม่มีข้อมูลที่จะ Export");
      return;
    }
    const exportHeaders = [
      { key: "id", label: "เลขบิล" },
      { key: "date", label: "วันที่" },
      { key: "time", label: "เวลา" },
      { key: "channel", label: "ช่องทางการขาย" },
      { key: "payment", label: "วิธีชำระเงิน" },
      { key: "staff", label: "พนักงาน" },
      { key: "branch", label: "สาขา" },
      { key: "total", label: "ยอดรวม (บาท)" },
      { key: "status", label: "สถานะ" },
      { key: "cancelReason", label: "เหตุผลยกเลิก" },
    ];
    const rows = filteredOrders.map((o) => {
      const d = new Date(o.createdAt);
      const staffName = staffList.find((s) => s.id === o.staffId)?.name ?? "-";
      const chName = channels.find((c) => c.slug === o.salesChannel)?.name ?? (o.salesChannel ?? "-");
      const branchName = branches.find((b) => b.id === o.branchId)?.name ?? "-";
      return {
        id: o.id,
        date: d.toLocaleDateString("th-TH", { year: "numeric", month: "2-digit", day: "2-digit" }),
        time: d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
        channel: chName,
        payment: PAYMENT_LABELS_EN[o.paymentMethod ?? "cash"] ?? (o.paymentMethod ?? "-"),
        staff: staffName,
        branch: branchName,
        total: parseFloat(String(o.totalAmount)).toFixed(2),
        status: o.status === "completed" ? "สำเร็จ" : "ยกเลิก",
        cancelReason: (o as { cancelReason?: string }).cancelReason ?? "",
      };
    });
    const csv = toCSV(rows, exportHeaders);
    const fromStr = formatDateForFilename(dateRange.from ?? today);
    const toStr = formatDateForFilename(dateRange.to ?? dateRange.from ?? today);
    const filename = fromStr === toStr
      ? `tier_coffee_report_${fromStr}.csv`
      : `tier_coffee_report_${fromStr}_${toStr}.csv`;
    downloadFile(csv, filename);
    toast.success(`Export สำเร็จ: ${filteredOrders.length} รายการ`);
  }, [filteredOrders, staffList, channels, branches, dateRange, today]);
  const dateLabel = useMemo(() => formatDateRangeLabel(dateRange), [dateRange]);
  const selectedDateCount = useMemo(() => getDateRangeLength(dateRange, today), [dateRange, today]);

  const openDatePicker = useCallback(() => {
    setDraftDateRange(dateRange);
    setDateDrawerOpen(true);
  }, [dateRange]);

  const applyDateRange = useCallback(() => {
    if (!draftDateRange.from) {
      toast.error("กรุณาเลือกวันเริ่มต้น");
      return;
    }
    setDateRange({ from: draftDateRange.from, to: draftDateRange.to ?? draftDateRange.from });
    setDateDrawerOpen(false);
  }, [draftDateRange]);

  const applyPreset = useCallback((from: Date, to: Date) => {
    const nextRange = { from, to };
    setDraftDateRange(nextRange);
    setDateRange(nextRange);
    setDateDrawerOpen(false);
  }, []);

  const moveDateRange = useCallback((offsetDays: number) => {
    setDateRange((currentRange) => shiftDateRange(currentRange, offsetDays, today));
  }, [today]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Cancel Confirm Dialog */}
      {cancelConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">ยืนยันการยกเลิกบิล</h3>
                <p className="text-xs text-muted-foreground">บิล #{cancelConfirmId}</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-medium text-foreground mb-1.5 block">เหตุผล (ไม่บังคับ)</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="เช่น ลูกค้าเปลี่ยนใจ"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-400/40"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setCancelConfirmId(null); setCancelReason(""); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                ไม่ยกเลิก
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {cancelMutation.isPending ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 bg-card border-b border-border shadow-sm shrink-0">
        {/* Row 1: back + title */}
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/">
            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span className="text-sm hidden xs:inline">กลับหน้าขาย</span>
            </button>
          </Link>
          <div className="h-5 w-px bg-border" />
          <h1 className="text-base font-bold text-foreground truncate" style={{ fontFamily: "'Playfair Display', serif" }}>รายงานยอดขาย</h1>
        </div>
        {/* Row 2 on mobile / same row on desktop: date nav + export */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm hover:bg-muted transition-colors"
            title="Export CSV"
          >
            <Download className="w-4 h-4 text-muted-foreground" />
            <span className="hidden sm:inline text-xs">Export CSV</span>
          </button>
          <button
            onClick={() => moveDateRange(-selectedDateCount)}
            className="size-8 rounded-lg border border-border bg-background text-foreground hover:bg-muted active:scale-95 transition shrink-0"
            title="ดูช่วงวันก่อนหน้า"
            aria-label="ดูช่วงวันก่อนหน้า"
          >
            <ChevronLeft className="w-4 h-4 mx-auto" />
          </button>
          <Drawer open={dateDrawerOpen} onOpenChange={setDateDrawerOpen}>
            <DrawerTrigger asChild>
              <button onClick={openDatePicker} className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-primary/50 bg-primary/10 text-foreground text-sm hover:bg-primary/15 active:scale-[0.98] transition min-w-0 max-w-[200px] justify-between">
                <CalendarRange className="w-4 h-4 text-primary shrink-0" />
                <span className="flex-1 text-center font-medium truncate">{dateLabel}</span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:inline">{selectedDateCount} วัน</span>
              </button>
            </DrawerTrigger>
            <DrawerContent className="border-border bg-card max-h-[90vh]">
              <div className="mx-auto w-full max-w-3xl overflow-y-auto">
                <DrawerHeader className="px-5 pt-5 pb-3">
                  <DrawerTitle className="text-lg">เลือกช่วงวันที่รายงาน</DrawerTitle>
                  <DrawerDescription>แตะวันเริ่มต้นและวันสิ้นสุด หรือเลือกช่วงที่ใช้บ่อยด้านล่าง</DrawerDescription>
                </DrawerHeader>
                <div className="px-5 pb-4">
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { label: "วันนี้", getRange: () => { const d = new Date(); return { from: d, to: d }; } },
                      { label: "เมื่อวาน", getRange: () => { const d = new Date(); d.setDate(d.getDate() - 1); return { from: d, to: d }; } },
                      { label: "7 วันล่าสุด", getRange: () => { const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 6); return { from, to }; } },
                      { label: "30 วันล่าสุด", getRange: () => { const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 29); return { from, to }; } },
                      { label: "เดือนนี้", getRange: () => { const to = new Date(); return { from: new Date(to.getFullYear(), to.getMonth(), 1), to }; } },
                      { label: "เดือนที่แล้ว", getRange: () => { const now = new Date(); return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0) }; } },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => { const range = preset.getRange(); applyPreset(range.from, range.to); }}
                        className="min-h-11 rounded-xl border border-border bg-background px-2 text-xs font-medium text-foreground hover:border-primary/60 hover:bg-primary/10 active:scale-95 transition"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 rounded-2xl border border-border bg-background p-2 flex justify-center">
                    <Calendar
                      mode="range"
                      selected={draftDateRange}
                      onSelect={(range) => range && setDraftDateRange(range)}
                      numberOfMonths={2}
                      defaultMonth={draftDateRange.from}
                      className="w-full"
                    />
                  </div>
                </div>
                <DrawerFooter className="border-t border-border bg-card px-5 pb-5 sm:flex-row sm:justify-end">
                  <button
                    onClick={() => { const d = new Date(); setDraftDateRange({ from: d, to: d }); }}
                    className="min-h-11 rounded-xl border border-border px-5 text-sm font-medium text-foreground hover:bg-muted active:scale-95 transition"
                  >
                    ล้างเป็นวันนี้
                  </button>
                  <button
                    onClick={applyDateRange}
                    className="min-h-11 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-95 transition"
                  >
                    ใช้ช่วงวันที่นี้
                  </button>
                </DrawerFooter>
              </div>
            </DrawerContent>
          </Drawer>
          <button
            onClick={() => moveDateRange(selectedDateCount)}
            className="size-8 rounded-lg border border-border bg-background text-foreground hover:bg-muted active:scale-95 transition shrink-0"
            title="ดูช่วงวันถัดไป"
            aria-label="ดูช่วงวันถัดไป"
          >
            <ChevronRight className="w-4 h-4 mx-auto" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
          {[
            { label: "ยอดขายรวม", value: `฿${Number(totalRevenue).toLocaleString()}`, icon: <TrendingUp className="w-5 h-5" />, color: "oklch(0.75 0.005 260)" },
            { label: "จำนวนบิล", value: `${totalOrders} บิล`, icon: <ShoppingBag className="w-5 h-5" />, color: "oklch(0.52 0.18 145)" },
            { label: "จำนวนแก้วที่ขาย", value: `${quantitySummary?.totalCups ?? 0} แก้ว`, icon: <CupSoda className="w-5 h-5" />, color: "oklch(0.62 0.12 215)" },
            { label: "สำเร็จ", value: `${completedOrders} บิล`, icon: <TrendingUp className="w-5 h-5" />, color: "oklch(0.52 0.22 200)" },
            { label: "ยกเลิก", value: `${cancelledOrders} บิล`, icon: <ShoppingBag className="w-5 h-5" />, color: "oklch(0.55 0.18 25)" },
          ].map((card, idx, arr) => (
            <div key={card.label} className={`bg-card rounded-2xl border border-border p-3 sm:p-4 flex items-center gap-2 sm:gap-3${idx === arr.length - 1 && arr.length % 2 !== 0 ? " col-span-2 min-[480px]:col-span-1" : ""}`}>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: card.color }}>
                {card.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{card.label}</p>
                <p className="text-sm sm:text-lg font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Breakdowns Row */}
        <div className="grid grid-cols-1 min-[600px]:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Banknote className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground">วิธีชำระเงิน</h3>
            </div>
            <div className="space-y-2">
              {(["cash", "transfer", "thai_chuay_thai"] as const).map((pm) => {
                const d = paymentBreakdown[pm] ?? { count: 0, total: 0 };
                const icons: Record<string, React.ReactNode> = {
                  cash: <Banknote className="w-3.5 h-3.5" />,
                  transfer: <Smartphone className="w-3.5 h-3.5" />,
                  thai_chuay_thai: <Heart className="w-3.5 h-3.5" />,
                };
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
                const d = channelMetrics[ch.slug] ?? { orderCount: 0, count: 0, revenue: 0, total: 0, cupsSold: 0 };
                const orderCount = "orderCount" in d ? d.orderCount : d.count;
                const revenue = "revenue" in d ? d.revenue : d.total;
                const cupsSold = "cupsSold" in d ? d.cupsSold : 0;
                return (
                  <div key={ch.slug} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Store className="w-3.5 h-3.5 text-muted-foreground" />
                      {ch.name}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">฿{Number(revenue).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{orderCount} บิล · {cupsSold} แก้ว</p>
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
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold bg-primary">
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

        {/* Menu Breakdown */}
        {(quantitySummary?.menuBreakdown ?? []).length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <CupSoda className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground">เมนูที่ขายได้</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2 text-xs font-semibold text-muted-foreground text-left">เมนู</th>
                    <th className="px-3 py-2 text-xs font-semibold text-muted-foreground text-right">แก้ว</th>
                    <th className="px-3 py-2 text-xs font-semibold text-muted-foreground text-right">ยอด (฿)</th>
                  </tr>
                </thead>
                <tbody>
                  {(quantitySummary?.menuBreakdown ?? []).map((m, idx) => (
                    <tr key={m.itemId} className={`border-b border-border/40 last:border-0 ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-3 py-2 text-sm text-foreground">{m.itemName}</td>
                      <td className="px-3 py-2 text-sm font-bold text-foreground text-right">{m.cups}</td>
                      <td className="px-3 py-2 text-sm text-foreground text-right">฿{Number(m.revenue).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
            {branches.length > 0 && currentStaff?.role === "admin" && (
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none"
              >
                <option value="all">ทุกสาขา</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["เวลา", "บิล #", "ช่องทาง", "วิธีชำระ", "พนักงาน", "ยอด", "สถานะ", ""].map((h) => (
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
                        {new Date(order.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit" })} {new Date(order.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-foreground">#{order.id}</td>
                      <td className="px-4 py-2.5 text-xs text-foreground">{chName}</td>
                      <td className="px-4 py-2.5 text-xs text-foreground">{PAYMENT_LABELS[order.paymentMethod ?? "cash"] ?? order.paymentMethod}</td>
                      <td className="px-4 py-2.5 text-xs text-foreground">{staffName}</td>
                      <td className="px-4 py-2.5 text-sm font-bold text-foreground text-right">฿{Number(order.totalAmount).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${order.status === "completed" ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"}`}>
                          {order.status === "completed" ? "สำเร็จ" : "ยกเลิก"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {order.status === "completed" && (
                          <button
                            onClick={() => handleCancelClick(order.id)}
                            className="text-xs text-red-500 hover:text-red-400 hover:bg-red-900/20 px-2 py-1 rounded-lg transition-colors"
                            title="ยกเลิกบิล"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">ไม่มีรายการในช่วงวันที่เลือก</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
