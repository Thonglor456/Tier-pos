import { useState, useRef, useEffect } from "react";
import { Minus, Plus, Trash2, ShoppingCart, XCircle, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CartItem } from "@/types/pos";

const CHANNEL_COLORS: Record<string, string> = {
  walkin: "oklch(0.75 0.005 260)",
  grab: "oklch(0.52 0.18 145)",
  lineman: "oklch(0.52 0.22 200)",
};

interface Props {
  cart: CartItem[];
  channelSlug: string;
  channelName: string;
  total: number;
  onUpdateQty: (cartId: string, delta: number) => void;
  onRemove: (cartId: string) => void;
  onCheckout: (discountAmount: number) => void;
  onCancelOrder: (orderId: number) => void;
  onClearCart?: () => void;
}

export default function OrderPanel({ cart, channelSlug, channelName, total, onUpdateQty, onRemove, onCheckout, onClearCart }: Props) {
  const [discountMode, setDiscountMode] = useState<"none" | "picker" | "custom">("none");
  const [discountType, setDiscountType] = useState<"%" | "฿">("%");
  const [discountValue, setDiscountValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (discountMode === "custom" && inputRef.current) inputRef.current.focus();
  }, [discountMode]);

  // Preset quick discounts
  const presets = [
    { label: "5%", type: "%" as const, value: 5 },
    { label: "10%", type: "%" as const, value: 10 },
    { label: "15%", type: "%" as const, value: 15 },
    { label: "20%", type: "%" as const, value: 20 },
    { label: "฿10", type: "฿" as const, value: 10 },
    { label: "฿20", type: "฿" as const, value: 20 },
    { label: "฿50", type: "฿" as const, value: 50 },
  ];

  const numVal = parseFloat(discountValue) || 0;
  const discountAmount = discountMode !== "none"
    ? discountType === "%"
      ? Math.round(total * Math.min(numVal, 100) / 100)
      : Math.min(numVal, total)
    : 0;
  const finalTotal = Math.max(0, total - discountAmount);

  const applyPreset = (type: "%" | "฿", value: number) => {
    setDiscountType(type);
    setDiscountValue(String(value));
    setDiscountMode("custom");
  };

  const clearDiscount = () => {
    setDiscountMode("none");
    setDiscountValue("");
  };

  return (
    <div className="flex flex-col border-l border-border bg-card shrink-0" style={{ width: "320px" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>รายการ</span>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
              style={{ background: CHANNEL_COLORS[channelSlug] ?? "var(--primary)" }}
            >
              {channelName}
            </span>
            {cart.length > 0 && onClearCart && (
              <button
                onClick={onClearCart}
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="ล้างออเดอร์"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {cart.length > 0 && (
          <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground font-medium">
            <span>รายการ</span>
            <div className="flex items-center gap-6 pr-1">
              <span>จำนวน</span>
              <span>ราคา</span>
            </div>
          </div>
        )}
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 opacity-20" />
            <p className="text-sm font-medium">ยังไม่มีรายการ</p>
            <p className="text-xs opacity-60">แตะสินค้าเพื่อเพิ่มลงออเดอร์</p>
          </div>
        )}
        {cart.map((item) => (
          <div key={item.cartId} className="px-4 py-3 border-b border-border/40 last:border-0">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">{item.itemName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.variantName}{item.modifiers.length > 0 && `, ${item.modifiers.map((m) => m.modifierName).join(", ")}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onUpdateQty(item.cartId, -1)} className="w-6 h-6 rounded-md flex items-center justify-center bg-muted hover:bg-secondary transition-colors">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                <button onClick={() => onUpdateQty(item.cartId, 1)} className="w-6 h-6 rounded-md flex items-center justify-center bg-muted hover:bg-secondary transition-colors">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 min-w-[60px] justify-end">
                <span className="text-sm font-bold text-foreground">{item.totalPrice.toLocaleString()}.-</span>
                <button onClick={() => onRemove(item.cartId)} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        {/* Subtotal */}
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>รวมทั้งหมด</span>
          <span className="font-semibold text-foreground">{total.toLocaleString()}.-</span>
        </div>

        {/* Discount row */}
        {discountMode === "none" ? (
          <button
            onClick={() => setDiscountMode("picker")}
            disabled={cart.length === 0}
            className="w-full flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-30"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>เพิ่มส่วนลด</span>
          </button>
        ) : (
          <div className="space-y-2">
            {/* Preset buttons */}
            {discountMode === "picker" && (
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p.type, p.value)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  onClick={() => setDiscountMode("custom")}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  กำหนดเอง
                </button>
              </div>
            )}

            {/* Custom input */}
            {discountMode === "custom" && (
              <div className="flex items-center gap-1.5">
                <div className="flex rounded-lg overflow-hidden border border-border">
                  <button
                    onClick={() => setDiscountType("%")}
                    className={`px-2.5 py-1 text-xs font-bold transition-colors ${discountType === "%" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    %
                  </button>
                  <button
                    onClick={() => setDiscountType("฿")}
                    className={`px-2.5 py-1 text-xs font-bold transition-colors ${discountType === "฿" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    ฿
                  </button>
                </div>
                <input
                  ref={inputRef}
                  type="number"
                  min="0"
                  max={discountType === "%" ? "100" : String(total)}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "%" ? "0–100" : "จำนวนเงิน"}
                  className="flex-1 px-2 py-1 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            {/* Discount amount display + clear */}
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1 text-emerald-500">
                <Tag className="w-3.5 h-3.5" />
                <span className="font-medium">
                  ส่วนลด{discountMode === "custom" && discountType === "%" && numVal > 0 ? ` (${numVal}%)` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-500">-{discountAmount.toLocaleString()}.-</span>
                <button onClick={clearDiscount} className="text-muted-foreground hover:text-destructive transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Final total */}
        <div className="flex justify-between items-center pt-1 border-t border-border/60">
          <span className="text-base font-bold text-foreground">ยอดสุทธิ</span>
          <span className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "var(--primary)" }}>
            {finalTotal.toLocaleString()}.-
          </span>
        </div>

        <Button
          onClick={() => onCheckout(discountAmount)}
          disabled={cart.length === 0}
          className="w-full h-13 text-base font-bold rounded-xl mt-1 flex items-center gap-2"
          style={cart.length > 0 ? { background: "var(--primary)", color: "white" } : {}}
        >
          <ShoppingCart className="w-4 h-4" />
          ชำระเงิน
        </Button>
      </div>
    </div>
  );
}

