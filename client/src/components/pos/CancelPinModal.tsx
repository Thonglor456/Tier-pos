import { useState } from "react";
import { X, Delete, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Props {
  orderId: number;
  onSuccess: () => void;
  onClose: () => void;
}

export default function CancelPinModal({ orderId, onSuccess, onClose }: Props) {
  const [pin, setPin] = useState("");
  const [reason, setReason] = useState("");
  const [step, setStep] = useState<"pin" | "reason">("pin");
  const [pinError, setPinError] = useState(false);

  const verifyPin = trpc.posUsers.verifyPin.useMutation({
    onSuccess: (manager) => {
      if (manager) { setStep("reason"); setPinError(false); }
      else { setPinError(true); setPin(""); }
    },
    onError: () => { setPinError(true); setPin(""); },
  });

  const cancelOrder = trpc.orders.cancel.useMutation({
    onSuccess: () => { toast.success("ยกเลิกออเดอร์แล้ว"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  function handleNumpad(val: string) {
    if (val === "DEL") { setPin((p) => p.slice(0, -1)); setPinError(false); return; }
    if (pin.length >= 6) return;
    const newPin = pin + val;
    setPin(newPin);
    if (newPin.length === 4) {
      verifyPin.mutate({ pin: newPin });
    }
  }

  function handleCancel() {
    if (!reason.trim()) { toast.error("กรุณาระบุเหตุผล"); return; }
    cancelOrder.mutate({ orderId, pin, cancelReason: reason });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-destructive" />
            <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              {step === "pin" ? "ยืนยันตัวตน" : "ระบุเหตุผล"}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          {step === "pin" ? (
            <>
              <p className="text-sm text-muted-foreground text-center mb-4">กรอก PIN ผู้จัดการเพื่อยกเลิกออเดอร์</p>
              {/* PIN dots */}
              <div className="flex justify-center gap-3 mb-4">
                {[0,1,2,3].map((i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all duration-150 ${
                      pin.length > i
                        ? pinError ? "bg-destructive" : "bg-primary"
                        : "bg-muted border-2 border-border"
                    }`}
                  />
                ))}
              </div>
              {pinError && <p className="text-center text-xs text-destructive mb-3">PIN ไม่ถูกต้อง</p>}
              {/* Numpad */}
              <div className="grid grid-cols-3 gap-2">
                {["1","2","3","4","5","6","7","8","9","","0","DEL"].map((k, idx) => (
                  <button
                    key={idx}
                    onClick={() => k && handleNumpad(k)}
                    className={`numpad-btn ${!k ? "invisible" : ""}`}
                    disabled={!k}
                  >
                    {k === "DEL" ? <Delete className="w-5 h-5" /> : k}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">ระบุเหตุผลการยกเลิก</p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="เช่น ลูกค้าเปลี่ยนใจ, สั่งผิด..."
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={onClose} className="flex-1">ยกเลิก</Button>
                <Button
                  onClick={handleCancel}
                  disabled={!reason.trim() || cancelOrder.isPending}
                  className="flex-1"
                  style={{ background: "oklch(0.55 0.22 25)", color: "white" }}
                >
                  ยืนยันยกเลิก
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

