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

// Real product photos from Grab menu
const PRODUCT_IMAGES: Record<string, string> = {
  "อเมริกาโน่":              "https://huawei-food-cms.grab.com/item/THITE2025090602105059085/photos/menueditor_item_3a8c9a70d0424a2d99a4bdfabec9b79f_1759122240797518054.jpg",
  "อเมริกาโน่น้ำผึ้ง":      "https://huawei-food-cms.grab.com/item/THITE2025090602375324922/photos/menueditor_item_226c0ce915e84eccbe14f298ff2af86a_1757126128280065710.jpg",
  "เอสเย็น":                 "https://huawei-food-cms.grab.com/item/THITE2025090602345635506/photos/menueditor_item_dcc4ca03d7cb44f98e5245ab3b86205c_1759122307031653854.jpg",
  "ลาเต้":                   "https://huawei-food-cms.grab.com/item/THITE2025090602242643273/photos/menueditor_item_de03acaadf3341839e2344767e577245_1757125199097561329.jpg",
  "คาปูชิโน่":              "https://huawei-food-cms.grab.com/item/THITE2025090602312209934/photos/menueditor_item_1139a87e59624dbf8185e4712ede4c2d_1757125838831992801.jpg",
  "มอคค่า":                 "https://huawei-food-cms.grab.com/item/THITE2025090602300567674/photos/menueditor_item_08e19a9087cb4f86bc369106ef0c8deb_1757125765023597831.jpg",
  "วานิลลาคอฟฟี่":          "https://huawei-food-cms.grab.com/item/THITE2025121707374283875/photos/menueditor_item_a3700f78257540b3ad4fa182c91a4b5d_1765956880673182882.jpg",
  "TIER Coffee":             "https://huawei-food-cms.grab.com/item/THITE2025090412585298933/photos/menueditor_item_d1031fac8eb3487f95fcf867fefd8a5e_1759122285351648865.jpg",
  "กาแฟส้ม":                "https://huawei-food-cms.grab.com/item/THITE2025090804212138420/photos/menueditor_item_b285a8828b614db4b03990f7f0857598_1781518093725517294.jpg",
  "กาแฟมะพร้าว":            "https://huawei-food-cms.grab.com/item/THITE2025090602425228966/photos/menueditor_item_f62e397dc9794a3b84848d164270c489_1757126537396841349.jpg",
  "เพียวมัทฉะ":             "https://huawei-food-cms.grab.com/item/THITE2025090601472843865/photos/menueditor_item_e3c0b2fbd8de44f58abef1add958b41f_1757122588446963720.jpg",
  "มัทฉะลาเต้":             "https://huawei-food-cms.grab.com/item/THITE2025090601494237755/photos/menueditor_item_0790289c3ae44b8dbd2bd36c6fdda1a9_1759121840625360714.jpg",
  "มัทฉะมะพร้าวสด":         "https://huawei-food-cms.grab.com/item/THITE2025090602001438172/photos/menueditor_item_e9b7bad8d9714cc69b086857f2e6d13c_1759123157853375886.jpg",
  "มัทฉะส้ม":               "https://huawei-food-cms.grab.com/item/THITE2025090601514922983/photos/menueditor_item_5d7aa4dee09c4d9d830975bd5ffd8b01_1781518003365597316.jpg",
  "มัทฉะน้ำผึ้งมะนาว":      "https://huawei-food-cms.grab.com/item/THITE2025090601554188955/photos/menueditor_item_2fc0788e8dd347fc8c72d8ebcfd499bd_1757123666926029581.jpg",
  "มัทฉะมะพร้าวลาเต้":      "https://huawei-food-cms.grab.com/item/THITE2025090602001438172/photos/menueditor_item_e9b7bad8d9714cc69b086857f2e6d13c_1759123157853375886.jpg",
  "มัทฉะลาเต้นูเทลล่า":    "https://huawei-food-cms.grab.com/item/THITE2026061510100284879/photos/menueditor_item_cfce77f594154006be7730cbfb047758_1781518143733481483.jpg",
  "ชาเขียวลาเต้":           "https://huawei-food-cms.grab.com/item/THITE2025090602023747239/photos/menueditor_item_dfd871cd08d34088bbfb883150816b16_1759121814927865244.jpg",
  "ชาไทย":                  "https://huawei-food-cms.grab.com/item/THITE2025090602473938589/photos/menueditor_item_650e82cfd1a046728a2aa7e4736f15c2_1759121590949540329.jpg",
  "ชามะนาว":                "https://huawei-food-cms.grab.com/item/THITE2025090602464078834/photos/menueditor_item_a66e27b9eb66405ebf836751a3ced1c7_1757126762621806157.jpg",
  "ชาดำเย็น":               "https://huawei-food-cms.grab.com/item/THITE2025090603053037594/photos/menueditor_item_d5984a35d7704ec3936794f8bf73f9d4_1757297121934059172.jpeg",
  "ชาไทยโกโก้":             "https://huawei-food-cms.grab.com/item/THITE2025090602585553645/photos/menueditor_item_62f011e8e4e74506b4148b496afa040a_1757127491195423741.jpg",
  "นมสด":                   "https://huawei-food-cms.grab.com/item/THITE2025090602444254909/photos/menueditor_item_3c73de3b3b1a4687a5b6c2bdae8fde8d_1759121991636860444.jpg",
  "นมชมพู":                 "https://huawei-food-cms.grab.com/item/THITE2025090602452621413/photos/menueditor_item_135474597ea94c1c99abe632e22ab7aa_1759121902137189632.jpg",
  "นมคาราเมล":              "https://huawei-food-cms.grab.com/item/THITE2025090603042302529/photos/menueditor_item_c9bf0671732b4f09bb42d8dcb34a3b86_1757296930677905682.jpeg",
  "นมน้ำผึ้ง":              "https://huawei-food-cms.grab.com/item/THITE2025090603033266841/photos/menueditor_item_3b1f952a1bf1461b8757241c47d0e167_1757297044593481881.jpeg",
  "นมสตรอว์เบอร์รี่":       "https://huawei-food-cms.grab.com/item/THITE2025090603023029873/photos/menueditor_item_06c006950d41443db3a1e13a9768d826_1757297101565964435.jpeg",
  "นมชมพูโกโก้":            "https://huawei-food-cms.grab.com/item/THITE2025090602571172168/photos/menueditor_item_bc9a5f84a9144ce0b3ba7b1ad44179ad_1757127403676569049.jpg",
  "นมสดสตรอว์เบอร์รี่มัทฉะ": "https://huawei-food-cms.grab.com/item/THITE2025090602501613791/photos/menueditor_item_a3c60825094147dbaba270b52b6022b5_1781518301715142745.jpg",
  "โกโก้":                  "https://huawei-food-cms.grab.com/item/THITE2025090801260407573/photos/menueditor_item_e350f9bc6b374e42af3fe96defbd6ec8_1759121878340283477.jpg",
  "มินต์ช็อก":              "https://huawei-food-cms.grab.com/item/THITE2025090602575719705/photos/menueditor_item_919038ce77a54e77a735a96bfcdcdc61_1757127441474248472.jpg",
  "เอสเพรสโซ่โทนิค":       "https://huawei-food-cms.grab.com/item/THITE2025090602514302934/photos/menueditor_item_0d265df38bae4eaf9e3a11bfbe2e3451_1757127039317801766.jpg",
  "สตรอว์เบอร์รี่โซดา":     "https://huawei-food-cms.grab.com/item/THITE2025090602533676865/photos/menueditor_item_70a62839b02245509a7b76c98d71e207_1757127179657476143.jpg",
  "น้ำผึ้งมะนาวโซดา":       "https://huawei-food-cms.grab.com/item/THITE2025090603001995758/photos/menueditor_item_ab0592cf66f445b8a9e4709d6b034340_1757297144201074550.jpeg",
  "แดงโซดามะนาว":           "https://huawei-food-cms.grab.com/item/THITE2025092002491403084/photos/menueditor_item_e11b4f7d460c444cb61152ecc48c50f9_1779104179671901614.jpg",
  "ดับเบิ้ลโน่":            "https://huawei-food-cms.grab.com/item/THITE2025101314563066670/photos/menueditor_item_a9cadd3d5fa84bcd8047e078a301fed7_1760367262282978519.jpg",
  "ดับเบิ้ลชาเขียวอร่อยมาก": "https://huawei-food-cms.grab.com/item/THITE2025101316062651085/photos/menueditor_item_9ce1a0a6805c4a438d4ef9883a5fc7ea_1760371484823109173.jpg",
  "โน่เย็นๆ+ชาเขียวอร่อยมาก": "https://huawei-food-cms.grab.com/item/THITE2025101314425051559/photos/menueditor_item_5e115086bc0046b9ba8f6a2bbf1cad3e_1760366225733075128.jpg",
  "ดับเบิ้ลชาไทย":          "https://huawei-food-cms.grab.com/item/THITE2026010314035056436/photos/menueditor_item_161f090219664554bf8890460763927f_1767448937138446285.jpg",
};

