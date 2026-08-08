import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import type { CartItem, CartModifier, SalesChannel } from "@/types/pos";
import CategoryTabs from "@/components/pos/CategoryTabs";
import ProductGrid from "@/components/pos/ProductGrid";
import OrderPanel from "@/components/pos/OrderPanel";
import ModifierModal from "@/components/pos/ModifierModal";
import PaymentModal from "@/components/pos/PaymentModal";
import CancelPinModal from "@/components/pos/CancelPinModal";
import POSHeader from "@/components/pos/POSHeader";

export default function POSScreen() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [channel, setChannel] = useState<SalesChannel>("walkin");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pendingItem, setPendingItem] = useState<{ itemId: number; variantId?: number } | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<number | null>(null);

  const { data: categories = [] } = trpc.menu.categories.useQuery();
  const { data: items = [] } = trpc.menu.items.useQuery({ categoryId: selectedCategoryId });
  const { data: modifierGroups = [] } = trpc.menu.modifierGroups.useQuery();

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.totalPrice, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const handleProductPress = useCallback((itemId: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const hasModifiers = item.modifierGroupIds.length > 0;
    const hasMultipleVariants = item.variants.length > 1;
    if (hasModifiers || hasMultipleVariants) {
      setPendingItem({ itemId });
    } else {
      // Auto-add with single variant
      const variant = item.variants[0];
      if (!variant) return;
      const basePrice = channel === "walkin" ? parseFloat(String(variant.priceWalkin)) : parseFloat(String(variant.priceGrab));
      const newItem: CartItem = {
        cartId: nanoid(),
        itemId: item.id,
        variantId: variant.id,
        itemName: item.name,
        variantName: variant.name,
        quantity: 1,
        basePrice,
        modifiersPrice: 0,
        totalPrice: basePrice,
        modifiers: [],
      };
      setCart((prev) => [...prev, newItem]);
    }
  }, [items, channel]);

  const handleModifierConfirm = useCallback((variantId: number, modifiers: CartModifier[]) => {
    if (!pendingItem) return;
    const item = items.find((i) => i.id === pendingItem.itemId);
    if (!item) return;
    const variant = item.variants.find((v) => v.id === variantId);
    if (!variant) return;
    const basePrice = channel === "walkin" ? parseFloat(String(variant.priceWalkin)) : parseFloat(String(variant.priceGrab));
    const modifiersPrice = modifiers.reduce((sum, m) => sum + m.priceAdd, 0);
    const newItem: CartItem = {
      cartId: nanoid(),
      itemId: item.id,
      variantId: variant.id,
      itemName: item.name,
      variantName: variant.name,
      quantity: 1,
      basePrice,
      modifiersPrice,
      totalPrice: (basePrice + modifiersPrice),
      modifiers,
    };
    setCart((prev) => [...prev, newItem]);
    setPendingItem(null);
  }, [pendingItem, items, channel]);

  const handleUpdateQty = useCallback((cartId: string, delta: number) => {
    setCart((prev) => prev.map((item) => {
      if (item.cartId !== cartId) return item;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return null as unknown as CartItem;
      return { ...item, quantity: newQty, totalPrice: (item.basePrice + item.modifiersPrice) * newQty };
    }).filter(Boolean));
  }, []);

  const handleRemoveItem = useCallback((cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  }, []);

  const handleChannelChange = useCallback((newChannel: SalesChannel) => {
    setChannel(newChannel);
    // Recalculate prices in cart
    setCart((prev) => prev.map((cartItem) => {
      const item = items.find((i) => i.id === cartItem.itemId);
      const variant = item?.variants.find((v) => v.id === cartItem.variantId);
      if (!variant) return cartItem;
      const newBase = newChannel === "walkin" ? parseFloat(String(variant.priceWalkin)) : parseFloat(String(variant.priceGrab));
      return { ...cartItem, basePrice: newBase, totalPrice: (newBase + cartItem.modifiersPrice) * cartItem.quantity };
    }));
  }, [items]);

  const handlePaymentSuccess = useCallback(() => {
    setCart([]);
    setShowPayment(false);
    toast.success("บันทึกออเดอร์สำเร็จ");
  }, []);

  const pendingItemData = useMemo(() => {
    if (!pendingItem) return null;
    return items.find((i) => i.id === pendingItem.itemId) ?? null;
  }, [pendingItem, items]);

  const pendingModifierGroups = useMemo(() => {
    if (!pendingItemData) return [];
    return modifierGroups.filter((g) => pendingItemData.modifierGroupIds.includes(g.id));
  }, [pendingItemData, modifierGroups]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <POSHeader channel={channel} onChannelChange={handleChannelChange} cartCount={cartCount} />
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Menu */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <CategoryTabs
            categories={categories}
            selectedId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
          />
          <ProductGrid
            items={items}
            channel={channel}
            onPress={handleProductPress}
          />
        </div>
        {/* Right: Order Panel */}
        <OrderPanel
          cart={cart}
          channel={channel}
          total={cartTotal}
          onUpdateQty={handleUpdateQty}
          onRemove={handleRemoveItem}
          onCheckout={() => cart.length > 0 && setShowPayment(true)}
          onCancelOrder={(orderId: number) => setCancelTarget(orderId)}
          onClearCart={() => setCart([])}
        />
      </div>

      {/* Modifier Modal */}
      {pendingItemData && (
        <ModifierModal
          item={pendingItemData}
          modifierGroups={pendingModifierGroups}
          channel={channel}
          onConfirm={handleModifierConfirm}
          onClose={() => setPendingItem(null)}
        />
      )}

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          cart={cart}
          channel={channel}
          total={cartTotal}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}

      {/* Cancel Order PIN Modal */}
      {cancelTarget !== null && (
        <CancelPinModal
          orderId={cancelTarget}
          onSuccess={() => { setCancelTarget(null); toast.success("ยกเลิกออเดอร์แล้ว"); }}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
}
