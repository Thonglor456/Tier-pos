import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Props {
  branchId?: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function BranchFormModal({ branchId, onClose, onSaved }: Props) {
  const { data: branchesList = [] } = trpc.branches.list.useQuery();
  const existing = branchId ? branchesList.find((b) => b.id === branchId) : null;

  const [name, setName] = useState(existing?.name ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setAddress(existing.address ?? "");
      setPhone(existing.phone ?? "");
    }
  }, [existing?.id]);

  const upsert = trpc.branches.upsert.useMutation({
    onSuccess: () => { toast.success(branchId ? "แก้ไขสาขาแล้ว" : "เพิ่มสาขาแล้ว"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("กรุณากรอกชื่อสาขา");
    upsert.mutate({ id: branchId, name: name.trim(), address: address.trim() || undefined, phone: phone.trim() || undefined, isActive: existing?.isActive ?? true });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            {branchId ? "แก้ไขสาขา" : "เพิ่มสาขา"}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">ชื่อสาขา <span className="text-destructive">*</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="เช่น สาขาสยาม"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">ที่อยู่ <span className="text-muted-foreground text-xs">(ไม่บังคับ)</span></label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="ที่อยู่สาขา"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">เบอร์โทร <span className="text-muted-foreground text-xs">(ไม่บังคับ)</span></label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="02-xxx-xxxx"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>ยกเลิก</Button>
            <Button type="submit" className="flex-1" disabled={upsert.isPending} style={{ background: "var(--primary)", color: "white" }}>
              {upsert.isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
