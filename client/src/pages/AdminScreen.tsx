import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useStaff } from "@/contexts/StaffContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Pencil, Trash2, ShieldCheck, User, Settings, Coffee, Tag, Layers } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ItemFormModal from "@/components/admin/ItemFormModal";
import CategoryFormModal from "@/components/admin/CategoryFormModal";
import StaffFormModal from "@/components/admin/StaffFormModal";
import BranchFormModal from "@/components/admin/BranchFormModal";
import { MapPin } from "lucide-react";

type AdminTab = "items" | "categories" | "staff" | "branches";

export default function AdminScreen() {
  const { currentStaff } = useStaff();
  const isAdmin = currentStaff?.role === "admin";
  const isManager = currentStaff?.role === "manager" || isAdmin;

  const [tab, setTab] = useState<AdminTab>("items");
  const [editItemId, setEditItemId] = useState<number | null | "new">(null);
  const [editCategoryId, setEditCategoryId] = useState<number | null | "new">(null);
  const [editStaffId, setEditStaffId] = useState<number | null | "new">(null);
  const [deleteStaffId, setDeleteStaffId] = useState<number | null>(null);
  const [editBranchId, setEditBranchId] = useState<number | null | "new">(null);
  const [deleteBranchId, setDeleteBranchId] = useState<number | null>(null);

  const { data: items = [], refetch: refetchItems } = trpc.admin.items.useQuery();
  const { data: categories = [], refetch: refetchCategories } = trpc.admin.categories.useQuery();
  const { data: modifierGroups = [] } = trpc.admin.modifierGroups.useQuery();
  const { data: staffList = [], refetch: refetchStaff } = trpc.posUsers.list.useQuery();
  const { data: branchesList = [], refetch: refetchBranches } = trpc.branches.list.useQuery();

  const deleteStaffTarget = staffList.find((s) => s.id === deleteStaffId);

  // Guard: only manager or admin can access admin
  if (currentStaff?.role !== "manager" && currentStaff?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-primary text-lg font-medium">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
          <p className="text-muted-foreground text-sm mt-1">เฉพาะผู้จัดการเท่านั้น</p>
          <Link href="/"><Button className="mt-4">กลับหน้าขาย</Button></Link>
        </div>
      </div>
    );
  }

  const toggleItem = trpc.admin.toggleItem.useMutation({
    onSuccess: () => refetchItems(),
    onError: (e) => toast.error(e.message),
  });
  const deleteStaff = trpc.posUsers.delete.useMutation({
    onSuccess: () => { toast.success("ลบพนักงานแล้ว"); refetchStaff(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteBranch = trpc.branches.delete.useMutation({
    onSuccess: () => { toast.success("ลบสาขาแล้ว"); refetchBranches(); setDeleteBranchId(null); },
    onError: (e) => toast.error(e.message),
  });
  const toggleBranch = trpc.branches.upsert.useMutation({
    onSuccess: () => refetchBranches(),
    onError: (e) => toast.error(e.message),
  });
  const deleteBranchTarget = branchesList.find((b) => b.id === deleteBranchId);

  const itemsByCategory = categories.map((cat) => ({
    ...cat,
    items: items.filter((i) => i.categoryId === cat.id),
  }));

  const TABS: Array<{ id: AdminTab; label: string; icon: React.ReactNode; adminOnly?: boolean }> = [
    { id: "items", label: "สินค้า", icon: <Coffee className="w-4 h-4" /> },
    { id: "categories", label: "หมวดหมู่", icon: <Tag className="w-4 h-4" /> },
    { id: "staff", label: "พนักงาน", icon: <User className="w-4 h-4" /> },
    { id: "branches", label: "สาขา", icon: <MapPin className="w-4 h-4" />, adminOnly: true },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 bg-card border-b border-border shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <Link href="/">
            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm hidden xs:inline">กลับหน้าขาย</span>
            </button>
          </Link>
          <div className="h-5 w-px bg-border" />
          <h1 className="text-base font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>จัดการร้าน</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isManager && (
            <Link href="/settings">
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">ตั้งค่า</span>
              </button>
            </Link>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isManager ? <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> : <User className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{currentStaff?.name}</span>
          </div>
        </div>
      </header>

      {/* Mobile: horizontal tab bar */}
      <div className="sm:hidden flex border-b border-border bg-card shrink-0 overflow-x-auto">
        {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop: sidebar */}
        <nav className="hidden sm:flex w-48 bg-card border-r border-border flex-col pt-4 gap-1 px-2 shrink-0">
          {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === t.id ? "text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              style={tab === t.id ? { background: "var(--primary)" } : {}}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-3 sm:p-5">
          {tab === "items" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>รายการสินค้า</h2>
                {isManager && (
                  <Button size="sm" onClick={() => setEditItemId("new")} style={{ background: "var(--primary)", color: "white" }}>
                    <Plus className="w-4 h-4 mr-1" /> เพิ่มสินค้า
                  </Button>
                )}
              </div>
              {itemsByCategory.map((cat) => (
                <div key={cat.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-bold text-foreground">{cat.name}</h3>
                    <span className="text-xs text-muted-foreground">({cat.items.length} รายการ)</span>
                  </div>
                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    {cat.items.map((item, idx) => (
                      <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${idx < cat.items.length - 1 ? "border-b border-border/50" : ""}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.variants.map((v) => `${v.name}: ฿${v.priceWalkin}`).join(" · ")}
                          </p>
                        </div>
                        <Badge variant={item.isActive ? "default" : "secondary"} className="text-xs">
                          {item.isActive ? "เปิดขาย" : "ปิด"}
                        </Badge>
                        <Switch checked={item.isActive} onCheckedChange={(v) => toggleItem.mutate({ itemId: item.id, isActive: v })} />
                        {isManager && (
                          <button onClick={() => setEditItemId(item.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {cat.items.length === 0 && (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">ยังไม่มีสินค้าในหมวดนี้</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "categories" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>หมวดหมู่</h2>
                {isManager && (
                  <Button size="sm" onClick={() => setEditCategoryId("new")} style={{ background: "var(--primary)", color: "white" }}>
                    <Plus className="w-4 h-4 mr-1" /> เพิ่มหมวด
                  </Button>
                )}
              </div>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                {categories.map((cat, idx) => (
                  <div key={cat.id} className={`flex items-center gap-3 px-4 py-3 ${idx < categories.length - 1 ? "border-b border-border/50" : ""}`}>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">ลำดับ: {cat.sortOrder}</p>
                    </div>
                    <Badge variant={cat.isActive ? "default" : "secondary"} className="text-xs">
                      {cat.isActive ? "แสดง" : "ซ่อน"}
                    </Badge>
                    {isManager && (
                      <button onClick={() => setEditCategoryId(cat.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "staff" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>จัดการพนักงาน</h2>
                <Button size="sm" onClick={() => setEditStaffId("new")} style={{ background: "var(--primary)", color: "white" }}>
                  <Plus className="w-4 h-4 mr-1" /> เพิ่มพนักงาน
                </Button>
              </div>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                {staffList.map((staff, idx) => (
                  <div key={staff.id} className={`flex items-center gap-3 px-4 py-3 ${idx < staffList.length - 1 ? "border-b border-border/50" : ""}`}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ background: staff.role === "admin" ? "oklch(0.52 0.18 260)" : staff.role === "manager" ? "var(--primary)" : "var(--muted-foreground)" }}>
                      {staff.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{staff.name}</p>
                      <p className="text-xs text-muted-foreground">PIN: {"•".repeat(staff.pinCode?.length ?? 4)}</p>
                    </div>
                    <Badge variant={staff.role === "admin" ? "default" : staff.role === "manager" ? "default" : "secondary"} className="text-xs">
                      {staff.role === "admin" ? "แอดมิน" : staff.role === "manager" ? "ผู้จัดการ" : "พนักงาน"}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditStaffId(staff.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteStaffId(staff.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {staffList.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">ยังไม่มีพนักงาน</div>
                )}
              </div>
            </div>
          )}
          {tab === "branches" && isAdmin && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>จัดการสาขา</h2>
                <Button size="sm" onClick={() => setEditBranchId("new")} style={{ background: "var(--primary)", color: "white" }}>
                  <Plus className="w-4 h-4 mr-1" /> เพิ่มสาขา
                </Button>
              </div>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                {branchesList.map((branch, idx) => (
                  <div key={branch.id} className={`flex items-center gap-3 px-4 py-3 ${idx < branchesList.length - 1 ? "border-b border-border/50" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{branch.name}</p>
                      {branch.address && <p className="text-xs text-muted-foreground truncate">{branch.address}</p>}
                    </div>
                    <Badge variant={branch.isActive ? "default" : "secondary"} className="text-xs">
                      {branch.isActive ? "เปิด" : "ปิด"}
                    </Badge>
                    <Switch checked={branch.isActive} onCheckedChange={(v) => toggleBranch.mutate({ id: branch.id, name: branch.name, address: branch.address ?? undefined, phone: branch.phone ?? undefined, isActive: v })} />
                    <button onClick={() => setEditBranchId(branch.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteBranchId(branch.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {branchesList.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">ยังไม่มีสาขา</div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {editItemId !== null && (
        <ItemFormModal
          itemId={editItemId === "new" ? undefined : editItemId}
          items={items}
          categories={categories}
          modifierGroups={modifierGroups}
          onClose={() => setEditItemId(null)}
          onSaved={() => { setEditItemId(null); refetchItems(); }}
        />
      )}
      {editCategoryId !== null && (
        <CategoryFormModal
          categoryId={editCategoryId === "new" ? undefined : editCategoryId}
          categories={categories}
          onClose={() => setEditCategoryId(null)}
          onSaved={() => { setEditCategoryId(null); refetchCategories(); }}
        />
      )}
  {editStaffId !== null && (
        <StaffFormModal
          staffId={editStaffId === "new" ? undefined : editStaffId}
          onClose={() => setEditStaffId(null)}
          onSaved={() => { setEditStaffId(null); refetchStaff(); }}
        />
      )}
      {editBranchId !== null && (
        <BranchFormModal
          branchId={editBranchId === "new" ? undefined : editBranchId}
          onClose={() => setEditBranchId(null)}
          onSaved={() => { setEditBranchId(null); refetchBranches(); }}
        />
      )}
      <AlertDialog open={deleteBranchId !== null} onOpenChange={(open) => { if (!open) setDeleteBranchId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบสาขา</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบสาขา <strong>{deleteBranchTarget?.name}</strong>?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteBranchId !== null) deleteBranch.mutate({ id: deleteBranchId }); }}
            >
              ลบสาขา
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={deleteStaffId !== null} onOpenChange={(open) => { if (!open) setDeleteStaffId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบพนักงาน</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบ <strong>{deleteStaffTarget?.name}</strong> ออกจากระบบ?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteStaffId !== null) {
                  deleteStaff.mutate({ id: deleteStaffId });
                  setDeleteStaffId(null);
                }
              }}
            >
              ลบพนักงาน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
