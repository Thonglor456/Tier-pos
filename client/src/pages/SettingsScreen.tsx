import { useState, useContext } from "react";
import { trpc } from "@/lib/trpc";
import { useStaff } from "@/contexts/StaffContext";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Store, Percent, Clock, Layers, ShoppingBag,
  Plus, Trash2, Edit2, Check, X, ChevronLeft, Upload
} from "lucide-react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { BranchContext } from "@/contexts/BranchContext";

type Tab = "shop" | "vat" | "hours" | "channels" | "modifiers" | "branches";

export default function SettingsScreen() {
  const [, navigate] = useLocation();
  const { currentStaff } = useStaff();
  const [activeTab, setActiveTab] = useState<Tab>("shop");

  // Guard: only manager can access settings
  if (currentStaff?.role !== "manager") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-primary text-lg font-medium">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
          <p className="text-muted-foreground text-sm mt-1">เฉพาะผู้จัดการเท่านั้น</p>
          <Button onClick={() => navigate("/")} className="mt-4 bg-primary text-white">กลับหน้าขาย</Button>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "shop", label: "ข้อมูลร้าน", icon: <Store className="w-4 h-4" /> },
    { id: "vat", label: "ภาษี (VAT)", icon: <Percent className="w-4 h-4" /> },
    { id: "hours", label: "เวลาร้าน", icon: <Clock className="w-4 h-4" /> },
    { id: "channels", label: "ช่องทางขาย", icon: <ShoppingBag className="w-4 h-4" /> },
  { id: "modifiers", label: "ตัวเลือกเพิ่มเติม", icon: <Layers className="w-4 h-4" /> },
    { id: "branches", label: "สาขา", icon: <MapPin className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="text-primary hover:text-foreground transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-foreground">ตั้งค่า</h1>
      </header>

      {/* Mobile: horizontal scrollable tab bar */}
      <div className="sm:hidden flex border-b border-border bg-card shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors shrink-0",
              activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            )}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop: Sidebar */}
        <aside className="hidden sm:flex w-56 bg-card border-r border-border p-4 flex-col gap-1 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "text-primary hover:bg-muted"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {activeTab === "shop" && <ShopInfoSection />}
          {activeTab === "vat" && <VatSection />}
          {activeTab === "hours" && <HoursSection />}
          {activeTab === "channels" && <ChannelsSection />}
          {activeTab === "modifiers" && <ModifiersSection />}
          {activeTab === "branches" && <BranchesSection />}
        </main>
      </div>
    </div>
  );
}

