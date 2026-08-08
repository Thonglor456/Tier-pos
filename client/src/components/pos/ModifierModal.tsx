import { useState, useMemo } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { CartModifier } from "@/types/pos";

type Variant = { id: number; name: string; priceWalkin: string | number; priceGrab: string | number; priceLineman?: string | number | null };
type ModOption = { id: number; name: string; priceAdd: string | number; modifierGroupId: number };
type ModGroup = { id: number; name: string; isRequired: boolean; minSelect: number; maxSelect: number; options: ModOption[] };
type ItemData = { id: number; name: string; variants: Variant[]; modifierGroupIds: number[] };

interface Props {
  item: ItemData;
  modifierGroups: ModGroup[];
  channelSlug: string;
  onConfirm: (variantId: number, modifiers: CartModifier[]) => void;
  onClose: () => void;
}

function getVariantPrice(v: Variant, channelSlug: string): number {
  if (channelSlug === "grab") return parseFloat(String(v.priceGrab));
  if (channelSlug === "lineman") return parseFloat(String(v.priceLineman ?? v.priceGrab));
  return parseFloat(String(v.priceWalkin));
}

export default function ModifierModal({ item, modifierGroups, channelSlug, onConfirm, onClose }: Props) {
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    item.variants.length === 1 ? item.variants[0]!.id : null
  );
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number[]>>({});

  const selectedVariant = item.variants.find((v) => v.id === selectedVariantId);
  const basePrice = selectedVariant ? getVariantPrice(selectedVariant, channelSlug) : 0;
  const modifiersTotal = Object.values(selectedOptions).flat().reduce((sum, optId) => {
    for (const g of modifierGroups) {
      const opt = g.options.find((o) => o.id === optId);
      if (opt) return sum + parseFloat(String(opt.priceAdd));
    }
    return sum;
  }, 0);
  const total = basePrice + modifiersTotal;

  const requiredGroupsFilled = useMemo(() => {
    return modifierGroups.every((g) => {
      if (!g.isRequired) return true;
      return (selectedOptions[g.id]?.length ?? 0) >= g.minSelect;
    });
  }, [modifierGroups, selectedOptions]);

  const canConfirm = selectedVariantId !== null && requiredGroupsFilled;

  function toggleOption(groupId: number, optionId: number, maxSelect: number) {
    setSelectedOptions((prev) => {
      const current = prev[groupId] ?? [];
      if (current.includes(optionId)) return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      if (maxSelect === 1) return { ...prev, [groupId]: [optionId] };
      if (current.length >= maxSelect) return prev;
      return { ...prev, [groupId]: [...current, optionId] };
    });
  }

  function handleConfirm() {
    if (!selectedVariantId) {
      toast.error("กรุณาเลือกขนาด / ประเภทก่อน");
      return;
    }
    const missingGroups = modifierGroups.filter(
      (g) => g.isRequired && (selectedOptions[g.id]?.length ?? 0) < g.minSelect
    );
    if (missingGroups.length > 0) {
      toast.error(`กรุณาเลือก "${missingGroups[0]!.name}" ให้ครบก่อน`);
      return;
    }
    const modifiers: CartModifier[] = [];
    for (const g of modifierGroups) {
      const selected = selectedOptions[g.id] ?? [];
      for (const optId of selected) {
        const opt = g.options.find((o) => o.id === optId);
        if (opt) modifiers.push({ modifierOptionId: opt.id, modifierGroupName: g.name, modifierName: opt.name, priceAdd: parseFloat(String(opt.priceAdd)) });
      }
    }
    onConfirm(selectedVariantId, modifiers);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{item.name}</h2>
            <p className="text-sm text-muted-foreground">เลือกตัวเลือก</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {item.variants.length > 1 && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">ขนาด / ประเภท <span className="text-destructive">*</span></p>
              <div className="flex gap-2 flex-wrap">
                {item.variants.map((v) => {
                  const price = getVariantPrice(v, channelSlug);
                  const isSelected = selectedVariantId === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`flex-1 min-w-[100px] px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-150 ${
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary/50"
                      }`}
                    >
                      <span className="block">{v.name}</span>
                      <span className={`text-xs ${isSelected ? "opacity-80" : "text-muted-foreground"}`}>฿{price}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {modifierGroups.map((group) => (
            <div key={group.id}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-foreground">
                  {group.name}{group.isRequired && <span className="text-destructive ml-1">*</span>}
                </p>
                {!group.isRequired && <span className="text-xs text-muted-foreground">ไม่บังคับ</span>}
                {group.maxSelect > 1 && <span className="text-xs text-muted-foreground">เลือกได้สูงสุด {group.maxSelect}</span>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {group.options.map((opt) => {
                  const isSelected = (selectedOptions[group.id] ?? []).includes(opt.id);
                  const priceAdd = parseFloat(String(opt.priceAdd));
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleOption(group.id, opt.id, group.maxSelect)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-sm transition-all duration-150 ${
                        isSelected ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground hover:border-primary/40"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        {opt.name}
                      </span>
                      {priceAdd > 0 && <span className="text-xs text-muted-foreground">+฿{priceAdd}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">ราคารวม</span>
            <span className="text-xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>฿{total}</span>
          </div>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full h-12 text-base font-semibold rounded-xl"
            style={canConfirm ? { background: "var(--primary)", color: "var(--primary-foreground)" } : {}}
          >
            เพิ่มลงออเดอร์
          </Button>
        </div>
      </div>
    </div>
  );
}
