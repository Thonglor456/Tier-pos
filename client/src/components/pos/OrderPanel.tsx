import { Minus, Plus, Trash2, ShoppingCart, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CartItem, SalesChannel } from "@/types/pos";

interface Props {
  cart: CartItem[];
  channel: SalesChannel;
  total: number;
  onUpdateQty: (cartId: string, delta: number) => void;
  onRemove: (cartId: string) => void;
  onCheckout: () => void;
  onCancelOrder: (orderId: number) => void;
  onClearCart?: () => void;
}

export default function OrderPanel({ cart, channel, total, onUpdateQty, onRemove, onCheckout, onClearCart }: Props) {
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div
      className="flex flex-col border-l border-border bg-card shrink-0"
      style={{ width: "340px" }}
    >
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-foreground text-sm">รายการออเดอร์</span>
          </div>
          <div className="flex items-center gap-2">
            {itemCount > 0 && (
              <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-medium">
                {itemCount} รายการ
              </span>
            )}
            {cart.length > 0 && onClearCart && (
              <button
                onClick={onClearCart}
                className="w-6 h-6 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                title="ล้างออเดอร์"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {channel === "walkin" ? "หน้าร้าน" : "Grab"}
        </p>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto py-2">
        {cart.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <ShoppingCart className="w-10 h-10 opacity-30" />
            <p className="text-sm">ยังไม่มีรายการ</p>
            <p className="text-xs opacity-60">แตะสินค้าเพื่อเพิ่มลงออเดอร์</p>
          </div>
        )}
        {cart.map((item) => (
          <div key={item.cartId} className="px-4 py-2.5 border-b border-border/50 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-tight">{item.itemName}</p>
                <p className="text-xs text-muted-foreground">{item.variantName}</p>
                {item.modifiers.length > 0 && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {item.modifiers.map((m) => m.modifierName).join(", ")}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <p className="text-sm font-semibold text-foreground">฿{item.totalPrice.toLocaleString()}</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onUpdateQty(item.cartId, -1)}
                    className="w-6 h-6 rounded-md flex items-center justify-center bg-muted hover:bg-secondary transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQty(item.cartId, 1)}
                    className="w-6 h-6 rounded-md flex items-center justify-center bg-muted hover:bg-secondary transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onRemove(item.cartId)}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">ยอดรวม</span>
          <span className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            ฿{total.toLocaleString()}
          </span>
        </div>
        <Button
          onClick={onCheckout}
          disabled={cart.length === 0}
          className="w-full h-12 text-base font-semibold rounded-xl"
          style={cart.length > 0 ? { background: "oklch(0.38 0.08 50)", color: "oklch(0.97 0.01 75)" } : {}}
        >
          ชำระเงิน
        </Button>
      </div>
    </div>
  );
}