// ─── Branches ────────────────────────────────────────────────────────────────
function BranchesSection() {
  const branchCtx = useContext(BranchContext);
  const { data: branchesList = [], refetch } = trpc.branches.list.useQuery();
  const upsertMutation = trpc.branches.upsert.useMutation({
    onSuccess: () => { toast.success("บันทึกสาขาแล้ว"); refetch(); setEditBranch(null); setShowForm(false); },
  });
  const deleteMutation = trpc.branches.delete.useMutation({
    onSuccess: () => { toast.success("ลบสาขาแล้ว"); refetch(); },
  });
  const [showForm, setShowForm] = useState(false);
  const [editBranch, setEditBranch] = useState<{ id?: number; name: string; address: string; phone: string; isActive: boolean } | null>(null);

  const openAdd = () => { setEditBranch({ name: "", address: "", phone: "", isActive: true }); setShowForm(true); };
  const openEdit = (b: { id: number; name: string; address: string | null; phone: string | null; isActive: boolean }) => {
    setEditBranch({ id: b.id, name: b.name, address: b.address ?? "", phone: b.phone ?? "", isActive: b.isActive });
    setShowForm(true);
  };
  const handleSave = () => {
    if (!editBranch || !editBranch.name.trim()) return;
    upsertMutation.mutate({ id: editBranch.id, name: editBranch.name, address: editBranch.address, phone: editBranch.phone, isActive: editBranch.isActive });
  };
  const handleSelectBranch = (b: { id: number; name: string }) => {
    branchCtx?.setCurrentBranch({ id: b.id, name: b.name });
    toast.success(`เลือกสาขา "${b.name}" แล้ว`);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">จัดการสาขา</h2>
          <p className="text-sm text-muted-foreground mt-1">สาขาที่ใช้งานอยู่: <strong>{branchCtx?.currentBranch?.name ?? "ยังไม่ได้เลือก"}</strong></p>
        </div>
        <Button onClick={openAdd} className="bg-primary hover:bg-primary/90 text-white gap-2">
          <Plus className="w-4 h-4" /> เพิ่มสาขา
        </Button>
      </div>
      <div className="space-y-3">
        {branchesList.map((branch) => {
          const isSelected = branchCtx?.currentBranch?.id === branch.id;
          return (
            <div key={branch.id} className={cn("bg-card rounded-2xl border p-4 flex items-center gap-4 transition-all", isSelected ? "border-primary ring-2 ring-primary/20" : "border-border")}>
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{branch.name}</p>
                  {isSelected && <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">ใช้งานอยู่</span>}
                  {!branch.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">ปิดใช้งาน</span>}
                </div>
                {branch.address && <p className="text-sm text-muted-foreground truncate">{branch.address}</p>}
                {branch.phone && <p className="text-sm text-muted-foreground">{branch.phone}</p>}
              </div>
              <div className="flex items-center gap-2">
                {!isSelected && (
                  <Button onClick={() => handleSelectBranch(branch)} size="sm" variant="outline" className="text-primary border-primary hover:bg-muted text-xs">
                    เลือกสาขานี้
                  </Button>
                )}
                <button onClick={() => openEdit(branch)} className="p-2 rounded-lg hover:bg-muted text-primary transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => { if (confirm(`ลบสาขา "${branch.name}" ใช่ไหม?`)) deleteMutation.mutate({ id: branch.id }); }} className="p-2 rounded-lg hover:bg-red-50 text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          );
        })}
        {branchesList.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>ยังไม่มีสาขา กดปุ่ม "เพิ่มสาขา" เพื่อเริ่มต้น</p>
          </div>
        )}
      </div>
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditBranch(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editBranch?.id ? "แก้ไขสาขา" : "เพิ่มสาขาใหม่"}</DialogTitle></DialogHeader>
          {editBranch && (
            <div className="space-y-4 pt-2">
              <div><Label>ชื่อสาขา *</Label><Input value={editBranch.name} onChange={(e) => setEditBranch({ ...editBranch, name: e.target.value })} placeholder="เช่น สาขาหลัก, สาขาสยาม" className="mt-1" /></div>
              <div><Label>ที่อยู่</Label><Input value={editBranch.address} onChange={(e) => setEditBranch({ ...editBranch, address: e.target.value })} placeholder="ที่อยู่สาขา" className="mt-1" /></div>
              <div><Label>เบอร์โทร</Label><Input value={editBranch.phone} onChange={(e) => setEditBranch({ ...editBranch, phone: e.target.value })} placeholder="เบอร์โทรสาขา" className="mt-1" /></div>
              <div className="flex items-center gap-3"><Switch checked={editBranch.isActive} onCheckedChange={(v) => setEditBranch({ ...editBranch, isActive: v })} /><Label>เปิดใช้งาน</Label></div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => { setShowForm(false); setEditBranch(null); }} className="flex-1">ยกเลิก</Button>
                <Button onClick={handleSave} disabled={!editBranch.name.trim() || upsertMutation.isPending} className="flex-1 bg-primary hover:bg-primary/90 text-white">บันทึก</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Shop Info ────────────────────────────────────────────────────────────────
function ShopInfoSection() {
  const { data: settings, refetch } = trpc.settings.get.useQuery();
  const updateMutation = trpc.settings.update.useMutation({ onSuccess: () => { toast.success("บันทึกข้อมูลร้านแล้ว"); refetch(); } });
  const [form, setForm] = useState({ shopName: "", address: "", phone: "", taxId: "" });
  const [initialized, setInitialized] = useState(false);

  if (settings && !initialized) {
    setForm({ shopName: settings.shopName ?? "", address: settings.address ?? "", phone: settings.phone ?? "", taxId: settings.taxId ?? "" });
    setInitialized(true);
  }

  const handleSave = () => updateMutation.mutate(form);

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-bold text-foreground mb-6">ข้อมูลร้าน</h2>
      <div className="space-y-4">
        <div>
          <Label className="text-primary font-medium">ชื่อร้าน</Label>
          <Input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} className="mt-1 border-border focus-visible:ring-ring" />
        </div>
        <div>
          <Label className="text-primary font-medium">ที่อยู่</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1 border-border focus-visible:ring-ring" placeholder="ที่อยู่ร้าน" />
        </div>
        <div>
          <Label className="text-primary font-medium">เบอร์โทร</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 border-border focus-visible:ring-ring" placeholder="0xx-xxx-xxxx" />
        </div>
        <div>
          <Label className="text-primary font-medium">เลขผู้เสียภาษี (ถ้ามี)</Label>
          <Input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} className="mt-1 border-border focus-visible:ring-ring" placeholder="เลข 13 หลัก" />
        </div>
        <div>
          <Label className="text-primary font-medium">QR PromptPay (สำหรับรับโอนเงิน)</Label>
          <p className="text-muted-foreground text-xs mt-1 mb-2">อัปโหลดรูป QR Code PromptPay ของร้าน เพื่อแสดงในหน้าชำระเงิน</p>
          <QrUploadField currentUrl={settings?.promptpayQrUrl ?? null} onSave={(url) => updateMutation.mutate({ promptpayQrUrl: url })} />
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-white w-full">
          {updateMutation.isPending ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </div>
    </div>
  );
}

function QrUploadField({ currentUrl, onSave }: { currentUrl: string | null; onSave: (url: string | null) => void }) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreview(dataUrl);
      onSave(dataUrl);
    };
    reader.readAsDataURL(file);
  };
  return (
    <div className="flex items-center gap-4">
      {preview ? (
        <div className="relative">
          <img src={preview} alt="QR" className="w-24 h-24 object-contain border border-border rounded-lg" />
          <button onClick={() => { setPreview(null); onSave(null); }} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      ) : (
        <label className="w-24 h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
          <Upload className="w-6 h-6 text-muted-foreground" />
          <span className="text-xs text-muted-foreground mt-1">อัปโหลด</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      )}
    </div>
  );
}