// Fallback images by category keyword
const FALLBACK_IMG = "https://huawei-food-cms.grab.com/item/THITE2025090602242643273/photos/menueditor_item_de03acaadf3341839e2344767e577245_1757125199097561329.jpg";

function getProductImage(name: string): string {
  if (PRODUCT_IMAGES[name]) return PRODUCT_IMAGES[name]!;
  // Partial match
  for (const [key, url] of Object.entries(PRODUCT_IMAGES)) {
    if (name.includes(key) || key.includes(name)) return url;
  }
  // Keyword fallback
  if (name.includes("มัทฉะ")) return PRODUCT_IMAGES["มัทฉะลาเต้"]!;
  if (name.includes("ชา")) return PRODUCT_IMAGES["ชาไทย"]!;
  if (name.includes("นม")) return PRODUCT_IMAGES["นมสด"]!;
  if (name.includes("โซดา") || name.includes("มะนาว")) return PRODUCT_IMAGES["น้ำผึ้งมะนาวโซดา"]!;
  if (name.includes("โกโก้")) return PRODUCT_IMAGES["โกโก้"]!;
  return FALLBACK_IMG;
}

export default function ProductGrid({ items, channelSlug, onPress }: Props) {
  const activeItems = items.filter((i) => i.isActive);
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
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

