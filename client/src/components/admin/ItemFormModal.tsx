import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Category = { id: number; name: string };
type ModGroup = { id: number; name: string };
type Variant = { id?: number; name: string; priceWalkin: number; priceGrab: number };
type ItemFull = {
  id: number; categoryId: number; name: string; sku: string | null; costPrice: string | number;
  hasVariants: boolean; isActive: boolean; sortOrder: number;
  variants: Array<{ id: number; name: string; priceWalkin: string | number; priceGrab: string | number }>;
  modifierGroupIds: number[];
};

interface Props {
  itemId?: number;
  items: ItemFull[];
  categories: Category[];
  modifierGroups: ModGroup[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ItemFormModal({ itemId, items, categories, modifierGroups, onClose, onSaved }: Props) {
  const existing = items.find((i) => i.id === itemId);

  const [name, setName] = useState(existing?.name ?? "");
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? (categories[0]?.id ?? 1));
  const [sku, setSku] = useState(existing?.sku ?? "");
  const [costPrice, setCostPrice] = useState(String(existing?.costPrice ?? "0"));
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(String(existing?.sortOrder ?? "0"));
  const [variants, setVariants] = useState<Variant[]>(
    existing?.variants.map((v) => ({ id: v.id, name: v.name, priceWalkin: parseFloat(String(v.priceWalkin)), priceGrab: parseFloat(String(v.priceGrab)) })) ?? [{ name: "ปกติ", priceWalkin: 0, priceGrab: 0 }]
  );
  const [selectedModGroups, setSelectedModGroups] = useState<number[]>(existing?.modifierGroupIds ?? []);

  const upsert = trpc.admin.upsertItem.useMutation({
    onSuccess: () => { toast.success("บันทึกสำเร็จ"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });

  function addVariant() { setVariants((p) => [...p, { name: "", priceWalkin: 0, priceGrab: 0 }]); }
  function removeVariant(idx: number) { setVariants((p) => p.filter((_, i) => i !== idx)); }
  function updateVariant(idx: number, field: keyof Variant, value: string | number) {
    setVariants((p) => p.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  }
  function toggleModGroup(id: number) {
    setSelectedModGroups((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }

  function handleSave() {
    if (!name.trim()) { toast.error("กรุณากรอกชื่อสินค้า"); return; }
    if (variants.length === 0) { toast.error("ต้องมีอย่างน้อย 1 variant"); return; }
    upsert.mutate({
      id: itemId,
      categoryId,
      name: name.trim(),
      sku: sku || undefined,
      costPrice: parseFloat(costPrice) || 0,
      hasVariants: variants.length > 1,
      isActive,
      sortOrder: parseInt(sortOrder) || 0,
      variants,
      modifierGroupIds: selectedModGroups,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            {itemId ? "แก้ไขสินค้า" : "เพิ่มสินค้า"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">ชื่อสินค้า *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="เช่น ลาเต้" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">หมวดหมู่</label>
              <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">SKU</label>
              <input value={sku} onChange={(e) => setSku(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="เช่น LAT-001" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">ต้นทุน (฿)</label>
              <input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">ลำดับ</label>
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4" />
              <label htmlFor="isActive" className="text-sm text-foreground">เปิดใช้งาน</label>
            </div>
          </div>
          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">ราคา / Variants</p>
              <button onClick={addVariant} className="text-xs text-primary flex items-center gap-1 hover:underline"><Plus className="w-3 h-3" /> เพิ่ม</button>
            </div>
            <div className="space-y-2">
              {variants.map((v, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 items-center">
                  <input value={v.name} onChange={(e) => updateVariant(idx, "name", e.target.value)} placeholder="ชื่อ" className="border border-border rounded-lg px-2 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                  <input type="number" value={v.priceWalkin} onChange={(e) => updateVariant(idx, "priceWalkin", parseFloat(e.target.value) || 0)} placeholder="Walk-in" className="border border-border rounded-lg px-2 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                  <input type="number" value={v.priceGrab} onChange={(e) => updateVariant(idx, "priceGrab", parseFloat(e.target.value) || 0)} placeholder="Grab" className="border border-border rounded-lg px-2 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                  {variants.length > 1 && (
                    <button onClick={() => removeVariant(idx)} className="text-destructive hover:bg-destructive/10 rounded-lg p-1.5 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
              <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground px-1">
                <span>ชื่อ</span><span>Walk-in ฿</span><span>Grab ฿</span><span></span>
              </div>
            </div>
          </div>
          {/* Modifier Groups */}
          {modifierGroups.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">ตัวเลือกเพิ่มเติม (Modifiers)</p>
              <div className="flex flex-wrap gap-2">
                {modifierGroups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => toggleModGroup(g.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm border-2 transition-all ${selectedModGroups.includes(g.id) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-border flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">ยกเลิก</Button>
          <Button onClick={handleSave} disabled={upsert.isPending} className="flex-1" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
            {upsert.isPending ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>
      </div>
    </div>
  );
}

