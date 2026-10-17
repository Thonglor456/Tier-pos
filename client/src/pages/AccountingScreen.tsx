import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ChevronLeft, Scale, Receipt, MapPin, CheckCircle2, AlertCircle, CircleDashed } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useStaff } from "@/contexts/StaffContext";
import { useBranch } from "@/contexts/BranchContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Tab = "recon" | "pnl";

const thaiDate = (offsetDays = 0) => new Date(Date.now() + 7 * 3600000 - offsetDays * 86400000).toISOString().slice(0, 10);
const monthStart = () => `${thaiDate().slice(0, 8)}01`;
const fmtBaht = (n: number) => `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" });

export default function AccountingScreen() {
  const [, navigate] = useLocation();
  const { currentStaff } = useStaff();
  const isManager = currentStaff?.role === "manager" || currentStaff?.role === "admin";
  if (!isManager) {
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
  return <AccountingContent />;
}

function AccountingContent() {
  const [, navigate] = useLocation();
  const { currentStaff } = useStaff();
  const { currentBranch } = useBranch();
  const [activeTab, setActiveTab] = useState<Tab>("recon");
  const isAdmin = currentStaff?.role === "admin";
  const lockedBranchId = !isAdmin && currentStaff?.branchId ? currentStaff.branchId : null;
  const [pickedBranch, setPickedBranch] = useState<number | null>(currentBranch?.id ?? null);
  const branchId = lockedBranchId ?? pickedBranch;
  const { data: branches = [] } = trpc.branches.list.useQuery();
  const activeBranches = branches.filter((b) => b.isActive && b.type === "shop");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "recon", label: "กระทบยอด", icon: <Scale className="w-4 h-4" /> },
    { id: "pnl", label: "กำไร-ขาดทุน", icon: <Receipt className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate("/")} className="text-primary hover:text-foreground transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-foreground">บัญชี</h1>
        <div className="flex gap-1 ml-2">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                activeTab === t.id ? "bg-primary text-white" : "text-primary hover:bg-muted")}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-sm">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          {lockedBranchId ? (
            <span>{branches.find((b) => b.id === lockedBranchId)?.name ?? "สาขาของฉัน"}</span>
          ) : (
            <select id="acc-branch" value={pickedBranch ?? ""} onChange={(e) => setPickedBranch(e.target.value ? Number(e.target.value) : null)}
              className="bg-background border border-border rounded-lg px-2 py-1 text-sm text-foreground">
              <option value="">ทุกสาขา</option>
              {activeBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
        {activeTab === "recon" && (branchId
          ? <ReconciliationSection branchId={branchId} />
          : <p className="text-center py-16 text-muted-foreground text-sm">เลือกสาขาที่มุมขวาบน (กระทบยอดทำทีละสาขา เพราะแต่ละสาขามีบัญชีรับเงินของตัวเอง)</p>)}
        {activeTab === "pnl" && <PnlSection branchId={branchId} />}
      </main>
    </div>
  );
}

// ─── Reconciliation ──────────────────────────────────────────────────────────
function StatusChip({ status }: { status: "matched" | "short" | "over" | "pending" }) {
  const map = {
    matched: { cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "ตรง" },
    short: { cls: "bg-red-500/15 text-red-600 dark:text-red-400", icon: <AlertCircle className="w-3.5 h-3.5" />, label: "เงินขาด" },
    over: { cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400", icon: <AlertCircle className="w-3.5 h-3.5" />, label: "เงินเกิน" },
    pending: { cls: "bg-muted text-muted-foreground", icon: <CircleDashed className="w-3.5 h-3.5" />, label: "ยังไม่กระทบ" },
  }[status];
  return <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium", map.cls)}>{map.icon}{map.label}</span>;
}

function ReconciliationSection({ branchId }: { branchId: number }) {
  const utils = trpc.useUtils();
  const [date, setDate] = useState(thaiDate(1));
  const { data: calendar = [] } = trpc.accounting.reconciliationCalendar.useQuery({ branchId, from: thaiDate(29), to: thaiDate() });
  const { data: sourcesData, isLoading } = trpc.accounting.reconciliationDay.useQuery({ branchId, date });
  const sources = sourcesData ?? [];
  const [drafts, setDrafts] = useState<Record<string, { actual: string; fee: string; note: string }>>({});

  useEffect(() => {
    setDrafts(Object.fromEntries((sourcesData ?? []).map((s) => [s.source, {
      actual: s.saved ? String(s.saved.actualNet) : "",
      fee: s.saved ? String(s.saved.feeAmount) : String(s.suggestedFee),
      note: s.saved?.note ?? "",
    }])));
  }, [sourcesData]); // ใช้ข้อมูลจาก query โดยตรง: ค่า default [] ใหม่ทุก render จะทำให้วนไม่จบ

  const save = trpc.accounting.saveReconciliation.useMutation({
    onSuccess: (r) => {
      toast[r.status === "matched" ? "success" : "warning"](r.status === "matched" ? "ยอดตรง บันทึกแล้ว" : `บันทึกแล้ว · ต่างกัน ${fmtBaht(r.diff)}`);
      utils.accounting.reconciliationDay.invalidate();
      utils.accounting.reconciliationCalendar.invalidate();
      utils.accounting.profitAndLoss.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const pendingDays = calendar.filter((d) => d.pending > 0).length;
  const mismatchDays = calendar.filter((d) => d.mismatched > 0).length;

  return (
    <div className="max-w-5xl grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground mb-1">30 วันล่าสุด</h2>
        <p className="text-xs text-muted-foreground mb-3">ยังไม่กระทบ {pendingDays} วัน · ไม่ตรง {mismatchDays} วัน</p>
        <div className="bg-card rounded-2xl border border-border divide-y divide-border/60 max-h-[28rem] overflow-y-auto">
          {calendar.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground">ไม่มียอดโอนหรือเดลิเวอรีในช่วงนี้</p>}
          {calendar.map((d) => (
            <button key={d.date} onClick={() => setDate(d.date)}
              className={cn("w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left transition-colors", d.date === date ? "bg-primary/10" : "hover:bg-muted/50")}>
              <span>{fmtDay(d.date)}</span>
              <StatusChip status={d.mismatched > 0 ? (d.diff < 0 ? "short" : "over") : d.pending > 0 ? "pending" : "matched"} />
            </button>
          ))}
        </div>
      </aside>

      <section className="min-w-0">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h2 className="text-lg font-bold text-foreground">กระทบยอด</h2>
          <Input id="recon-date" type="date" value={date} max={thaiDate()} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-44" />
        </div>
        <p className="text-sm text-muted-foreground mb-5 max-w-2xl">
          กรอกยอดที่ได้รับจริงจากแอปธนาคารและแอปร้านค้า Grab / LINE MAN ของวันนั้น ส่วน GP ใส่ตามรายงานของแอป (ระบบเติมค่าประมาณจาก % ที่ตั้งไว้ให้ก่อน)
        </p>
        {isLoading ? <p className="text-muted-foreground text-sm">กำลังโหลด…</p> : (
          <div className="space-y-3">
            {sources.map((s) => {
              const d = drafts[s.source] ?? { actual: "", fee: "0", note: "" };
              const isTransfer = s.source === "transfer";
              const fee = isTransfer ? 0 : parseFloat(d.fee) || 0;
              const expected = s.gross - fee;
              const actual = parseFloat(d.actual);
              const liveDiff = Number.isNaN(actual) ? null : Math.round((actual - expected) * 100) / 100;
              const stale = s.saved && Math.abs(s.saved.grossAtSave - s.gross) > 0.005;
              return (
                <div key={s.source} className="bg-card rounded-2xl border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <h3 className="font-semibold text-foreground">{s.label}</h3>
                    <StatusChip status={s.saved ? s.saved.status : "pending"} />
                    {stale && <span className="text-xs text-amber-700 dark:text-amber-400">ยอดขายเปลี่ยนหลังกระทบ (มีบิลยกเลิก/เพิ่ม) — ตรวจอีกครั้ง</span>}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4 text-sm items-end">
                    <div>
                      <p className="text-xs text-muted-foreground">ยอดขายในระบบ</p>
                      <p className="text-base font-semibold tabular-nums">{fmtBaht(s.gross)}</p>
                    </div>
                    {!isTransfer ? (
                      <label className="block">
                        <span className="text-xs text-muted-foreground">GP ที่ถูกหัก {s.gpPercent > 0 && `(ตั้งไว้ ${s.gpPercent}%)`}</span>
                        <Input id={`fee-${s.source}`} type="number" min="0" step="0.01" value={d.fee}
                          onChange={(e) => setDrafts((x) => ({ ...x, [s.source]: { ...d, fee: e.target.value } }))} className="mt-1" />
                      </label>
                    ) : <div className="hidden sm:block" />}
                    <div>
                      <p className="text-xs text-muted-foreground">ควรได้รับ</p>
                      <p className="text-base font-semibold tabular-nums">{fmtBaht(expected)}</p>
                    </div>
                    <label className="block">
                      <span className="text-xs text-muted-foreground">ได้รับจริง</span>
                      <Input id={`actual-${s.source}`} type="number" min="0" step="0.01" value={d.actual} placeholder="0.00"
                        onChange={(e) => setDrafts((x) => ({ ...x, [s.source]: { ...d, actual: e.target.value } }))} className="mt-1" />
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Input id={`note-${s.source}`} value={d.note} placeholder="หมายเหตุ เช่น แอปจ่ายรวม 2 วัน"
                      onChange={(e) => setDrafts((x) => ({ ...x, [s.source]: { ...d, note: e.target.value } }))} className="flex-1 min-w-[12rem]" />
                    {liveDiff != null && Math.abs(liveDiff) > 1 && (
                      <span className={cn("text-sm font-medium tabular-nums", liveDiff < 0 ? "text-red-600 dark:text-red-400" : "text-amber-700 dark:text-amber-400")}>
                        {liveDiff < 0 ? "ขาด" : "เกิน"} {fmtBaht(Math.abs(liveDiff))}
                      </span>
                    )}
                    <Button size="sm" className="bg-primary text-white" disabled={save.isPending || d.actual === ""}
                      onClick={() => save.mutate({ branchId, date, source: s.source, actualNet: parseFloat(d.actual) || 0, feeAmount: isTransfer ? undefined : fee, note: d.note || undefined })}>
                      บันทึก
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Profit & Loss ───────────────────────────────────────────────────────────
type Pnl = {
  gross: number; byChannel: Array<{ slug: string; name: string; amount: number }>; vat: number; gpActual: number; gpEstimated: number;
  netSales: number; cogs: number; uncostedOrders: number; grossProfit: number; grossMargin: number; wasteValue: number;
  countVarianceValue: number; reconDiff: number; profit: number;
};

function PnlSection({ branchId }: { branchId: number | null }) {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(thaiDate());
  const { data, isLoading } = trpc.accounting.profitAndLoss.useQuery({ branchId: branchId ?? undefined, from, to });
  const presets = [
    { label: "เดือนนี้", from: monthStart(), to: thaiDate() },
    { label: "7 วัน", from: thaiDate(6), to: thaiDate() },
    { label: "เมื่อวาน", from: thaiDate(1), to: thaiDate(1) },
  ];
  const columns: Array<{ key: string; name: string; pnl: Pnl }> = data
    ? [...(data.branches.length > 1 ? data.branches.map((b) => ({ key: String(b.branchId), name: b.name, pnl: b.pnl })) : []), { key: "total", name: data.branches.length > 1 ? "รวม" : "ยอด", pnl: data.total }]
    : [];

  const rows: Array<{ label: string; get: (p: Pnl) => number; kind?: "sub" | "total" | "minus"; hint?: (p: Pnl) => string | null }> = [
    { label: "ยอดขายรวม", get: (p) => p.gross, kind: "total" },
    ...(data?.total.byChannel ?? []).map((c) => ({ label: `· ${c.name}`, get: (p: Pnl) => p.byChannel.find((x) => x.slug === c.slug)?.amount ?? 0, kind: "sub" as const })),
    { label: "หัก VAT ขาย", get: (p) => -p.vat, kind: "minus" },
    { label: "หัก GP แอปเดลิเวอรี", get: (p) => -(p.gpActual + p.gpEstimated), kind: "minus", hint: (p) => (p.gpEstimated > 0 ? `ประมาณการ ${fmtBaht(p.gpEstimated)} (วันที่ยังไม่กระทบยอด)` : null) },
    { label: "ยอดขายสุทธิ", get: (p) => p.netSales, kind: "total" },
    { label: "หัก ต้นทุนวัตถุดิบ", get: (p) => -p.cogs, kind: "minus", hint: (p) => (p.uncostedOrders > 0 ? `${p.uncostedOrders} บิลก่อนมีระบบสต็อก ใช้ต้นทุนต่อเมนูแทน` : null) },
    { label: "กำไรขั้นต้น", get: (p) => p.grossProfit, kind: "total", hint: (p) => `${p.grossMargin}% ของยอดขายสุทธิ` },
    { label: "หัก ของเสีย", get: (p) => -p.wasteValue, kind: "minus" },
    { label: "± ส่วนต่างจากการนับสต็อก", get: (p) => p.countVarianceValue },
    { label: "± ส่วนต่างกระทบยอด", get: (p) => p.reconDiff },
    { label: "กำไรก่อนค่าใช้จ่ายร้าน", get: (p) => p.profit, kind: "total" },
  ];

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h2 className="text-lg font-bold text-foreground mr-2">กำไร-ขาดทุน</h2>
        <Input id="pnl-from" type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} className="w-40" />
        <span className="text-muted-foreground text-sm">ถึง</span>
        <Input id="pnl-to" type="date" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} className="w-40" />
        {presets.map((p) => (
          <button key={p.label} onClick={() => { setFrom(p.from); setTo(p.to); }}
            className={cn("px-3 py-1.5 rounded-lg text-sm border", from === p.from && to === p.to ? "bg-primary text-white border-primary" : "border-border hover:bg-muted")}>
            {p.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground mb-5 max-w-2xl">
        ยังไม่รวมค่าเช่า ค่าแรง ค่าน้ำไฟ ตัวเลขสุดท้ายจึงเป็นกำไรก่อนหักค่าใช้จ่ายของร้าน ต้นทุนวัตถุดิบมาจากสูตรเมนู ณ เวลาที่ขาย
      </p>
      {isLoading || !data ? <p className="text-muted-foreground text-sm">กำลังโหลด…</p> : data.total.gross === 0 ? (
        <p className="text-center py-16 text-muted-foreground text-sm">ไม่มียอดขายในช่วงนี้</p>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium" />
                {columns.map((c) => <th key={c.key} className="text-right px-4 py-2.5 font-medium whitespace-nowrap">{c.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className={cn("border-b border-border/50 last:border-0", r.kind === "total" && "bg-muted/30")}>
                  <td className={cn("px-4 py-2.5", r.kind === "total" ? "font-semibold text-foreground" : r.kind === "sub" ? "text-muted-foreground pl-6" : "text-foreground")}>
                    {r.label}
                    {r.hint && r.hint(data.total) && <span className="block text-xs font-normal text-muted-foreground">{r.hint(data.total)}</span>}
                  </td>
                  {columns.map((c) => {
                    const raw = r.get(c.pnl);
                    const v = Math.abs(raw) < 0.005 ? 0 : raw; // ไม่แสดง −0.00
                    return (
                      <td key={c.key} className={cn("text-right px-4 py-2.5 tabular-nums whitespace-nowrap",
                        r.kind === "total" && "font-semibold",
                        r.kind === "sub" && "text-muted-foreground",
                        r.label.startsWith("กำไรก่อน") && (v < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"))}>
                        {v < 0 ? `−${fmtBaht(-v)}` : fmtBaht(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
