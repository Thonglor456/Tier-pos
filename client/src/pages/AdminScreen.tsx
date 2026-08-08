import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Pencil, Coffee } from "lucide-react";
import ItemFormModal from "@/components/admin/ItemFormModal";
import CategoryFormModal from "@/components/admin/CategoryFormModal";

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState<"items" | "categories" | "users">("items");
  const [editItem, setEditItem] = useState<number | null | "new">(null);
  const [editCategory, setEditCategory] = useState<number | null | "new">(null);

  const { data: items = [], refetch: refetchItems } = trpc.admin.items.useQuery();
  const { data: categories = [], refetch: refetchCats } = trpc.admin.categories.useQuery();
  const { data: modifierGroups = [] } = trpc.admin.modifierGroups.useQuery();

  const toggleMutation = trpc.admin.toggleItem.useMutation({
    onSuccess: () => refetchItems(),
    onError: (e) => toast.error(e.message),
  });

  const groupedItems = categories.map((cat) => ({
    ...cat,
    items: items.filter((i) => i.categoryId === cat.id),
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>จัดการสินค้า</h1>
          <p className="text-sm text-muted-foreground">Tier Coffee — Admin</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4">
        {(["items", "categories"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            {tab === "items" ? "สินค้า" : "หมวดหมู่"}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === "items" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{items.length} รายการ</p>
              <Button onClick={() => setEditItem("new")} size="sm">
                <Plus className="w-4 h-4 mr-1" /> เพิ่มสินค้า
              </Button>
            </div>
            {groupedItems.map((cat) => cat.items.length > 0 && (
              <div key={cat.id}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Coffee className="w-4 h-4" /> {cat.name}
                </h3>
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  {cat.items.map((item, idx) => (
                    <div key={item.id} className={`flex items-center gap-4 px-4 py-3 ${idx < cat.items.length - 1 ? "border-b border-border" : ""}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.variants.length > 0
                            ? item.variants.map((v) => `${v.name} ฿${v.priceWalkin}`).join(" / ")
                            : "ไม่มี variant"}
                        </p>
                      </div>
                      <Badge variant={item.isActive ? "default" : "secondary"} className="shrink-0">
                        {item.isActive ? "เปิด" : "ปิด"}
                      </Badge>
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={(v) => toggleMutation.mutate({ itemId: item.id, isActive: v })}
                      />
                      <Button variant="ghost" size="icon" onClick={() => setEditItem(item.id)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "categories" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{categories.length} หมวดหมู่</p>
              <Button onClick={() => setEditCategory("new")} size="sm">
                <Plus className="w-4 h-4 mr-1" /> เพิ่มหมวดหมู่
              </Button>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {categories.map((cat, idx) => (
                <div key={cat.id} className={`flex items-center gap-4 px-4 py-3 ${idx < categories.length - 1 ? "border-b border-border" : ""}`}>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">ลำดับ {cat.sortOrder}</p>
                  </div>
                  <Badge variant={cat.isActive ? "default" : "secondary"}>{cat.isActive ? "เปิด" : "ปิด"}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => setEditCategory(cat.id)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {editItem !== null && (
        <ItemFormModal
          itemId={editItem === "new" ? undefined : editItem}
          items={items}
          categories={categories}
          modifierGroups={modifierGroups}
          onClose={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); refetchItems(); }}
        />
      )}
      {editCategory !== null && (
        <CategoryFormModal
          categoryId={editCategory === "new" ? undefined : editCategory}
          categories={categories}
          onClose={() => setEditCategory(null)}
          onSaved={() => { setEditCategory(null); refetchCats(); }}
        />
      )}
    </div>
  );
}

