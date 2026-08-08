import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Category = { id: number; name: string; sortOrder: number; isActive: boolean };

interface Props {
  categoryId?: number;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

export default function CategoryFormModal({ categoryId, categories, onClose, onSaved }: Props) {
  const existing = categories.find((c) => c.id === categoryId);
  const [name, setName] = useState(existing?.name ?? "");
  const [sortOrder, setSortOrder] = useState(String(existing?.sortOrder ?? "0"));
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);

  const upsert = trpc.admin.upsertCategory.useMutation({
    onSuccess: () => { toast.success("บันทึกสำเร็จ"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });

  function handleSave() {
    if (!name.trim()) { toast.error("กรุณากรอกชื่อหมวดหมู่"); return; }
    upsert.mutate({ id: categoryId, name: name.trim(), sortOrder: parseInt(sortOrder) || 0, isActive });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            {categoryId ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">ชื่อหมวดหมู่ *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="เช่น กาแฟ" autoFocus />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">ลำดับ</label>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="catActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4" />
            <label htmlFor="catActive" className="text-sm text-foreground">เปิดใช้งาน</label>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">ยกเลิก</Button>
          <Button onClick={handleSave} disabled={upsert.isPending} className="flex-1" style={{ background: "oklch(0.38 0.08 50)", color: "oklch(0.97 0.01 75)" }}>
            {upsert.isPending ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>
      </div>
    </div>
  );
}

