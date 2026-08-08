import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Props {
  staffId?: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function StaffFormModal({ staffId, onClose, onSaved }: Props) {
  const { data: staffList = [] } = trpc.posUsers.list.useQuery();
  const existing = staffId ? staffList.find((s) => s.id === staffId) : null;

  const [name, setName] = useState(existing?.name ?? "");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<"staff" | "manager">(existing?.role ?? "staff");

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setRole(existing.role as "staff" | "manager");
    }
  }, [existing?.id]);

  const upsert = trpc.posUsers.upsert.useMutation({
    onSuccess: () => { toast.success(staffId ? "แก้ไขพนักงานแล้ว" : "เพิ่มพนักงานแล้ว"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("กรุณากรอกชื่อ");
    if (!staffId && (pin.length < 4 || pin.length > 6)) return toast.error("PIN ต้องมี 4-6 หลัก");
    if (pin && (pin.length < 4 || pin.length > 6)) return toast.error("PIN ต้องมี 4-6 หลัก");
    upsert.mutate({ id: staffId, name: name.trim(), pinCode: pin || (existing?.pinCode ?? ""), role });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            {staffId ? "แก้ไขพนักงาน" : "เพิ่มพนักงาน"}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">ชื่อพนักงาน</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="ชื่อ-นามสกุล"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              PIN {staffId && <span className="text-xs text-muted-foreground">(เว้นว่างถ้าไม่เปลี่ยน)</span>}
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 tracking-widest"
              placeholder="4-6 หลัก"
              maxLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">สิทธิ์</label>
            <div className="flex gap-2">
              {(["staff", "manager"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    role === r ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:border-primary/40"
                  }`}
                >
                  {r === "staff" ? "พนักงาน" : "ผู้จัดการ"}
                </button>
              ))}
            </div>
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

