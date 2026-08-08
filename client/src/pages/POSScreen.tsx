import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import type { CartItem, CartModifier } from "@/types/pos";
import CategoryTabs from "@/components/pos/CategoryTabs";
import ProductGrid from "@/components/pos/ProductGrid";
import OrderPanel from "@/components/pos/OrderPanel";
import ModifierModal from "@/components/pos/ModifierModal";
import PaymentModal from "@/components/pos/PaymentModal";
import CancelPinModal from "@/components/pos/CancelPinModal";
import POSHeader from "@/components/pos/POSHeader";
import { useStaff } from "@/contexts/StaffContext";
import { useBranch } from "@/contexts/BranchContext";

export default function POSScreen() {
  const { currentStaff } = useStaff();
  const { currentBranch } = useBranch();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [channelSlug, setChannelSlug] = useState<string>("walkin");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pendingItem, setPendingItem] = useState<{ itemId: number; variantId?: number } | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<number | null>(null);

  const { data: categories = [] } = trpc.menu.categories.useQuery();
  const { data: items = [] } = trpc.menu.items.useQuery({ categoryId: selectedCategoryId });
  const { data: modifierGroups = [] } = trpc.menu.modifierGroups.useQuery();
  const { data: channels = [] } = trpc.channels.list.useQuery();

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.totalPrice, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const getPrice = useCallback((variant: { priceWalkin: string | number; priceGrab: string | number; priceLineman?: string | number | null }) => {
    if (channelSlug === "grab") return parseFloat(String(variant.priceGrab));
    if (channelSlug === "lineman") return parseFloat(String(variant.priceLineman ?? variant.priceGrab));
    return parseFloat(String(variant.priceWalkin));
  }, [channelSlug]);

  const handleProductPress = useCallback((itemId: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const hasModifiers = item.modifierGroupIds.length > 0;
    const hasMultipleVariants = item.variants.length > 1;
    if (hasModifiers || hasMultipleVariants) {
      setPendingItem({ itemId });
    } else {
      const variant = item.variants[0];
      if (!variant) return;
      const basePrice = getPrice(variant);
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
  }, [items, getPrice]);

  const handleModifierConfirm = useCallback((variantId: number, modifiers: CartModifier[]) => {
    if (!pendingItem) return;
    const item = items.find((i) => i.id === pendingItem.itemId);
    if (!item) return;
    const variant = item.variants.find((v) => v.id === variantId);
    if (!variant) return;
    const basePrice = getPrice(variant);
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
  }, [pendingItem, items, getPrice]);

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

  const handleChannelChange = useCallback((newSlug: string) => {
    setChannelSlug(newSlug);
    setCart((prev) => prev.map((cartItem) => {
      const item = items.find((i) => i.id === cartItem.itemId);
      const variant = item?.variants.find((v) => v.id === cartItem.variantId);
      if (!variant) return cartItem;
      let newBase: number;
      if (newSlug === "grab") newBase = parseFloat(String(variant.priceGrab));
      else if (newSlug === "lineman") newBase = parseFloat(String((variant as { priceLineman?: string | number | null }).priceLineman ?? variant.priceGrab));
      else newBase = parseFloat(String(variant.priceWalkin));
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

  const channelName = channels.find((c) => c.slug === channelSlug)?.name ?? "หน้าร้าน";

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <POSHeader channelSlug={channelSlug} channels={channels} onChannelChange={handleChannelChange} cartCount={cartCount} />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
          <CategoryTabs categories={categories} selectedId={selectedCategoryId} onSelect={setSelectedCategoryId} />
          <ProductGrid items={items} channelSlug={channelSlug} onPress={handleProductPress} />
        </div>
        <OrderPanel
          cart={cart}
          channelSlug={channelSlug}
          channelName={channelName}
          total={cartTotal}
          onUpdateQty={handleUpdateQty}
          onRemove={handleRemoveItem}
          onCheckout={() => cart.length > 0 && setShowPayment(true)}
          onCancelOrder={(orderId: number) => setCancelTarget(orderId)}
          onClearCart={() => setCart([])}
        />
      </div>

      {pendingItemData && (
        <ModifierModal
          item={pendingItemData}
          modifierGroups={pendingModifierGroups}
          channelSlug={channelSlug}
          onConfirm={handleModifierConfirm}
          onClose={() => setPendingItem(null)}
        />
      )}

      {showPayment && (
        <PaymentModal
          cart={cart}
          channelSlug={channelSlug}
          total={cartTotal}
          staffId={currentStaff?.id}
          branchId={currentBranch?.id}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}

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
