import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ArrowLeft, Search, Save, RefreshCw, CupSoda } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useStaff } from "@/contexts/StaffContext";

type VariantEdit = {
  id: number;
  name: string;
  priceWalkin: number;
  priceGrab: number;
  priceLineman: number;
};

type ItemEditState = {
  variants: VariantEdit[];
  cupsPerServing: number;
};

export default function PriceEditScreen() {
  const { currentStaff } = useStaff();
  const [search, setSearch] = useState("");
  const [edits, setEdits] = useState<Record<number, ItemEditState>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  const { data: items = [], refetch } = trpc.admin.items.useQuery();
  const upsert = trpc.admin.upsertItem.useMutation({
    onError: (e) => toast.error(e.message),
  });

  if (!currentStaff) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">กรุณาเข้าสู่ระบบก่อน</p>
      </div>
    );
  }

  const filtered = useMemo(
    () => items.filter((it) => it.isActive && it.name.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  );

  function getEditState(item: typeof items[0]): ItemEditState {
    if (edits[item.id]) return edits[item.id]!;
    return {
      cupsPerServing: (item as { cupsPerServing?: number }).cupsPerServing ?? 1,
      variants: item.variants.map((v) => ({
        id: v.id,
        name: v.name,
        priceWalkin: parseFloat(String(v.priceWalkin)),
        priceGrab: parseFloat(String(v.priceGrab)),
        priceLineman: parseFloat(String((v as { priceLineman?: string | number }).priceLineman ?? v.priceGrab)),
      })),
    };
  }

  function setPrice(itemId: number, variantId: number, field: "priceWalkin" | "priceGrab" | "priceLineman", val: string) {
    const item = items.find((i) => i.id === itemId)!;
    const current = getEditState(item);
    setEdits((prev) => ({
      ...prev,
      [itemId]: {
        ...current,
        variants: current.variants.map((v) => v.id === variantId ? { ...v, [field]: parseFloat(val) || 0 } : v),
      },
    }));
  }

  function setCups(itemId: number, val: string) {
    const item = items.find((i) => i.id === itemId)!;
    const current = getEditState(item);
    setEdits((prev) => ({
      ...prev,
      [itemId]: { ...current, cupsPerServing: Math.max(1, parseInt(val) || 1) },
    }));
  }

  async function saveItem(item: typeof items[0]) {
    const state = getEditState(item);
    setSaving((p) => ({ ...p, [item.id]: true }));
    try {
      await upsert.mutateAsync({
        id: item.id,
        categoryId: item.categoryId,
        name: item.name,
        sku: item.sku ?? undefined,
        costPrice: parseFloat(String(item.costPrice)),
        hasVariants: item.hasVariants,
        cupsPerServing: state.cupsPerServing,
        isActive: item.isActive,
        sortOrder: item.sortOrder,
        modifierGroupIds: item.modifierGroupIds,
        variants: state.variants.map((v) => ({
          id: v.id,
          name: v.name,
          priceWalkin: v.priceWalkin,
          priceGrab: v.priceGrab,
          priceLineman: v.priceLineman,
        })),
      });
      toast.success(`บันทึก "${item.name}" แล้ว`);
      setEdits((prev) => { const n = { ...prev }; delete n[item.id]; return n; });
      refetch();
    } finally {
      setSaving((p) => ({ ...p, [item.id]: false }));
    }
  }

  const hasEdits = (itemId: number) => !!edits[itemId];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm shrink-0 px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">กลับ</span>
          </button>
        </Link>
        <div className="h-5 w-px bg-border" />
        <h1 className="text-base font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
          แก้ไขราคาสินค้า
        </h1>
        <p className="text-xs text-muted-foreground hidden sm:block">· {currentStaff.name}</p>
      </header>

      {/* Search */}
      <div className="px-4 py-3 border-b border-border bg-card/50 sticky top-0 z-10">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาเมนู..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">ไม่พบเมนู</div>
        )}
        {filtered.map((item) => {
          const state = getEditState(item);
          const dirty = hasEdits(item.id);
          const isSaving = saving[item.id] ?? false;
          return (
            <div
              key={item.id}
              className={`bg-card rounded-2xl border transition-all ${dirty ? "border-primary/60 shadow-sm" : "border-border"}`}
            >
              {/* Item header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{item.name}</p>
                    {item.variants.length > 1 && (
                      <p className="text-xs text-muted-foreground">{item.variants.length} ขนาด</p>
                    )}
                  </div>
                  {/* cups per serving */}
                  <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5 border border-border/60">
                    <CupSoda className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={state.cupsPerServing}
                      onChange={(e) => setCups(item.id, e.target.value)}
                      className="w-8 text-center text-sm font-semibold bg-transparent text-foreground focus:outline-none"
                      title="จำนวนแก้วต่อเมนู (เมนูเซต)"
                    />
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">แก้ว</span>
                  </div>
                </div>
                {dirty && (
                  <button
                    onClick={() => saveItem(item)}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 active:scale-95 transition disabled:opacity-60"
                  >
                    {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {isSaving ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                )}
              </div>

              {/* Variants + prices */}
              <div className="divide-y divide-border/40">
                {/* Column headers */}
                <div className="grid grid-cols-4 px-4 py-2 bg-muted/20">
                  <span className="text-[11px] font-medium text-muted-foreground">ขนาด</span>
                  <span className="text-[11px] font-medium text-muted-foreground text-right">หน้าร้าน</span>
                  <span className="text-[11px] font-medium text-muted-foreground text-right">Grab</span>
                  <span className="text-[11px] font-medium text-muted-foreground text-right">LINE MAN</span>
                </div>
                {state.variants.map((v) => (
                  <div key={v.id} className="grid grid-cols-4 items-center gap-2 px-4 py-2.5">
                    <span className="text-sm text-foreground truncate">{v.name}</span>
                    {(["priceWalkin", "priceGrab", "priceLineman"] as const).map((field) => (
                      <div key={field} className="flex justify-end">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">฿</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={v[field]}
                            onChange={(e) => setPrice(item.id, v.id, field, e.target.value)}
                            className="w-20 pl-5 pr-2 py-1.5 text-sm text-right rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
