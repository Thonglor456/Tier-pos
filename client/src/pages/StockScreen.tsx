import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  ChevronLeft, Boxes, PackagePlus, ClipboardCheck, Trash, ArrowLeftRight, History, FlaskConical, BookOpen,
  Plus, X, Check, Pencil, MapPin, AlertTriangle, Warehouse,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useStaff } from "@/contexts/StaffContext";
import { useBranch } from "@/contexts/BranchContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Tab = "levels" | "withdraw" | "receive" | "count" | "waste" | "transfer" | "history" | "ingredients" | "recipes";
type BranchRow = { id: number; name: string; type: "shop" | "warehouse"; usesCentralStock: boolean; isActive: boolean };

const fmtQty = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 3 });
const fmtBaht = (n: number) => `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const todayStr = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const daysAgoStr = (d: number) => new Date(Date.now() + 7 * 3600000 - d * 86400000).toISOString().slice(0, 10);

const MOVEMENT_LABELS: Record<string, string> = {
  sale: "ขาย",
  sale_cancel: "คืนจากบิลยกเลิก",
  receive: "รับของเข้า",
  count: "ปรับจากการนับ",
  waste: "ของเสีย",
  transfer_out: "โอนออก",
  transfer_in: "รับโอน",
  transfer_return: "คืนจากการโอนที่ยกเลิก",
  withdraw_out: "สาขาเบิกออกจากคลัง",
  withdraw_in: "เบิกจากคลัง",
  return_out: "คืนของเข้าคลัง",
  return_in: "สาขาคืนของเข้าคลัง",
};

const LEVEL_STYLE: Record<string, string> = {
  out: "bg-red-500/15 text-red-600 dark:text-red-400",
  low: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  ok: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};
const LEVEL_LABEL: Record<string, string> = { out: "หมด", low: "ใกล้หมด", ok: "พอ" };

export default function StockScreen() {
  const [, navigate] = useLocation();
  const { currentStaff } = useStaff();
  const { currentBranch } = useBranch();
  const [activeTab, setActiveTab] = useState<Tab>("levels");
  const isManager = currentStaff?.role === "manager" || currentStaff?.role === "admin";
  const isAdmin = currentStaff?.role === "admin";
  const lockedBranchId = !isAdmin && currentStaff?.branchId ? currentStaff.branchId : null;
  const [pickedBranch, setPickedBranch] = useState<number | null>(currentBranch?.id ?? null);
  const branchId = lockedBranchId ?? pickedBranch;
  const { data: branches = [] } = trpc.branches.list.useQuery();
  const activeBranches = branches.filter((b) => b.isActive);
  const activeShops = activeBranches.filter((b) => b.type === "shop");
  const selected = branches.find((b) => b.id === branchId);
  const hasWarehouse = activeBranches.some((b) => b.type === "warehouse");
  // แท็บเบิก: สาขาที่ใช้คลังกลาง หรือคนที่อยู่คลังเอง
  const canWithdraw = hasWarehouse && (!selected ? isAdmin : selected.type === "warehouse" || selected.usesCentralStock);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; managerOnly?: boolean; hidden?: boolean }[] = [
    { id: "levels", label: "คงเหลือ", icon: <Boxes className="w-4 h-4" /> },
    { id: "withdraw", label: "เบิกจากคลัง", icon: <Warehouse className="w-4 h-4" />, hidden: !canWithdraw },
    { id: "receive", label: "รับของเข้า", icon: <PackagePlus className="w-4 h-4" /> },
    { id: "count", label: "นับสต็อก", icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: "waste", label: "ของเสีย", icon: <Trash className="w-4 h-4" /> },
    { id: "transfer", label: "โอนระหว่างสาขา", icon: <ArrowLeftRight className="w-4 h-4" /> },
    { id: "history", label: "ประวัติ", icon: <History className="w-4 h-4" /> },
    { id: "ingredients", label: "วัตถุดิบ", icon: <FlaskConical className="w-4 h-4" />, managerOnly: true },
    { id: "recipes", label: "สูตรเมนู", icon: <BookOpen className="w-4 h-4" />, managerOnly: true },
  ];
  const visibleTabs = tabs.filter((t) => (!t.managerOnly || isManager) && !t.hidden);
  const needsBranch = ["withdraw", "receive", "count", "waste", "transfer"].includes(activeTab);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate("/")} className="text-primary hover:text-foreground transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-foreground">สต็อกวัตถุดิบ</h1>
        <div className="ml-auto flex items-center gap-1.5 text-sm">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          {lockedBranchId ? (
            <span className="text-foreground">{branches.find((b) => b.id === lockedBranchId)?.name ?? "สาขาของฉัน"}</span>
          ) : (
            <select
              id="stock-branch"
              value={pickedBranch ?? ""}
              onChange={(e) => setPickedBranch(e.target.value ? Number(e.target.value) : null)}
              className="bg-background border border-border rounded-lg px-2 py-1 text-sm text-foreground"
            >
              <option value="">ทุกสาขา</option>
              {activeBranches.map((b) => <option key={b.id} value={b.id}>{b.type === "warehouse" ? `🏬 ${b.name}` : b.name}</option>)}
            </select>
          )}
        </div>
      </header>

      <div className="sm:hidden flex border-b border-border bg-card shrink-0 overflow-x-auto">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors shrink-0",
              activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            )}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden sm:flex w-56 bg-card border-r border-border p-4 flex-col gap-1 shrink-0">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                activeTab === tab.id ? "bg-primary text-white" : "text-primary hover:bg-muted"
              )}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </aside>

        <main className="flex-1 p-4 sm:p-8 overflow-y-auto min-w-0">
          {needsBranch && !branchId ? (
            <EmptyNote text="เลือกสาขาที่มุมขวาบนก่อน (รายการนี้ต้องระบุสาขา)" />
          ) : (
            <>
              {activeTab === "levels" && <LevelsSection branchId={branchId} />}
              {activeTab === "withdraw" && canWithdraw && <WithdrawSection branchId={branchId!} branches={branches} />}
              {activeTab === "receive" && <ReceiveSection branchId={branchId!} />}
              {activeTab === "count" && <CountSection branchId={branchId!} />}
              {activeTab === "waste" && <WasteSection branchId={branchId!} />}
              {activeTab === "transfer" && (selected?.type === "warehouse"
                ? <EmptyNote text="ของเข้า-ออกคลังกลางใช้แท็บ “เบิกจากคลัง”" />
                : <TransferSection branchId={branchId!} branches={activeShops} />)}
              {activeTab === "history" && <HistorySection branchId={branchId} branches={branches} />}
              {activeTab === "ingredients" && isManager && <IngredientsSection />}
              {activeTab === "recipes" && isManager && <RecipesSection />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <div className="text-center py-16 text-muted-foreground text-sm">{text}</div>;
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      {hint && <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">{hint}</p>}
    </div>
  );
}

function useIngredientOptions() {
  const { data = [] } = trpc.stock.ingredients.useQuery();
  return data.filter((i) => i.isActive);
}

// ─── Levels ───────────────────────────────────────────────────────────────────
function LevelsSection({ branchId }: { branchId: number | null }) {
  const { data, isLoading } = trpc.stock.levels.useQuery(branchId ? { branchId } : undefined);
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  if (isLoading) return <EmptyNote text="กำลังโหลด…" />;
  if (!data || data.ingredients.length === 0) {
    return <EmptyNote text="ยังไม่มีวัตถุดิบ — ผู้จัดการเพิ่มได้ที่แท็บ “วัตถุดิบ” แล้วตั้งสูตรเมนูที่แท็บ “สูตรเมนู”" />;
  }
  const alerts = data.ingredients.filter((i) => i.perBranch.some((p) => p.level !== "ok"));
  const rows = onlyAlerts ? alerts : data.ingredients;
  return (
    <div>
      <SectionTitle title="คงเหลือ" hint="ยอดในระบบ = รับเข้า − ขายตามสูตร − ของเสีย ± โอน ± ปรับจากการนับ" />
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {alerts.length > 0 ? (
          <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" /> ต้องสั่งเพิ่ม {alerts.length} รายการ
          </div>
        ) : (
          <div className="text-sm px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">ทุกรายการยังพอ</div>
        )}
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch id="only-alerts" checked={onlyAlerts} onCheckedChange={setOnlyAlerts} /> แสดงเฉพาะที่ใกล้หมด
        </label>
      </div>
      <div className="bg-card rounded-2xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium">วัตถุดิบ</th>
              <th className="text-right px-3 py-2.5 font-medium">จุดสั่งซื้อ</th>
              {data.branches.map((b) => (
                <th key={b.id} className="text-right px-3 py-2.5 font-medium whitespace-nowrap">{b.type === "warehouse" ? `🏬 ${b.name}` : b.name}</th>
              ))}
              {data.branches.length > 1 && <th className="text-right px-4 py-2.5 font-medium">รวม</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((ing) => (
              <tr key={ing.id} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-2.5">
                  <span className="font-medium text-foreground">{ing.name}</span>
                  <span className="text-xs text-muted-foreground ml-1.5">({ing.unit})</span>
                </td>
                <td className="text-right px-3 py-2.5 text-muted-foreground tabular-nums">{ing.reorderLevel > 0 ? fmtQty(ing.reorderLevel) : "—"}</td>
                {ing.perBranch.map((p) => (
                  <td key={p.branchId} className="text-right px-3 py-2.5">
                    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md tabular-nums", LEVEL_STYLE[p.level])} title={LEVEL_LABEL[p.level]}>
                      {fmtQty(p.quantity)}
                    </span>
                  </td>
                ))}
                {data.branches.length > 1 && <td className="text-right px-4 py-2.5 font-semibold tabular-nums">{fmtQty(ing.total)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Line editor shared by receive / waste / transfer ────────────────────────
type Line = { key: number; ingredientId: number | ""; quantity: string; totalCost: string };
let lineKey = 1;
const newLine = (): Line => ({ key: lineKey++, ingredientId: "", quantity: "", totalCost: "" });

function LineEditor({ lines, setLines, withCost, hint }: {
  lines: Line[]; setLines: (l: Line[]) => void; withCost?: boolean;
  /** ข้อความเล็กท้ายแถว เช่น "คลังมี 1,200 g" */
  hint?: (ingredientId: number, quantity: number) => React.ReactNode;
}) {
  const options = useIngredientOptions();
  const update = (key: number, patch: Partial<Line>) => setLines(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  return (
    <div className="space-y-2">
      {lines.map((l, idx) => {
        const unit = options.find((o) => o.id === l.ingredientId)?.unit;
        return (
          <div key={l.key} className="flex flex-wrap items-center gap-2">
            <select
              id={`line-ing-${idx}`}
              value={l.ingredientId}
              onChange={(e) => update(l.key, { ingredientId: e.target.value ? Number(e.target.value) : "" })}
              className="flex-1 min-w-[10rem] bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
            >
              <option value="">เลือกวัตถุดิบ</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <div className="relative w-32">
              <Input id={`line-qty-${idx}`} type="number" min="0" step="any" inputMode="decimal" value={l.quantity}
                onChange={(e) => update(l.key, { quantity: e.target.value })} placeholder="จำนวน" className="pr-10" />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit ?? ""}</span>
            </div>
            {withCost && (
              <div className="relative w-36">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">฿</span>
                <Input id={`line-cost-${idx}`} type="number" min="0" step="any" inputMode="decimal" value={l.totalCost}
                  onChange={(e) => update(l.key, { totalCost: e.target.value })} placeholder="ราคารวม" className="pl-6" />
              </div>
            )}
            {hint && l.ingredientId !== "" && <span className="text-xs">{hint(l.ingredientId, parseFloat(l.quantity) || 0)}</span>}
            <button
              type="button"
              onClick={() => setLines(lines.length > 1 ? lines.filter((x) => x.key !== l.key) : [newLine()])}
              className="p-2 text-muted-foreground hover:text-destructive" aria-label="ลบแถว"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
      <button type="button" onClick={() => setLines([...lines, newLine()])} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
        <Plus className="w-4 h-4" /> เพิ่มรายการ
      </button>
    </div>
  );
}

function validLines(lines: Line[]) {
  return lines
    .filter((l) => l.ingredientId !== "" && parseFloat(l.quantity) > 0)
    .map((l) => ({ ingredientId: l.ingredientId as number, quantity: parseFloat(l.quantity), totalCost: parseFloat(l.totalCost) || 0 }));
}

// ─── Withdraw from central warehouse ─────────────────────────────────────────
function WithdrawSection({ branchId, branches }: { branchId: number; branches: BranchRow[] }) {
  const utils = trpc.useUtils();
  const options = useIngredientOptions();
  const here = branches.find((b) => b.id === branchId);
  const atWarehouse = here?.type === "warehouse";
  const shops = branches.filter((b) => b.type === "shop" && b.isActive && b.usesCentralStock);
  // คนที่อยู่คลังบันทึกแทนสาขาได้ ต้องเลือกว่าสาขาไหนมาเบิก
  const [shopId, setShopId] = useState<number | "">(atWarehouse ? "" : branchId);
  const targetShop = atWarehouse ? (shopId || null) : branchId;
  const [kind, setKind] = useState<"withdrawal" | "return">("withdrawal");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [note, setNote] = useState("");
  const { data: levels } = trpc.stock.levels.useQuery(targetShop ? { branchId: targetShop } : undefined, { enabled: !!targetShop });
  const { data: history = [] } = trpc.stock.transfers.useQuery({ branchId, kinds: ["withdrawal", "return"] });

  const warehouseCol = levels?.branches.findIndex((b) => b.type === "warehouse") ?? -1;
  const shopCol = levels?.branches.findIndex((b) => b.id === targetShop) ?? -1;
  const qtyAt = (col: number, ingredientId: number) =>
    col < 0 ? null : levels?.ingredients.find((i) => i.id === ingredientId)?.perBranch[col]?.quantity ?? 0;
  const ingOf = (id: number) => options.find((o) => o.id === id);
  const nameOf = (id: number) => branches.find((b) => b.id === id)?.name ?? `#${id}`;

  const withdraw = trpc.stock.withdraw.useMutation({
    onSuccess: (r) => {
      if (r.short.length > 0) {
        toast.warning(`บันทึกแล้ว แต่ยอดในระบบติดลบ ${r.short.length} รายการ — ลืมบันทึกรับของเข้าคลังหรือเปล่า?`);
      } else toast.success(kind === "withdrawal" ? "บันทึกการเบิกแล้ว" : "บันทึกการคืนของแล้ว");
      setLines([newLine()]); setNote("");
      utils.stock.levels.invalidate(); utils.stock.transfers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const submit = () => {
    if (!targetShop) return toast.error("เลือกสาขาที่มาเบิก");
    const v = validLines(lines);
    if (v.length === 0) return toast.error("กรุณาใส่วัตถุดิบและจำนวนอย่างน้อย 1 รายการ");
    withdraw.mutate({ kind, branchId: targetShop, note: note || undefined, lines: v.map(({ ingredientId, quantity }) => ({ ingredientId, quantity })) });
  };
  const sourceCol = kind === "withdrawal" ? warehouseCol : shopCol;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <SectionTitle title="เบิกจากคลังกลาง" hint="หยิบของจากคลังแล้วบันทึกตรงนี้ ของย้ายจากคลังเข้าสต็อกสาขาทันที และถูกตัดตามสูตรเมื่อขาย" />
        <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {([["withdrawal", "เบิกของ"], ["return", "คืนของเข้าคลัง"]] as const).map(([v, label]) => (
              <button key={v} type="button" onClick={() => setKind(v)}
                className={cn("px-3 py-1.5 rounded-lg text-sm border transition-colors", kind === v ? "bg-primary text-white border-primary" : "border-border text-foreground hover:bg-muted")}>
                {label}
              </button>
            ))}
            {atWarehouse ? (
              <select id="withdraw-shop" value={shopId} onChange={(e) => setShopId(e.target.value ? Number(e.target.value) : "")}
                className="ml-auto bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                <option value="">เลือกสาขาที่มาเบิก</option>
                {shops.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            ) : (
              <span className="ml-auto text-sm text-muted-foreground">
                {kind === "withdrawal" ? "คลังกลาง → " : ""}<span className="font-semibold text-foreground">{here?.name}</span>{kind === "return" ? " → คลังกลาง" : ""}
              </span>
            )}
          </div>
          <LineEditor
            lines={lines}
            setLines={setLines}
            hint={(id, q) => {
              const left = qtyAt(sourceCol, id);
              if (left == null) return null;
              const short = q > left;
              return (
                <span className={short ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}>
                  {kind === "withdrawal" ? "คลังมี" : "สาขามี"} {fmtQty(left)} {ingOf(id)?.unit}
                </span>
              );
            }}
          />
          <Input id="withdraw-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุ เช่น ใครเป็นคนหยิบ" />
          <Button onClick={submit} disabled={withdraw.isPending || !targetShop} className="bg-primary text-white">
            {withdraw.isPending ? "กำลังบันทึก…" : kind === "withdrawal" ? "บันทึกการเบิก" : "บันทึกการคืน"}
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">รายการเบิก / คืนล่าสุด</h3>
        {history.length === 0 ? <EmptyNote text="ยังไม่มีการเบิก" /> : (
          <div className="bg-card rounded-2xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">เวลา</th>
                <th className="text-left px-3 py-2.5 font-medium">ประเภท</th>
                <th className="text-left px-3 py-2.5 font-medium">สาขา</th>
                <th className="text-left px-3 py-2.5 font-medium">รายการ</th>
                <th className="text-right px-4 py-2.5 font-medium">มูลค่า</th>
              </tr></thead>
              <tbody>
                {history.map((t) => (
                  <tr key={t.id} className="border-b border-border/50 last:border-0 align-top">
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{new Date(t.createdAt).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{t.kind === "withdrawal" ? "เบิก" : "คืน"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{nameOf(t.kind === "withdrawal" ? t.toBranchId : t.fromBranchId)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {t.lines.map((l) => <div key={l.id}>{ingOf(l.ingredientId)?.name ?? l.ingredientId} {fmtQty(l.quantity)} {ingOf(l.ingredientId)?.unit}</div>)}
                      {t.note && <div className="text-xs">“{t.note}”</div>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtBaht(t.lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Receive ─────────────────────────────────────────────────────────────────
function ReceiveSection({ branchId }: { branchId: number }) {
  const utils = trpc.useUtils();
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [note, setNote] = useState("");
  const receive = trpc.stock.receive.useMutation({
    onSuccess: () => {
      toast.success("บันทึกรับของเข้าแล้ว");
      setLines([newLine()]); setNote("");
      utils.stock.levels.invalidate(); utils.stock.ingredients.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const submit = () => {
    const v = validLines(lines);
    if (v.length === 0) return toast.error("กรุณาใส่วัตถุดิบและจำนวนอย่างน้อย 1 รายการ");
    receive.mutate({ branchId, note: note || undefined, lines: v });
  };
  return (
    <div className="max-w-3xl">
      <SectionTitle title="รับของเข้า" hint="ซื้อของเข้าคลังกลางเป็นหลัก (เลือก 🏬 คลังกลาง ที่มุมขวาบน) ของที่สาขาซื้อเองให้รับเข้าสาขานั้น ใส่ราคารวมตามใบเสร็จ ระบบคำนวณต้นทุนเฉลี่ยต่อหน่วยใหม่ให้" />
      <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
        <LineEditor lines={lines} setLines={setLines} withCost />
        <Input id="receive-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุ เช่น ร้านที่ซื้อ / เลขใบเสร็จ" />
        <Button onClick={submit} disabled={receive.isPending} className="bg-primary text-white">
          {receive.isPending ? "กำลังบันทึก…" : "บันทึกรับของเข้า"}
        </Button>
      </div>
    </div>
  );
}

// ─── Waste ───────────────────────────────────────────────────────────────────
const WASTE_REASONS = ["หมดอายุ", "ทำหก / แตก", "ทำผิดสูตร ทิ้ง", "ชิมทดสอบ", "อื่นๆ"];
function WasteSection({ branchId }: { branchId: number }) {
  const utils = trpc.useUtils();
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [reason, setReason] = useState(WASTE_REASONS[0]!);
  const [detail, setDetail] = useState("");
  const waste = trpc.stock.waste.useMutation({
    onSuccess: () => { toast.success("บันทึกของเสียแล้ว"); setLines([newLine()]); setDetail(""); utils.stock.levels.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const submit = () => {
    const v = validLines(lines);
    if (v.length === 0) return toast.error("กรุณาใส่วัตถุดิบและจำนวนอย่างน้อย 1 รายการ");
    waste.mutate({ branchId, note: detail ? `${reason}: ${detail}` : reason, lines: v.map(({ ingredientId, quantity }) => ({ ingredientId, quantity })) });
  };
  return (
    <div className="max-w-3xl">
      <SectionTitle title="บันทึกของเสีย" hint="ของที่ทิ้งไปโดยไม่ได้ขาย ถูกนับเป็นค่าใช้จ่ายในรายงานกำไร-ขาดทุน" />
      <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
        <LineEditor lines={lines} setLines={setLines} />
        <div className="flex flex-wrap gap-2">
          {WASTE_REASONS.map((r) => (
            <button key={r} type="button" onClick={() => setReason(r)}
              className={cn("px-3 py-1.5 rounded-lg text-sm border transition-colors", reason === r ? "bg-primary text-white border-primary" : "border-border text-foreground hover:bg-muted")}>
              {r}
            </button>
          ))}
        </div>
        <Input id="waste-detail" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)" />
        <Button onClick={submit} disabled={waste.isPending} className="bg-primary text-white">
          {waste.isPending ? "กำลังบันทึก…" : "บันทึกของเสีย"}
        </Button>
      </div>
    </div>
  );
}

// ─── Count ───────────────────────────────────────────────────────────────────
function CountSection({ branchId }: { branchId: number }) {
  const utils = trpc.useUtils();
  const { data } = trpc.stock.levels.useQuery({ branchId });
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [result, setResult] = useState<Array<{ ingredientId: number; before: number; counted: number; diff: number; value: number }> | null>(null);
  const count = trpc.stock.count.useMutation({
    onSuccess: (r) => { setResult(r); setCounts({}); utils.stock.levels.invalidate(); toast.success("ปรับยอดตามที่นับแล้ว"); },
    onError: (e) => toast.error(e.message),
  });
  const ingredients = data?.ingredients ?? [];
  const col = data?.branches.findIndex((b) => b.id === branchId) ?? 0; // คลังกลางอาจอยู่คอลัมน์แรก
  const nameOf = (id: number) => ingredients.find((i) => i.id === id);
  const filled = Object.entries(counts).filter(([, v]) => v.trim() !== "" && !Number.isNaN(parseFloat(v)));
  const submit = () => {
    if (filled.length === 0) return toast.error("กรอกจำนวนที่นับได้อย่างน้อย 1 รายการ");
    count.mutate({ branchId, lines: filled.map(([id, v]) => ({ ingredientId: Number(id), countedQuantity: parseFloat(v) })) });
  };

  if (result) {
    const totalValue = result.reduce((s, r) => s + r.value, 0);
    return (
      <div className="max-w-3xl">
        <SectionTitle title="ผลการนับสต็อก" />
        <div className="bg-card rounded-2xl border border-border overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium">วัตถุดิบ</th>
              <th className="text-right px-3 py-2.5 font-medium">ในระบบ</th>
              <th className="text-right px-3 py-2.5 font-medium">นับได้</th>
              <th className="text-right px-3 py-2.5 font-medium">ส่วนต่าง</th>
              <th className="text-right px-4 py-2.5 font-medium">มูลค่า</th>
            </tr></thead>
            <tbody>
              {result.map((r) => (
                <tr key={r.ingredientId} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2.5">{nameOf(r.ingredientId)?.name ?? r.ingredientId}</td>
                  <td className="text-right px-3 py-2.5 tabular-nums">{fmtQty(r.before)}</td>
                  <td className="text-right px-3 py-2.5 tabular-nums">{fmtQty(r.counted)}</td>
                  <td className={cn("text-right px-3 py-2.5 tabular-nums font-medium", r.diff < 0 ? "text-red-600 dark:text-red-400" : r.diff > 0 ? "text-emerald-600 dark:text-emerald-400" : "")}>
                    {r.diff > 0 ? "+" : ""}{fmtQty(r.diff)}
                  </td>
                  <td className="text-right px-4 py-2.5 tabular-nums">{fmtBaht(r.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          มูลค่าส่วนต่างรวม <span className={cn("font-semibold", totalValue < 0 ? "text-red-600 dark:text-red-400" : "text-foreground")}>{fmtBaht(totalValue)}</span>
          {totalValue < -0.005 && " · ของหายมากกว่าที่สูตรคำนวณ ลองเช็กสูตรเมนูหรือการบันทึกของเสีย"}
        </p>
        <Button variant="outline" onClick={() => setResult(null)}>นับรอบใหม่</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <SectionTitle title="นับสต็อก" hint="นับของจริงแล้วกรอกเฉพาะรายการที่นับ ระบบจะปรับยอดให้ตรงและบันทึกส่วนต่างไว้ (ของขาดถูกนับเป็นค่าใช้จ่าย)" />
      {ingredients.length === 0 ? <EmptyNote text="ยังไม่มีวัตถุดิบ" /> : (
        <div className="bg-card rounded-2xl border border-border overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium">วัตถุดิบ</th>
              <th className="text-right px-3 py-2.5 font-medium">ในระบบ</th>
              <th className="text-right px-4 py-2.5 font-medium">นับได้</th>
            </tr></thead>
            <tbody>
              {ingredients.map((ing) => (
                <tr key={ing.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2">{ing.name} <span className="text-xs text-muted-foreground">({ing.unit})</span></td>
                  <td className="text-right px-3 py-2 tabular-nums text-muted-foreground">{fmtQty(ing.perBranch[col]?.quantity ?? 0)}</td>
                  <td className="text-right px-4 py-2">
                    <Input id={`count-${ing.id}`} type="number" min="0" step="any" inputMode="decimal" value={counts[ing.id] ?? ""}
                      onChange={(e) => setCounts((c) => ({ ...c, [ing.id]: e.target.value }))} className="w-28 ml-auto text-right" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Button onClick={submit} disabled={count.isPending || filled.length === 0} className="bg-primary text-white">
        {count.isPending ? "กำลังบันทึก…" : `บันทึกผลนับ (${filled.length} รายการ)`}
      </Button>
    </div>
  );
}

// ─── Transfers ───────────────────────────────────────────────────────────────
function TransferSection({ branchId, branches }: { branchId: number; branches: Array<{ id: number; name: string }> }) {
  const utils = trpc.useUtils();
  const options = useIngredientOptions();
  const { data: transfers = [] } = trpc.stock.transfers.useQuery({ branchId, kinds: ["transfer"] });
  const [toBranchId, setToBranchId] = useState<number | "">("");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [note, setNote] = useState("");
  const [receiving, setReceiving] = useState<(typeof transfers)[number] | null>(null);
  const [received, setReceived] = useState<Record<number, string>>({});
  const refresh = () => { utils.stock.transfers.invalidate(); utils.stock.levels.invalidate(); };
  const create = trpc.stock.createTransfer.useMutation({
    onSuccess: () => { toast.success("ส่งของแล้ว รอสาขาปลายทางกดรับ"); setLines([newLine()]); setNote(""); refresh(); },
    onError: (e) => toast.error(e.message),
  });
  const receive = trpc.stock.receiveTransfer.useMutation({
    onSuccess: () => { toast.success("รับของเข้าสาขาแล้ว"); setReceiving(null); refresh(); },
    onError: (e) => toast.error(e.message),
  });
  const cancel = trpc.stock.cancelTransfer.useMutation({
    onSuccess: () => { toast.success("ยกเลิกการโอนแล้ว ของกลับเข้าสาขาต้นทาง"); refresh(); },
    onError: (e) => toast.error(e.message),
  });
  const nameOf = (id: number) => branches.find((b) => b.id === id)?.name ?? `สาขา #${id}`;
  const ingOf = (id: number) => options.find((o) => o.id === id);
  const submit = () => {
    if (!toBranchId) return toast.error("เลือกสาขาปลายทาง");
    const v = validLines(lines);
    if (v.length === 0) return toast.error("กรุณาใส่วัตถุดิบและจำนวนอย่างน้อย 1 รายการ");
    create.mutate({ fromBranchId: branchId, toBranchId, note: note || undefined, lines: v.map(({ ingredientId, quantity }) => ({ ingredientId, quantity })) });
  };
  const incoming = transfers.filter((t) => t.toBranchId === branchId && t.status === "in_transit");

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <SectionTitle title="โอนของระหว่างสาขา" hint="ของออกจากสาขานี้ทันทีที่กดส่ง และเข้าสาขาปลายทางเมื่อปลายทางกดรับ ถ้าได้รับไม่ครบ ส่วนที่ขาดบันทึกเป็นของเสียระหว่างโอน" />
        {incoming.length > 0 && (
          <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">มีของรอรับ {incoming.length} รายการ</p>
            <div className="space-y-2">
              {incoming.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-foreground">#{t.id} จาก {nameOf(t.fromBranchId)} · {t.lines.length} รายการ</span>
                  <Button size="sm" className="bg-primary text-white ml-auto"
                    onClick={() => { setReceiving(t); setReceived(Object.fromEntries(t.lines.map((l) => [l.id, String(l.quantity)]))); }}>
                    ตรวจรับ
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">จาก</span>
            <span className="font-semibold text-foreground">{nameOf(branchId)}</span>
            <span className="text-muted-foreground">ไป</span>
            <select id="transfer-to" value={toBranchId} onChange={(e) => setToBranchId(e.target.value ? Number(e.target.value) : "")}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
              <option value="">เลือกสาขาปลายทาง</option>
              {branches.filter((b) => b.id !== branchId).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <LineEditor lines={lines} setLines={setLines} />
          <Input id="transfer-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุ เช่น ใครเป็นคนนำไปส่ง" />
          <Button onClick={submit} disabled={create.isPending} className="bg-primary text-white">
            {create.isPending ? "กำลังบันทึก…" : "ส่งของ"}
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">รายการโอนล่าสุด</h3>
        {transfers.length === 0 ? <EmptyNote text="ยังไม่มีการโอน" /> : (
          <div className="bg-card rounded-2xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">เลขที่</th>
                <th className="text-left px-3 py-2.5 font-medium">วันที่</th>
                <th className="text-left px-3 py-2.5 font-medium">เส้นทาง</th>
                <th className="text-left px-3 py-2.5 font-medium">รายการ</th>
                <th className="text-left px-3 py-2.5 font-medium">สถานะ</th>
                <th className="px-4 py-2.5" />
              </tr></thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id} className="border-b border-border/50 last:border-0 align-top">
                    <td className="px-4 py-2.5 tabular-nums">#{t.id}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{nameOf(t.fromBranchId)} → {nameOf(t.toBranchId)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {t.lines.map((l) => (
                        <div key={l.id}>
                          {ingOf(l.ingredientId)?.name ?? l.ingredientId} {fmtQty(l.quantity)} {ingOf(l.ingredientId)?.unit}
                          {l.receivedQuantity != null && l.receivedQuantity < l.quantity && (
                            <span className="text-red-600 dark:text-red-400"> (ได้รับ {fmtQty(l.receivedQuantity)})</span>
                          )}
                        </div>
                      ))}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {t.status === "in_transit" && <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400">ระหว่างทาง</span>}
                      {t.status === "received" && <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">รับแล้ว</span>}
                      {t.status === "cancelled" && <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground">ยกเลิก</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {t.status === "in_transit" && t.fromBranchId === branchId && (
                        <button onClick={() => cancel.mutate({ transferId: t.id })} disabled={cancel.isPending} className="text-xs text-red-500 hover:underline">ยกเลิก</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!receiving} onOpenChange={(o) => !o && setReceiving(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>ตรวจรับของ #{receiving?.id}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">แก้จำนวนถ้าได้รับไม่ครบ</p>
          <div className="space-y-2">
            {receiving?.lines.map((l) => (
              <div key={l.id} className="flex items-center gap-3 text-sm">
                <span className="flex-1">{ingOf(l.ingredientId)?.name} <span className="text-muted-foreground">(ส่งมา {fmtQty(l.quantity)} {ingOf(l.ingredientId)?.unit})</span></span>
                <Input id={`recv-${l.id}`} type="number" min="0" max={l.quantity} step="any" value={received[l.id] ?? ""}
                  onChange={(e) => setReceived((r) => ({ ...r, [l.id]: e.target.value }))} className="w-28 text-right" />
              </div>
            ))}
          </div>
          <Button className="bg-primary text-white" disabled={receive.isPending}
            onClick={() => receiving && receive.mutate({
              transferId: receiving.id,
              lines: receiving.lines.map((l) => ({ lineId: l.id, receivedQuantity: parseFloat(received[l.id] ?? "") || 0 })),
            })}>
            {receive.isPending ? "กำลังบันทึก…" : "ยืนยันรับของ"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── History ─────────────────────────────────────────────────────────────────
function HistorySection({ branchId, branches }: { branchId: number | null; branches: Array<{ id: number; name: string }> }) {
  const [from, setFrom] = useState(daysAgoStr(6));
  const [to, setTo] = useState(todayStr());
  const [type, setType] = useState<string>("");
  const options = useIngredientOptions();
  const { data: rows = [], isLoading } = trpc.stock.movements.useQuery({
    branchId: branchId ?? undefined, from, to,
    type: (type || undefined) as never,
  });
  const ingOf = (id: number) => options.find((o) => o.id === id);
  return (
    <div className="max-w-5xl">
      <SectionTitle title="ประวัติความเคลื่อนไหว" hint="ทุกครั้งที่สต็อกเปลี่ยนจะถูกบันทึกไว้ แก้หรือลบย้อนหลังไม่ได้" />
      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
        <Input id="hist-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        <span className="text-muted-foreground">ถึง</span>
        <Input id="hist-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        <select id="hist-type" value={type} onChange={(e) => setType(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
          <option value="">ทุกประเภท</option>
          {Object.entries(MOVEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {isLoading ? <EmptyNote text="กำลังโหลด…" /> : rows.length === 0 ? <EmptyNote text="ไม่มีความเคลื่อนไหวในช่วงนี้" /> : (
        <div className="bg-card rounded-2xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium">เวลา</th>
              {!branchId && <th className="text-left px-3 py-2.5 font-medium">สาขา</th>}
              <th className="text-left px-3 py-2.5 font-medium">ประเภท</th>
              <th className="text-left px-3 py-2.5 font-medium">วัตถุดิบ</th>
              <th className="text-right px-3 py-2.5 font-medium">จำนวน</th>
              <th className="text-right px-3 py-2.5 font-medium">มูลค่า</th>
              <th className="text-left px-4 py-2.5 font-medium">หมายเหตุ</th>
            </tr></thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">{new Date(m.createdAt).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  {!branchId && <td className="px-3 py-2 whitespace-nowrap">{branches.find((b) => b.id === m.branchId)?.name ?? m.branchId}</td>}
                  <td className="px-3 py-2 whitespace-nowrap">{MOVEMENT_LABELS[m.type] ?? m.type}{m.orderId ? <span className="text-muted-foreground"> · บิล {m.orderId}</span> : null}</td>
                  <td className="px-3 py-2">{ingOf(m.ingredientId)?.name ?? m.ingredientId}</td>
                  <td className={cn("text-right px-3 py-2 tabular-nums", m.quantity < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                    {m.quantity > 0 ? "+" : ""}{fmtQty(m.quantity)} {ingOf(m.ingredientId)?.unit}
                  </td>
                  <td className="text-right px-3 py-2 tabular-nums">{fmtBaht(Math.abs(m.quantity * m.unitCost))}</td>
                  <td className="px-4 py-2 text-muted-foreground">{m.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Ingredients (manager) ───────────────────────────────────────────────────
type IngForm = { id?: number; name: string; unit: string; costPerUnit: string; reorderLevel: string; isActive: boolean };
const UNIT_PRESETS = ["g", "ml", "ชิ้น", "ใบ", "ซอง"];

function IngredientsSection() {
  const utils = trpc.useUtils();
  const { data = [] } = trpc.stock.ingredients.useQuery();
  const [form, setForm] = useState<IngForm | null>(null);
  const save = trpc.stock.upsertIngredient.useMutation({
    onSuccess: () => { toast.success("บันทึกวัตถุดิบแล้ว"); setForm(null); utils.stock.ingredients.invalidate(); utils.stock.levels.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const submit = () => {
    if (!form || !form.name.trim() || !form.unit.trim()) return toast.error("กรอกชื่อและหน่วย");
    save.mutate({
      id: form.id, name: form.name.trim(), unit: form.unit.trim(),
      costPerUnit: parseFloat(form.costPerUnit) || 0, reorderLevel: parseFloat(form.reorderLevel) || 0, isActive: form.isActive,
    });
  };
  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <SectionTitle title="วัตถุดิบ" hint="ใช้หน่วยเล็กที่สุดที่ใช้ในสูตร เช่น เมล็ดกาแฟเป็นกรัม นมเป็นมิลลิลิตร แก้วเป็นใบ" />
        <Button size="sm" className="bg-primary text-white gap-1 shrink-0" onClick={() => setForm({ name: "", unit: "g", costPerUnit: "", reorderLevel: "", isActive: true })}>
          <Plus className="w-4 h-4" /> เพิ่ม
        </Button>
      </div>
      {data.length === 0 ? <EmptyNote text="ยังไม่มีวัตถุดิบ กด “เพิ่ม” เพื่อเริ่ม เช่น เมล็ดกาแฟ (g), นมสด (ml), แก้ว 16oz (ใบ)" /> : (
        <div className="bg-card rounded-2xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium">ชื่อ</th>
              <th className="text-left px-3 py-2.5 font-medium">หน่วย</th>
              <th className="text-right px-3 py-2.5 font-medium">ต้นทุน/หน่วย</th>
              <th className="text-right px-3 py-2.5 font-medium">จุดสั่งซื้อ</th>
              <th className="px-4 py-2.5" />
            </tr></thead>
            <tbody>
              {data.map((ing) => (
                <tr key={ing.id} className={cn("border-b border-border/50 last:border-0", !ing.isActive && "opacity-50")}>
                  <td className="px-4 py-2.5 font-medium">{ing.name}</td>
                  <td className="px-3 py-2.5">{ing.unit}</td>
                  <td className="text-right px-3 py-2.5 tabular-nums">฿{parseFloat(String(ing.costPerUnit)).toLocaleString("th-TH", { maximumFractionDigits: 4 })}</td>
                  <td className="text-right px-3 py-2.5 tabular-nums">{fmtQty(parseFloat(String(ing.reorderLevel)))}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button className="p-1.5 text-muted-foreground hover:text-primary" aria-label="แก้ไข"
                      onClick={() => setForm({ id: ing.id, name: ing.name, unit: ing.unit, costPerUnit: String(parseFloat(String(ing.costPerUnit))), reorderLevel: String(parseFloat(String(ing.reorderLevel))), isActive: ing.isActive })}>
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.id ? "แก้ไขวัตถุดิบ" : "เพิ่มวัตถุดิบ"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <label className="block text-sm">ชื่อ
                <Input id="ing-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น เมล็ดกาแฟ House Blend" className="mt-1" />
              </label>
              <div className="text-sm">หน่วย
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {UNIT_PRESETS.map((u) => (
                    <button key={u} type="button" onClick={() => setForm({ ...form, unit: u })}
                      className={cn("px-3 py-1.5 rounded-lg border text-sm", form.unit === u ? "bg-primary text-white border-primary" : "border-border hover:bg-muted")}>{u}</button>
                  ))}
                  <Input id="ing-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-24" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">ต้นทุนต่อ {form.unit || "หน่วย"} (บาท)
                  <Input id="ing-cost" type="number" min="0" step="any" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} className="mt-1" />
                </label>
                <label className="block text-sm">แจ้งเตือนเมื่อเหลือต่ำกว่า
                  <Input id="ing-reorder" type="number" min="0" step="any" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} className="mt-1" />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">ต้นทุนจะอัปเดตเองทุกครั้งที่รับของเข้า ช่องนี้ใช้ตั้งค่าเริ่มต้น เช่น เมล็ด 1 กก. 600 บาท = 0.6 บาท/g</p>
              <label className="flex items-center gap-2 text-sm"><Switch id="ing-active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} /> ใช้งานอยู่</label>
              <Button onClick={submit} disabled={save.isPending} className="bg-primary text-white w-full">บันทึก</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Recipes (manager) ───────────────────────────────────────────────────────
type RecipeRow = { key: number; variantId: number | null; ingredientId: number | ""; quantity: string };

function RecipesSection() {
  const utils = trpc.useUtils();
  const { data } = trpc.stock.recipes.useQuery();
  const ingredients = useIngredientOptions();
  const [search, setSearch] = useState("");
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [editOptionId, setEditOptionId] = useState<number | null>(null);
  const [rows, setRows] = useState<RecipeRow[]>([]);
  const costOf = useMemo(() => new Map(ingredients.map((i) => [i.id, parseFloat(String(i.costPerUnit)) || 0])), [ingredients]);
  const ingName = (id: number) => ingredients.find((i) => i.id === id);

  const saveItem = trpc.stock.setItemRecipe.useMutation({
    onSuccess: () => { toast.success("บันทึกสูตรแล้ว"); setEditItemId(null); utils.stock.recipes.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const saveOption = trpc.stock.setModifierRecipe.useMutation({
    onSuccess: () => { toast.success("บันทึกสูตรตัวเลือกแล้ว"); setEditOptionId(null); utils.stock.recipes.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  if (!data) return <EmptyNote text="กำลังโหลด…" />;
  if (ingredients.length === 0) return <EmptyNote text="เพิ่มวัตถุดิบที่แท็บ “วัตถุดิบ” ก่อน แล้วค่อยกลับมาตั้งสูตร" />;

  const items = data.items.filter((i) => i.isActive && i.name.toLowerCase().includes(search.toLowerCase()));
  const withRecipe = data.items.filter((i) => i.isActive && i.lines.length > 0).length;
  const editItem = data.items.find((i) => i.id === editItemId);
  const editOption = data.modifierOptions.find((o) => o.id === editOptionId);

  const lineCost = (lines: Array<{ ingredientId: number; quantity: string | number }>) =>
    lines.reduce((s, l) => s + (parseFloat(String(l.quantity)) || 0) * (costOf.get(l.ingredientId) ?? 0), 0);

  const openItem = (it: (typeof data.items)[number]) => {
    setEditItemId(it.id);
    setRows(it.lines.length > 0
      ? it.lines.map((l) => ({ key: lineKey++, variantId: l.variantId, ingredientId: l.ingredientId, quantity: String(parseFloat(String(l.quantity))) }))
      : [{ key: lineKey++, variantId: null, ingredientId: "", quantity: "" }]);
  };
  const openOption = (o: (typeof data.modifierOptions)[number]) => {
    setEditOptionId(o.id);
    setRows(o.lines.length > 0
      ? o.lines.map((l) => ({ key: lineKey++, variantId: null, ingredientId: l.ingredientId, quantity: String(parseFloat(String(l.quantity))) }))
      : [{ key: lineKey++, variantId: null, ingredientId: "", quantity: "" }]);
  };
  const cleanRows = () => rows.filter((r) => r.ingredientId !== "" && parseFloat(r.quantity) !== 0 && !Number.isNaN(parseFloat(r.quantity)));
  const updateRow = (key: number, patch: Partial<RecipeRow>) => setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const rowEditor = (variants: Array<{ id: number; name: string }> | null, allowNegative: boolean) => (
    <div className="space-y-2">
      {rows.map((r, idx) => (
        <div key={r.key} className="flex flex-wrap items-center gap-2">
          {variants && variants.length > 1 && (
            <select id={`rec-var-${idx}`} value={r.variantId ?? ""} onChange={(e) => updateRow(r.key, { variantId: e.target.value ? Number(e.target.value) : null })}
              className="w-32 bg-background border border-border rounded-lg px-2 py-2 text-sm text-foreground">
              <option value="">ทุกขนาด</option>
              {variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          )}
          <select id={`rec-ing-${idx}`} value={r.ingredientId} onChange={(e) => updateRow(r.key, { ingredientId: e.target.value ? Number(e.target.value) : "" })}
            className="flex-1 min-w-[9rem] bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
            <option value="">เลือกวัตถุดิบ</option>
            {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <div className="relative w-28">
            <Input id={`rec-qty-${idx}`} type="number" step="any" min={allowNegative ? undefined : "0"} value={r.quantity}
              onChange={(e) => updateRow(r.key, { quantity: e.target.value })} className="pr-9" />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{r.ingredientId ? ingName(r.ingredientId)?.unit : ""}</span>
          </div>
          <button type="button" onClick={() => setRows(rows.filter((x) => x.key !== r.key))} className="p-2 text-muted-foreground hover:text-destructive" aria-label="ลบแถว"><X className="w-4 h-4" /></button>
        </div>
      ))}
      <button type="button" onClick={() => setRows([...rows, { key: lineKey++, variantId: null, ingredientId: "", quantity: "" }])} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
        <Plus className="w-4 h-4" /> เพิ่มวัตถุดิบ
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <SectionTitle title="สูตรเมนู" hint="ใส่ปริมาณวัตถุดิบต่อ 1 แก้ว ขายแล้วระบบตัดสต็อกและคิดต้นทุนให้ เมนูที่ยังไม่มีสูตรจะใช้ “ต้นทุน” ที่ตั้งไว้ในหน้าจัดการเมนูแทน" />
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Input id="recipe-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาเมนู…" className="max-w-xs" />
          <span className="text-sm text-muted-foreground">ตั้งสูตรแล้ว {withRecipe} / {data.items.filter((i) => i.isActive).length} เมนู</span>
        </div>
        <div className="bg-card rounded-2xl border border-border divide-y divide-border/60">
          {items.map((it) => (
            <button key={it.id} onClick={() => openItem(it)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors">
              <span className="flex-1 min-w-0">
                <span className="font-medium text-foreground">{it.name}</span>
                {it.lines.length > 0 && (
                  <span className="block text-xs text-muted-foreground truncate">
                    {it.lines.filter((l) => l.variantId == null).map((l) => `${ingName(l.ingredientId)?.name ?? "?"} ${parseFloat(String(l.quantity))}${ingName(l.ingredientId)?.unit ?? ""}`).join(" · ") || "มีสูตรแยกตามขนาด"}
                  </span>
                )}
              </span>
              {it.lines.length > 0 ? (
                <span className="text-sm tabular-nums text-foreground">{fmtBaht(lineCost(it.lines.filter((l) => l.variantId == null || l.variantId === it.variants[0]?.id).map((l) => ({ ingredientId: l.ingredientId, quantity: l.quantity }))))}</span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400">ยังไม่มีสูตร</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle title="ตัวเลือกที่ใช้วัตถุดิบ" hint="เช่น เพิ่มช็อต = เมล็ดกาแฟ +18 g · เปลี่ยนเป็นนมโอ๊ต = นมสด −150 ml และนมโอ๊ต +150 ml (ใส่ค่าติดลบเพื่อหักของที่ถูกแทน)" />
        <div className="flex flex-wrap gap-2">
          {data.modifierOptions.map((o) => (
            <button key={o.id} onClick={() => openOption(o)}
              className={cn("px-3 py-1.5 rounded-lg border text-sm transition-colors", o.lines.length > 0 ? "border-primary/50 text-foreground" : "border-border text-muted-foreground hover:bg-muted")}>
              {o.name}{o.lines.length > 0 && <Check className="w-3.5 h-3.5 inline ml-1 text-primary" />}
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItemId(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>สูตร: {editItem?.name}</DialogTitle></DialogHeader>
          {editItem && editItem.variants.length > 1 && (
            <p className="text-xs text-muted-foreground">“ทุกขนาด” ใช้กับทุกขนาดที่ไม่มีสูตรของตัวเอง ถ้าขนาดไหนมีแถวของตัวเอง ระบบใช้เฉพาะแถวของขนาดนั้น</p>
          )}
          {editItem && rowEditor(editItem.variants, false)}
          <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
            <span className="text-muted-foreground">ต้นทุนต่อแก้ว (สูตรกลาง)</span>
            <span className="font-semibold tabular-nums">{fmtBaht(lineCost(cleanRows().filter((r) => r.variantId == null).map((r) => ({ ingredientId: r.ingredientId as number, quantity: r.quantity }))))}</span>
          </div>
          <Button className="bg-primary text-white" disabled={saveItem.isPending}
            onClick={() => editItem && saveItem.mutate({
              itemId: editItem.id,
              lines: cleanRows().filter((r) => parseFloat(r.quantity) > 0).map((r) => ({ variantId: r.variantId, ingredientId: r.ingredientId as number, quantity: parseFloat(r.quantity) })),
            })}>
            บันทึกสูตร
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editOption} onOpenChange={(o) => !o && setEditOptionId(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>ตัวเลือก: {editOption?.name}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">ปริมาณที่ใช้เพิ่ม (หรือติดลบเมื่อแทนของเดิม) ต่อ 1 แก้ว</p>
          {rowEditor(null, true)}
          <Button className="bg-primary text-white" disabled={saveOption.isPending}
            onClick={() => editOption && saveOption.mutate({
              modifierOptionId: editOption.id,
              lines: cleanRows().map((r) => ({ ingredientId: r.ingredientId as number, quantity: parseFloat(r.quantity) })),
            })}>
            บันทึก
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