// ─── VAT ─────────────────────────────────────────────────────────────────────
function VatSection() {
  const { data: settings, refetch } = trpc.settings.get.useQuery();
  const updateMutation = trpc.settings.update.useMutation({ onSuccess: () => { toast.success("บันทึกการตั้งค่า VAT แล้ว"); refetch(); } });
  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatRate, setVatRate] = useState("7");
  const [initialized, setInitialized] = useState(false);

  if (settings && !initialized) {
    setVatEnabled(settings.vatEnabled);
    setVatRate(String(settings.vatRate ?? "7"));
    setInitialized(true);
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-bold text-foreground mb-6">ภาษีมูลค่าเพิ่ม (VAT)</h2>
      <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">เปิดใช้งาน VAT</p>
            <p className="text-sm text-muted-foreground">แสดง VAT แยกในใบเสร็จและสรุปยอด</p>
          </div>
          <Switch checked={vatEnabled} onCheckedChange={setVatEnabled} className="data-[state=checked]:bg-primary" />
        </div>
        {vatEnabled && (
          <div>
            <Label className="text-primary font-medium">อัตรา VAT (%)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input type="number" value={vatRate} onChange={(e) => setVatRate(e.target.value)} className="w-24 border-border focus-visible:ring-ring" min="0" max="100" step="0.5" />
              <span className="text-primary">%</span>
            </div>
          </div>
        )}
        <Button onClick={() => updateMutation.mutate({ vatEnabled, vatRate: parseFloat(vatRate) || 7 })} disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-white w-full">
          {updateMutation.isPending ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </div>
    </div>
  );
}

