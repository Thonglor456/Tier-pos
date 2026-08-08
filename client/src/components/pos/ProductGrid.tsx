import type { SalesChannel } from "@/types/pos";

type ItemWithVariants = {
  id: number;
  name: string;
  isActive: boolean;
  variants: Array<{ id: number; name: string; priceWalkin: string | number; priceGrab: string | number }>;
  modifierGroupIds: number[];
};

interface Props {
  items: ItemWithVariants[];
  channel: SalesChannel;
  onPress: (itemId: number) => void;
}

function getDisplayPrice(item: ItemWithVariants, channel: SalesChannel): string {
  if (item.variants.length === 0) return "-";
  const prices = item.variants.map((v) =>
    channel === "walkin" ? parseFloat(String(v.priceWalkin)) : parseFloat(String(v.priceGrab))
  );
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `${min}.-`;
  return `${min}–${max}.-`;
}

// Map item names to product images
const PRODUCT_IMAGES: Record<string, string> = {
  "คาปูชิโน่": "/manus-storage/coffee_cappuccino_3ae2e86c.png",
  "อเมริกาโน่": "/manus-storage/coffee_americano_22eaaef9.png",
  "ลาเต้": "/manus-storage/coffee_latte_916025fb.png",
  "มอคค่า": "/manus-storage/coffee_mocha_8b5790fe.png",
  "ชาไทย": "/manus-storage/tea_thai_58a7f206.png",
  "ชาเขียว": "/manus-storage/tea_green_770d44e2.png",
  "คาราเมลมัคคิอาโต้": "/manus-storage/coffee_caramel_133106fb.png",
  "เอสเปรสโซ่ช็อต": "/manus-storage/coffee_espresso_340af496.png",
  "เอสเย็น": "/manus-storage/coffee_espresso_340af496.png",
  "มัทฉะน้ำมะพร้าวสด": "/manus-storage/matcha_latte_e8106a6a.png",
  "มัทฉะลาเต้": "/manus-storage/matcha_latte_e8106a6a.png",
  "มัทฉะลาเต้สตรอว์เบอร์รี่": "/manus-storage/matcha_latte_e8106a6a.png",
  "มัทฉะส้ม": "/manus-storage/matcha_latte_e8106a6a.png",
  "เพียวมัทฉะ": "/manus-storage/matcha_latte_e8106a6a.png",
  "มัทฉะน้ำมะนาว": "/manus-storage/matcha_latte_e8106a6a.png",
  "นม": "/manus-storage/milk_plain_62845f54.png",
  "นมคาราเมล": "/manus-storage/milk_plain_62845f54.png",
  "นมชมพู": "/manus-storage/milk_plain_62845f54.png",
  "นมน้ำผึ้ง": "/manus-storage/milk_plain_62845f54.png",
  "นมวานิลลา": "/manus-storage/milk_plain_62845f54.png",
  "นมสตรอว์เบอร์รี่": "/manus-storage/milk_plain_62845f54.png",
  "โกโก้": "/manus-storage/milk_plain_62845f54.png",
  "น้ำผึ้งมะนาวโซดา": "/manus-storage/soda_lemon_e5ece73d.png",
  "สตรอว์เบอร์รีโซดา": "/manus-storage/soda_strawberry_58fccec3.png",
  "แดงโซดามะนาว": "/manus-storage/soda_lemon_e5ece73d.png",
  "เทียร์คอฟฟี่": "/manus-storage/coffee_tier_c1235dee.png",
  "ดับเบิ้ลชาเขียวอร่อยมาก": "/manus-storage/tea_green_770d44e2.png",
  "ดับเบิ้ลโน่": "/manus-storage/coffee_cold_brew_0c4e0e6f.png",
  "วานิลลาคอฟฟี่": "/manus-storage/coffee_latte_916025fb.png",
  "กาแฟช่อดอกมะพร้าว": "/manus-storage/coffee_cappuccino_3ae2e86c.png",
  "ชาดำเย็น": "/manus-storage/tea_thai_58a7f206.png",
  "ชาพีช": "/manus-storage/tea_thai_58a7f206.png",
  "ชามะนาว": "/manus-storage/soda_lemon_e5ece73d.png",
  "ชาเขียวน้ำผึ้งมะนาว": "/manus-storage/tea_green_770d44e2.png",
};

function getProductImage(name: string): string {
  // Exact match first
  if (PRODUCT_IMAGES[name]) return PRODUCT_IMAGES[name];
  // Partial match
  for (const [key, url] of Object.entries(PRODUCT_IMAGES)) {
    if (name.includes(key) || key.includes(name)) return url;
  }
  // Category fallbacks
  if (name.includes("ชา")) return "/manus-storage/tea_thai_58a7f206.png";
  if (name.includes("มัทฉะ")) return "/manus-storage/matcha_latte_e8106a6a.png";
  if (name.includes("นม")) return "/manus-storage/milk_plain_62845f54.png";
  if (name.includes("โซดา") || name.includes("มะนาว")) return "/manus-storage/soda_lemon_e5ece73d.png";
  if (name.includes("เซ็ต") || name.includes("โปรโมชั่น")) return "/manus-storage/set_combo_3be21741.png";
  return "/manus-storage/coffee_cappuccino_3ae2e86c.png";
}

export default function ProductGrid({ items, channel, onPress }: Props) {
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
            {/* Product Image */}
            <div className="relative w-full aspect-square overflow-hidden bg-muted">
              <img
                src={getProductImage(item.name)}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/manus-storage/coffee_cappuccino_904c2a3c.png";
                }}
              />
            </div>
            {/* Product Info */}
            <div className="p-2.5 flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{item.name}</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: "oklch(0.38 0.08 50)" }}>
                {getDisplayPrice(item, channel)}
              </p>
            </div>
          </button>
        ))}
        {activeItems.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground text-sm">
            ไม่มีสินค้าในหมวดนี้
          </div>
        )}
      </div>
    </div>
  );
}
