import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useStaff } from "@/contexts/StaffContext";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Store, Percent, Clock, Layers, ShoppingBag,
  Plus, Trash2, Edit2, Check, X, ChevronLeft, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Tab = "shop" | "vat" | "hours" | "channels" | "modifiers";

export default function SettingsScreen() {
  const [, navigate] = useLocation();
  const { currentStaff } = useStaff();
  const [activeTab, setActiveTab] = useState<Tab>("shop");

  // Guard: only manager can access settings
  if (currentStaff?.role !== "manager") {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#5c3d2e] text-lg font-medium">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
          <p className="text-[#a07850] text-sm mt-1">เฉพาะผู้จัดการเท่านั้น</p>
          <Button onClick={() => navigate("/")} className="mt-4 bg-[#5c3d2e] text-white">กลับหน้าขาย</Button>
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
  ];

  return (
    <div className="min-h-screen bg-[#faf7f2] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#e8d5b7] px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate("/")} className="text-[#5c3d2e] hover:text-[#3d2415] transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-[#3d2415]">ตั้งค่า</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-[#e8d5b7] p-4 flex flex-col gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-[#5c3d2e] text-white"
                  : "text-[#5c3d2e] hover:bg-[#f5ede0]"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          {activeTab === "shop" && <ShopInfoSection />}
          {activeTab === "vat" && <VatSection />}
          {activeTab === "hours" && <HoursSection />}
          {activeTab === "channels" && <ChannelsSection />}
          {activeTab === "modifiers" && <ModifiersSection />}
        </main>
      </div>
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
      <h2 className="text-lg font-bold text-[#3d2415] mb-6">ข้อมูลร้าน</h2>
      <div className="space-y-4">
        <div>
          <Label className="text-[#5c3d2e] font-medium">ชื่อร้าน</Label>
          <Input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} className="mt-1 border-[#e8d5b7] focus-visible:ring-[#d4a96a]" />
        </div>
        <div>
          <Label className="text-[#5c3d2e] font-medium">ที่อยู่</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1 border-[#e8d5b7] focus-visible:ring-[#d4a96a]" placeholder="ที่อยู่ร้าน" />
        </div>
        <div>
          <Label className="text-[#5c3d2e] font-medium">เบอร์โทร</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 border-[#e8d5b7] focus-visible:ring-[#d4a96a]" placeholder="0xx-xxx-xxxx" />
        </div>
        <div>
          <Label className="text-[#5c3d2e] font-medium">เลขผู้เสียภาษี (ถ้ามี)</Label>
          <Input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} className="mt-1 border-[#e8d5b7] focus-visible:ring-[#d4a96a]" placeholder="เลข 13 หลัก" />
        </div>
        <div>
          <Label className="text-[#5c3d2e] font-medium">QR PromptPay (สำหรับรับโอนเงิน)</Label>
          <p className="text-[#a07850] text-xs mt-1 mb-2">อัปโหลดรูป QR Code PromptPay ของร้าน เพื่อแสดงในหน้าชำระเงิน</p>
          <QrUploadField currentUrl={settings?.promptpayQrUrl ?? null} onSave={(url) => updateMutation.mutate({ promptpayQrUrl: url })} />
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-[#5c3d2e] hover:bg-[#3d2415] text-white w-full">
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
          <img src={preview} alt="QR" className="w-24 h-24 object-contain border border-[#e8d5b7] rounded-lg" />
          <button onClick={() => { setPreview(null); onSave(null); }} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      ) : (
        <label className="w-24 h-24 border-2 border-dashed border-[#e8d5b7] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#d4a96a] transition-colors">
          <Upload className="w-6 h-6 text-[#a07850]" />
          <span className="text-xs text-[#a07850] mt-1">อัปโหลด</span>
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
      <h2 className="text-lg font-bold text-[#3d2415] mb-6">ภาษีมูลค่าเพิ่ม (VAT)</h2>
      <div className="bg-white rounded-2xl border border-[#e8d5b7] p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-[#3d2415]">เปิดใช้งาน VAT</p>
            <p className="text-sm text-[#a07850]">แสดง VAT แยกในใบเสร็จและสรุปยอด</p>
          </div>
          <Switch checked={vatEnabled} onCheckedChange={setVatEnabled} className="data-[state=checked]:bg-[#5c3d2e]" />
        </div>
        {vatEnabled && (
          <div>
            <Label className="text-[#5c3d2e] font-medium">อัตรา VAT (%)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input type="number" value={vatRate} onChange={(e) => setVatRate(e.target.value)} className="w-24 border-[#e8d5b7] focus-visible:ring-[#d4a96a]" min="0" max="100" step="0.5" />
              <span className="text-[#5c3d2e]">%</span>
            </div>
          </div>
        )}
        <Button onClick={() => updateMutation.mutate({ vatEnabled, vatRate: parseFloat(vatRate) || 7 })} disabled={updateMutation.isPending} className="bg-[#5c3d2e] hover:bg-[#3d2415] text-white w-full">
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
      <h2 className="text-lg font-bold text-[#3d2415] mb-6">เวลาเปิด-ปิดร้าน</h2>
      <div className="bg-white rounded-2xl border border-[#e8d5b7] p-6 space-y-4">
        <p className="text-sm text-[#a07850]">ใช้เป็นข้อมูลอ้างอิงในรายงาน ไม่บล็อกการขายนอกเวลา</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-[#5c3d2e] font-medium">เวลาเปิด</Label>
            <Input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="mt-1 border-[#e8d5b7] focus-visible:ring-[#d4a96a]" />
          </div>
          <div>
            <Label className="text-[#5c3d2e] font-medium">เวลาปิด</Label>
            <Input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="mt-1 border-[#e8d5b7] focus-visible:ring-[#d4a96a]" />
          </div>
        </div>
        <Button onClick={() => updateMutation.mutate({ openTime, closeTime })} disabled={updateMutation.isPending} className="bg-[#5c3d2e] hover:bg-[#3d2415] text-white w-full">
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
        <h2 className="text-lg font-bold text-[#3d2415]">ช่องทางการขาย</h2>
        <Button onClick={() => setShowAdd(true)} size="sm" className="bg-[#5c3d2e] hover:bg-[#3d2415] text-white gap-1">
          <Plus className="w-4 h-4" /> เพิ่ม
        </Button>
      </div>
      <div className="space-y-3">
        {channels.map((ch) => (
          <div key={ch.id} className="bg-white rounded-2xl border border-[#e8d5b7] p-4 flex items-center gap-3">
            {editId === ch.id ? (
              <>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="ชื่อ" className="border-[#e8d5b7]" />
                  <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} placeholder="slug (ภาษาอังกฤษ)" className="border-[#e8d5b7]" />
                </div>
                <button onClick={() => handleSaveEdit(ch)} className="text-green-600 hover:text-green-700"><Check className="w-5 h-5" /></button>
                <button onClick={() => setEditId(null)} className="text-[#a07850] hover:text-[#5c3d2e]"><X className="w-5 h-5" /></button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <p className="font-medium text-[#3d2415]">{ch.name}</p>
                  <p className="text-xs text-[#a07850]">slug: {ch.slug}</p>
                </div>
                <Switch checked={ch.isActive} onCheckedChange={(v) => upsertMutation.mutate({ ...ch, isActive: v })} className="data-[state=checked]:bg-[#5c3d2e]" />
                <button onClick={() => { setEditId(ch.id); setEditName(ch.name); setEditSlug(ch.slug); }} className="text-[#a07850] hover:text-[#5c3d2e]"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => deleteMutation.mutate({ id: ch.id })} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </>
            )}
          </div>
        ))}
      </div>
      {showAdd && (
        <div className="mt-4 bg-white rounded-2xl border border-[#d4a96a] p-4 space-y-3">
          <p className="font-medium text-[#3d2415]">เพิ่มช่องทางใหม่</p>
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ชื่อช่องทาง เช่น Foodpanda" className="border-[#e8d5b7]" />
          <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="slug เช่น foodpanda (ภาษาอังกฤษ ไม่มีช่องว่าง)" className="border-[#e8d5b7]" />
          <div className="flex gap-2">
            <Button onClick={handleAdd} className="bg-[#5c3d2e] text-white flex-1">เพิ่ม</Button>
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
        <h2 className="text-lg font-bold text-[#3d2415]">ตัวเลือกเพิ่มเติม (Modifier Groups)</h2>
        <Button onClick={() => { setShowAddGroup(true); setGroupForm({ name: "", isRequired: false, minSelect: 0, maxSelect: 1, sortOrder: groups.length }); }} size="sm" className="bg-[#5c3d2e] text-white gap-1">
          <Plus className="w-4 h-4" /> เพิ่มกลุ่ม
        </Button>
      </div>

      {showAddGroup && (
        <div className="mb-4 bg-white rounded-2xl border border-[#d4a96a] p-4 space-y-3">
          <p className="font-semibold text-[#3d2415]">กลุ่มใหม่</p>
          <Input value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="ชื่อกลุ่ม เช่น ระดับความหวาน" className="border-[#e8d5b7]" />
          <div className="flex items-center gap-3">
            <Switch checked={groupForm.isRequired} onCheckedChange={(v) => setGroupForm({ ...groupForm, isRequired: v })} className="data-[state=checked]:bg-[#5c3d2e]" />
            <span className="text-sm text-[#5c3d2e]">บังคับเลือก</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { upsertGroupMutation.mutate(groupForm); setShowAddGroup(false); }} className="bg-[#5c3d2e] text-white flex-1">เพิ่ม</Button>
            <Button variant="outline" onClick={() => setShowAddGroup(false)} className="flex-1">ยกเลิก</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.id} className="bg-white rounded-2xl border border-[#e8d5b7] overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              {editGroupId === group.id ? (
                <>
                  <Input value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} className="flex-1 border-[#e8d5b7]" />
                  <Switch checked={groupForm.isRequired} onCheckedChange={(v) => setGroupForm({ ...groupForm, isRequired: v })} className="data-[state=checked]:bg-[#5c3d2e]" />
                  <span className="text-xs text-[#a07850]">บังคับ</span>
                  <button onClick={() => { upsertGroupMutation.mutate({ ...groupForm, id: group.id }); setEditGroupId(null); }} className="text-green-600"><Check className="w-5 h-5" /></button>
                  <button onClick={() => setEditGroupId(null)} className="text-[#a07850]"><X className="w-5 h-5" /></button>
                </>
              ) : (
                <>
                  <button onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)} className="flex-1 text-left">
                    <p className="font-medium text-[#3d2415]">{group.name}</p>
                    <p className="text-xs text-[#a07850]">{group.isRequired ? "บังคับเลือก" : "ไม่บังคับ"} · {group.options.length} ตัวเลือก</p>
                  </button>
                  <button onClick={() => { setEditGroupId(group.id); setGroupForm({ name: group.name, isRequired: group.isRequired, minSelect: group.minSelect, maxSelect: group.maxSelect, sortOrder: group.sortOrder }); }} className="text-[#a07850] hover:text-[#5c3d2e]"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteGroupMutation.mutate({ id: group.id })} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </>
              )}
            </div>

            {expandedGroup === group.id && (
              <div className="border-t border-[#f0e4d0] p-4 space-y-2 bg-[#faf7f2]">
                {group.options.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-[#e8d5b7]">
                    <span className="flex-1 text-sm text-[#3d2415]">{opt.name}</span>
                    <span className="text-sm text-[#a07850]">{parseFloat(String(opt.priceAdd)) > 0 ? `+${opt.priceAdd}฿` : "ฟรี"}</span>
                    <button onClick={() => deleteOptionMutation.mutate({ id: opt.id })} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                {newOptionGroupId === group.id ? (
                  <div className="flex gap-2 mt-2">
                    <Input value={newOptionName} onChange={(e) => setNewOptionName(e.target.value)} placeholder="ชื่อตัวเลือก" className="flex-1 border-[#e8d5b7] h-9 text-sm" />
                    <Input type="number" value={newOptionPrice} onChange={(e) => setNewOptionPrice(e.target.value)} placeholder="ราคาเพิ่ม" className="w-24 border-[#e8d5b7] h-9 text-sm" />
                    <button onClick={() => { upsertOptionMutation.mutate({ modifierGroupId: group.id, name: newOptionName, priceAdd: parseFloat(newOptionPrice) || 0, sortOrder: group.options.length, isActive: true }); setNewOptionName(""); setNewOptionPrice("0"); setNewOptionGroupId(null); }} className="text-green-600"><Check className="w-5 h-5" /></button>
                    <button onClick={() => setNewOptionGroupId(null)} className="text-[#a07850]"><X className="w-5 h-5" /></button>
                  </div>
                ) : (
                  <button onClick={() => setNewOptionGroupId(group.id)} className="flex items-center gap-1 text-sm text-[#5c3d2e] hover:text-[#3d2415] mt-1">
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
