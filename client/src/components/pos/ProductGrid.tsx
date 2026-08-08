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
  if (min === max) return `฿${min}`;
  return `฿${min}–${max}`;
}

const COFFEE_EMOJIS: Record<string, string> = {
  "คาปูชิโน่": "☕", "อเมริกาโน่": "☕", "ลาเต้": "☕", "มอคค่า": "☕",
  "เอสเปรสโซ่ช็อต": "☕", "เอสเย็น": "🧊", "คาราเมลมัคคิอาโต้": "☕",
  "ชาไทย": "🍵", "ชาเขียว": "🍵", "ชาดำเย็น": "🍵", "ชาพีช": "🍑",
  "ชามะนาว": "🍋", "มัทฉะ": "🍵", "นม": "🥛", "โกโก้": "🍫",
  "อิตาเลี่ยนโซดา": "🥤", "เซ็ต": "🎁",
};

function getEmoji(name: string): string {
  for (const [key, emoji] of Object.entries(COFFEE_EMOJIS)) {
    if (name.includes(key)) return emoji;
  }
  return "🥤";
}

export default function ProductGrid({ items, channel, onPress }: Props) {
  const activeItems = items.filter((i) => i.isActive);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {activeItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onPress(item.id)}
            className="pos-card flex flex-col items-center gap-2 p-3 text-center hover:shadow-md hover:border-primary/40 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0"
              style={{ background: "oklch(0.93 0.015 75)" }}
            >
              {getEmoji(item.name)}
            </div>
            <div className="w-full">
              <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{item.name}</p>
              <p className="text-xs font-semibold mt-1" style={{ color: "oklch(0.55 0.1 55)" }}>
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

