type ItemWithVariants = {
  id: number;
  name: string;
  isActive: boolean;
  variants: Array<{ id: number; name: string; priceWalkin: string | number; priceGrab: string | number; priceLineman?: string | number | null }>;
  modifierGroupIds: number[];
};

interface Props {
  items: ItemWithVariants[];
  channelSlug: string;
  onPress: (itemId: number) => void;
}

function getDisplayPrice(item: ItemWithVariants, channelSlug: string): string {
  if (item.variants.length === 0) return "-";
  const prices = item.variants.map((v) => {
    if (channelSlug === "grab") return parseFloat(String(v.priceGrab));
    if (channelSlug === "lineman") return parseFloat(String(v.priceLineman ?? v.priceGrab));
    return parseFloat(String(v.priceWalkin));
  });
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `${min}.-`;
  return `${min}–${max}.-`;
}

const PRODUCT_IMAGES: Record<string, string> = {
  "คาปูชิโน่": "/manus-storage/coffee_cappuccino_3ae2e86c.png",
  "อเมริกาโน่": "/manus-storage/coffee_americano_22eaaef9.png",
  "ลาเต้": "/manus-storage/coffee_latte_916025fb.png",
  "มอคค่า": "/manus-storage/coffee_mocha_8b5790fe.png",
  "ชาไทย": "/manus-storage/tea_thai_58a7f206.png",
  "ชาเขียว": "/manus-storage/tea_green_770d44e2.png",
  "คาราเมลมัคคิอาโต้": "/manus-storage/coffee_caramel_133106fb.png",
  "เอสเปรสโซ่ช็อต": "/manus-storage/coffee_espresso_340af496.png",
  "มัทฉะลาเต้": "/manus-storage/matcha_latte_e8106a6a.png",
  "นม": "/manus-storage/milk_plain_62845f54.png",
  "น้ำผึ้งมะนาวโซดา": "/manus-storage/soda_lemon_e5ece73d.png",
  "สตรอว์เบอร์รีโซดา": "/manus-storage/soda_strawberry_58fccec3.png",
  "เทียร์คอฟฟี่": "/manus-storage/coffee_tier_c1235dee.png",
  "ดับเบิ้ลโน่": "/manus-storage/coffee_cold_brew_0c4e0e6f.png",
};

function getProductImage(name: string): string {
  if (PRODUCT_IMAGES[name]) return PRODUCT_IMAGES[name]!;
  for (const [key, url] of Object.entries(PRODUCT_IMAGES)) {
    if (name.includes(key) || key.includes(name)) return url;
  }
  if (name.includes("ชา")) return "/manus-storage/tea_thai_58a7f206.png";
  if (name.includes("มัทฉะ")) return "/manus-storage/matcha_latte_e8106a6a.png";
  if (name.includes("นม")) return "/manus-storage/milk_plain_62845f54.png";
  if (name.includes("โซดา") || name.includes("มะนาว")) return "/manus-storage/soda_lemon_e5ece73d.png";
  if (name.includes("เซ็ต") || name.includes("โปรโมชั่น")) return "/manus-storage/set_combo_3be21741.png";
  return "/manus-storage/coffee_cappuccino_3ae2e86c.png";
}

export default function ProductGrid({ items, channelSlug, onPress }: Props) {
  const activeItems = items.filter((i) => i.isActive);
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
        {activeItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onPress(item.id)}
            className="group flex flex-col bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md hover:border-primary/30 active:scale-95 transition-all duration-150 cursor-pointer text-left"
          >
            <div className="relative w-full aspect-square overflow-hidden bg-muted">
              <img
                src={getProductImage(item.name)}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => { (e.target as HTMLImageElement).src = "/manus-storage/coffee_cappuccino_3ae2e86c.png"; }}
              />
            </div>
            <div className="p-2.5 flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{item.name}</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: "var(--primary)" }}>
                {getDisplayPrice(item, channelSlug)}
              </p>
            </div>
          </button>
        ))}
        {activeItems.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground text-sm">ไม่มีสินค้าในหมวดนี้</div>
        )}
      </div>
    </div>
  );
}

