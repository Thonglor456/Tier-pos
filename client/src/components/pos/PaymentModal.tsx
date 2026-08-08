import { useState, useCallback } from "react";
import { X, Banknote, Smartphone, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { CartItem, SalesChannel, PaymentMethod } from "@/types/pos";

interface Props {
  cart: CartItem[];
  channel: SalesChannel;
  total: number;
  onSuccess: () => void;
  onClose: () => void;
}

const QUICK_AMOUNTS = [20, 50, 100, 500, 1000];

export default function PaymentModal({ cart, channel, total, onSuccess, onClose }: Props) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [cashInput, setCashInput] = useState("");

  const cashReceived = cashInput ? parseFloat(cashInput) : 0;
  const change = method === "cash" ? Math.max(0, cashReceived - total) : 0;
  const canPay = method === "transfer" || (method === "cash" && cashReceived >= total);

  const createOrder = trpc.orders.create.useMutation({
    onSuccess: () => { toast.success("บันทึกออเดอร์สำเร็จ"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const handleNumpad = useCallback((val: string) => {
    if (val === "DEL") { setCashInput((p) => p.slice(0, -1)); return; }
    if (val === "." && cashInput.includes(".")) return;
    if (cashInput.length >= 7) return;
    setCashInput((p) => p + val);
  }, [cashInput]);

  const handlePay = useCallback(() => {
    createOrder.mutate({
      salesChannel: channel,
      paymentMethod: method,
      totalAmount: total,
      cashReceived: method === "cash" ? cashReceived : undefined,
      changeAmount: method === "cash" ? change : undefined,
      items: cart.map((item) => ({
        itemId: item.itemId,
        variantId: item.variantId,
        itemName: item.itemName,
        variantName: item.variantName,
        quantity: item.quantity,
        basePrice: item.basePrice,
        modifiersPrice: item.modifiersPrice,
        totalPrice: item.totalPrice,
        modifiers: item.modifiers,
      })),
    });
  }, [createOrder, channel, method, total, cashReceived, change, cart]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden" style={{ maxHeight: "95vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>ชำระเงิน</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Order Summary */}
          <div className="bg-muted rounded-xl p-4 space-y-2">
            {cart.map((item) => (
              <div key={item.cartId} className="flex justify-between text-sm">
                <span className="text-foreground">{item.itemName} × {item.quantity}</span>
                <span className="font-medium text-foreground">฿{item.totalPrice.toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between font-bold">
              <span className="text-foreground">ยอดรวม</span>
              <span className="text-xl" style={{ fontFamily: "'Playfair Display', serif" }}>฿{total.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">วิธีชำระเงิน</p>
            <div className="grid grid-cols-2 gap-3">
              {([["cash", "เงินสด", Banknote], ["transfer", "โอนเงิน", Smartphone]] as const).map(([m, label, Icon]) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-150 ${
                    method === m ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${method === m ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`font-medium text-sm ${method === m ? "text-primary" : "text-foreground"}`}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cash Numpad */}
          {method === "cash" && (
            <div>
              {/* Display */}
              <div className="bg-muted rounded-xl px-4 py-3 mb-3">
                <p className="text-xs text-muted-foreground mb-1">รับเงิน</p>
                <p className="text-3xl font-bold text-foreground text-right" style={{ fontFamily: "'Playfair Display', serif" }}>
                  ฿{cashInput || "0"}
                </p>
                {cashReceived >= total && (
                  <p className="text-right text-sm text-green-700 font-medium mt-1">
                    เงินทอน ฿{change.toLocaleString()}
                  </p>
                )}
              </div>
              {/* Quick amounts */}
              <div className="flex gap-2 mb-3 flex-wrap">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCashInput(String(amt))}
                    className="px-3 py-1.5 rounded-lg bg-muted text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    ฿{amt}
                  </button>
                ))}
                <button
                  onClick={() => setCashInput(String(total))}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: "oklch(0.38 0.08 50)", color: "oklch(0.97 0.01 75)" }}
                >
                  พอดี
                </button>
              </div>
              {/* Numpad */}
              <div className="grid grid-cols-3 gap-2">
                {["7","8","9","4","5","6","1","2","3",".",  "0","DEL"].map((k) => (
                  <button
                    key={k}
                    onClick={() => handleNumpad(k)}
                    className="numpad-btn"
                  >
                    {k === "DEL" ? <Delete className="w-5 h-5" /> : k}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Transfer */}
          {method === "transfer" && (
            <div className="bg-muted rounded-xl p-6 text-center space-y-2">
              <Smartphone className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">โอนเงิน PromptPay / QR Code</p>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>฿{total.toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border">
          <Button
            onClick={handlePay}
            disabled={!canPay || createOrder.isPending}
            className="w-full h-12 text-base font-semibold rounded-xl"
            style={canPay ? { background: "oklch(0.38 0.08 50)", color: "oklch(0.97 0.01 75)" } : {}}
          >
            {createOrder.isPending ? "กำลังบันทึก..." : "ยืนยันการชำระเงิน"}
          </Button>
        </div>
      </div>
    </div>
  );
}