// ─── Hours ────────────────────────────────────────────────────────────────────
function HoursSection() {
  const { data: settings, refetch } = trpc.settings.get.useQuery();
  const updateMutation = trpc.settings.update.useMutation({ onSuccess: () => { toast.success("บันทึกเวลาร้านแล้ว"); refetch(); } });
  const [openTime, setOpenTime] = useState("07:00");
  const [closeTime, setCloseTime] = useState("20:00");
  const [initialized, setInitialized] = useState(false);

  if (settings && !initialized) {
    setOpenTime(settings.openTime ?? "07:00");
    setCloseTime(settings.closeTime ?? "20:00");
    setInitialized(true);
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-bold text-foreground mb-6">เวลาเปิด-ปิดร้าน</h2>
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <p className="text-sm text-muted-foreground">ใช้เป็นข้อมูลอ้างอิงในรายงาน ไม่บล็อกการขายนอกเวลา</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-primary font-medium">เวลาเปิด</Label>
            <Input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="mt-1 border-border focus-visible:ring-ring" />
          </div>
          <div>
            <Label className="text-primary font-medium">เวลาปิด</Label>
            <Input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="mt-1 border-border focus-visible:ring-ring" />
          </div>
        </div>
        <Button onClick={() => updateMutation.mutate({ openTime, closeTime })} disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-white w-full">
          {updateMutation.isPending ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </div>
    </div>
  );
}

// ─── Channels ─────────────────────────────────────────────────────────────────
function ChannelsSection() {
  const { data: channels = [], refetch } = trpc.channels.listAll.useQuery();
  const upsertMutation = trpc.channels.upsert.useMutation({ onSuccess: () => { toast.success("บันทึกช่องทางขายแล้ว"); refetch(); } });
  const deleteMutation = trpc.channels.delete.useMutation({ onSuccess: () => { toast.success("ลบช่องทางขายแล้ว"); refetch(); } });
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");

  const handleSaveEdit = (ch: typeof channels[0]) => {
    upsertMutation.mutate({ id: ch.id, name: editName, slug: editSlug, isActive: ch.isActive, sortOrder: ch.sortOrder });
    setEditId(null);
  };

  const handleAdd = () => {
    if (!newName || !newSlug) return;
    upsertMutation.mutate({ name: newName, slug: newSlug, isActive: true, sortOrder: channels.length + 1 });
    setNewName(""); setNewSlug(""); setShowAdd(false);
  };

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-foreground">ช่องทางการขาย</h2>
        <Button onClick={() => setShowAdd(true)} size="sm" className="bg-primary hover:bg-primary/90 text-white gap-1">
          <Plus className="w-4 h-4" /> เพิ่ม
        </Button>
      </div>
      <div className="space-y-3">
        {channels.map((ch) => (
          <div key={ch.id} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
            {editId === ch.id ? (
              <>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="ชื่อ" className="border-border" />
                  <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} placeholder="slug (ภาษาอังกฤษ)" className="border-border" />
                </div>
                <button onClick={() => handleSaveEdit(ch)} className="text-green-600 hover:text-green-700"><Check className="w-5 h-5" /></button>
                <button onClick={() => setEditId(null)} className="text-muted-foreground hover:text-primary"><X className="w-5 h-5" /></button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{ch.name}</p>
                  <p className="text-xs text-muted-foreground">slug: {ch.slug}</p>
                </div>
                <Switch checked={ch.isActive} onCheckedChange={(v) => upsertMutation.mutate({ ...ch, isActive: v })} className="data-[state=checked]:bg-primary" />
                <button onClick={() => { setEditId(ch.id); setEditName(ch.name); setEditSlug(ch.slug); }} className="text-muted-foreground hover:text-primary"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => deleteMutation.mutate({ id: ch.id })} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </>
            )}
          </div>
        ))}
      </div>
      {showAdd && (
        <div className="mt-4 bg-card rounded-2xl border border-primary/50 p-4 space-y-3">
          <p className="font-medium text-foreground">เพิ่มช่องทางใหม่</p>
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ชื่อช่องทาง เช่น Foodpanda" className="border-border" />
          <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="slug เช่น foodpanda (ภาษาอังกฤษ ไม่มีช่องว่าง)" className="border-border" />
          <div className="flex gap-2">
            <Button onClick={handleAdd} className="bg-primary text-white flex-1">เพิ่ม</Button>
            <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1">ยกเลิก</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modifiers ────────────────────────────────────────────────────────────────
function ModifiersSection() {
  const { data: groups = [], refetch } = trpc.admin.modifierGroups.useQuery();
  const upsertGroupMutation = trpc.admin.upsertModifierGroup.useMutation({ onSuccess: () => { toast.success("บันทึกแล้ว"); refetch(); } });
  const deleteGroupMutation = trpc.admin.deleteModifierGroup.useMutation({ onSuccess: () => { toast.success("ลบกลุ่มแล้ว"); refetch(); } });
  const upsertOptionMutation = trpc.admin.upsertModifierOption.useMutation({ onSuccess: () => { toast.success("บันทึกตัวเลือกแล้ว"); refetch(); } });
  const deleteOptionMutation = trpc.admin.deleteModifierOption.useMutation({ onSuccess: () => { toast.success("ลบตัวเลือกแล้ว"); refetch(); } });

  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const [editGroupId, setEditGroupId] = useState<number | null>(null);
  const [groupForm, setGroupForm] = useState({ name: "", isRequired: false, minSelect: 0, maxSelect: 1, sortOrder: 0 });
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newOptionGroupId, setNewOptionGroupId] = useState<number | null>(null);
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionPrice, setNewOptionPrice] = useState("0");

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-foreground">ตัวเลือกเพิ่มเติม (Modifier Groups)</h2>
        <Button onClick={() => { setShowAddGroup(true); setGroupForm({ name: "", isRequired: false, minSelect: 0, maxSelect: 1, sortOrder: groups.length }); }} size="sm" className="bg-primary text-white gap-1">
          <Plus className="w-4 h-4" /> เพิ่มกลุ่ม
        </Button>
      </div>

      {showAddGroup && (
        <div className="mb-4 bg-card rounded-2xl border border-primary/50 p-4 space-y-3">
          <p className="font-semibold text-foreground">กลุ่มใหม่</p>
          <Input value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="ชื่อกลุ่ม เช่น ระดับความหวาน" className="border-border" />
          <div className="flex items-center gap-3">
            <Switch checked={groupForm.isRequired} onCheckedChange={(v) => setGroupForm({ ...groupForm, isRequired: v })} className="data-[state=checked]:bg-primary" />
            <span className="text-sm text-primary">บังคับเลือก</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { upsertGroupMutation.mutate(groupForm); setShowAddGroup(false); }} className="bg-primary text-white flex-1">เพิ่ม</Button>
            <Button variant="outline" onClick={() => setShowAddGroup(false)} className="flex-1">ยกเลิก</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.id} className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              {editGroupId === group.id ? (
                <>
                  <Input value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} className="flex-1 border-border" />
                  <Switch checked={groupForm.isRequired} onCheckedChange={(v) => setGroupForm({ ...groupForm, isRequired: v })} className="data-[state=checked]:bg-primary" />
                  <span className="text-xs text-muted-foreground">บังคับ</span>
                  <button onClick={() => { upsertGroupMutation.mutate({ ...groupForm, id: group.id }); setEditGroupId(null); }} className="text-green-600"><Check className="w-5 h-5" /></button>
                  <button onClick={() => setEditGroupId(null)} className="text-muted-foreground"><X className="w-5 h-5" /></button>
                </>
              ) : (
                <>
                  <button onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)} className="flex-1 text-left">
                    <p className="font-medium text-foreground">{group.name}</p>
                    <p className="text-xs text-muted-foreground">{group.isRequired ? "บังคับเลือก" : "ไม่บังคับ"} · {group.options.length} ตัวเลือก</p>
                  </button>
                  <button onClick={() => { setEditGroupId(group.id); setGroupForm({ name: group.name, isRequired: group.isRequired, minSelect: group.minSelect, maxSelect: group.maxSelect, sortOrder: group.sortOrder }); }} className="text-muted-foreground hover:text-primary"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteGroupMutation.mutate({ id: group.id })} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </>
              )}
            </div>

            {expandedGroup === group.id && (
              <div className="border-t border-border p-4 space-y-2 bg-background">
                {group.options.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2 bg-card rounded-xl px-3 py-2 border border-border">
                    <span className="flex-1 text-sm text-foreground">{opt.name}</span>
                    <span className="text-sm text-muted-foreground">{parseFloat(String(opt.priceAdd)) > 0 ? `+${opt.priceAdd}฿` : "ฟรี"}</span>
                    <button onClick={() => deleteOptionMutation.mutate({ id: opt.id })} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                {newOptionGroupId === group.id ? (
                  <div className="flex gap-2 mt-2">
                    <Input value={newOptionName} onChange={(e) => setNewOptionName(e.target.value)} placeholder="ชื่อตัวเลือก" className="flex-1 border-border h-9 text-sm" />
                    <Input type="number" value={newOptionPrice} onChange={(e) => setNewOptionPrice(e.target.value)} placeholder="ราคาเพิ่ม" className="w-24 border-border h-9 text-sm" />
                    <button onClick={() => { upsertOptionMutation.mutate({ modifierGroupId: group.id, name: newOptionName, priceAdd: parseFloat(newOptionPrice) || 0, sortOrder: group.options.length, isActive: true }); setNewOptionName(""); setNewOptionPrice("0"); setNewOptionGroupId(null); }} className="text-green-600"><Check className="w-5 h-5" /></button>
                    <button onClick={() => setNewOptionGroupId(null)} className="text-muted-foreground"><X className="w-5 h-5" /></button>
                  </div>
                ) : (
                  <button onClick={() => setNewOptionGroupId(group.id)} className="flex items-center gap-1 text-sm text-primary hover:text-foreground mt-1">
                    <Plus className="w-4 h-4" /> เพิ่มตัวเลือก
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
