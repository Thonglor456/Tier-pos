import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useStaff } from "@/contexts/StaffContext";
import { toast } from "sonner";
import { Delete, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBranch } from "@/contexts/BranchContext";

export default function StaffLoginScreen() {
  const { setCurrentStaff } = useStaff();
  const { currentBranch, setCurrentBranch } = useBranch();
  const { data: allBranches = [] } = trpc.branches.list.useQuery();
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const { data: staffList = [] } = trpc.posUsers.list.useQuery();
  const verifyMutation = trpc.posUsers.verifyStaffPin.useMutation();

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId);

  const handlePinPress = (digit: string) => {
    if (pin.length >= 6) return;
    setError("");
    setPin((prev) => prev + digit);
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  };

  // Step 3: branch selection (for staff without assigned branch)
  const [pendingStaff, setPendingStaff] = useState<{ id: number; name: string; role: "admin" | "manager" | "staff"; branchId: number | null } | null>(null);

  const handleConfirm = async () => {
    if (!selectedStaffId || pin.length < 4) return;
    setIsVerifying(true);
    try {
      const result = await verifyMutation.mutateAsync({ staffId: selectedStaffId, pin });
      if (result) {
        const staffData = { id: result.id, name: result.name, role: result.role as "admin" | "manager" | "staff", branchId: result.branchId ?? null };
        if (result.branchId) {
          // Staff assigned to a specific branch — auto-set and enter
          const assignedBranch = allBranches.find((b) => b.id === result.branchId);
          if (assignedBranch) setCurrentBranch({ id: assignedBranch.id, name: assignedBranch.name });
          setCurrentStaff(staffData);
          toast.success(`ยินดีต้อนรับ ${result.name}`);
        } else if (allBranches.filter((b) => b.isActive).length > 0) {
          // No fixed branch + branches exist → ask which branch
          setPendingStaff(staffData);
        } else {
          // No branches configured → enter without branch
          setCurrentStaff(staffData);
          toast.success(`ยินดีต้อนรับ ${result.name}`);
        }
      } else {
        setError("PIN ไม่ถูกต้อง กรุณาลองใหม่");
        setPin("");
      }
    } catch {
      setError("PIN ไม่ถูกต้อง กรุณาลองใหม่");
      setPin("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSelectBranch = (branch: { id: number; name: string }) => {
    if (!pendingStaff) return;
    setCurrentBranch(branch);
    setCurrentStaff(pendingStaff);
    toast.success(`ยินดีต้อนรับ ${pendingStaff.name} · ${branch.name}`);
  };

  const PAD_KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Logo */}
      <div className="flex flex-col items-center mb-4 sm:mb-10">
        <div className="w-24 h-24 rounded-full overflow-hidden mb-4 shadow-2xl bg-muted flex-shrink-0">
          <img src="/tier-logo.svg" alt="Tier Coffee" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-wide">Tier Coffee</h1>
        {currentBranch ? (
          <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
            <MapPin className="w-3.5 h-3.5" /><span>{currentBranch.name}</span>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm mt-1">Point of Sale</p>
        )}
      </div>

      {/* Step 3: Branch Selection Modal */}
      {pendingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-3xl shadow-2xl border border-border w-full max-w-sm p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">เลือกสาขา</h2>
              <p className="text-sm text-muted-foreground mt-1">{pendingStaff.name} · กรุณาเลือกสาขาที่ปฏิบัติงาน</p>
            </div>
            <div className="space-y-2">
              {allBranches.filter((b) => b.isActive).map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => handleSelectBranch({ id: branch.id, name: branch.name })}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border bg-muted hover:bg-secondary hover:border-primary/40 transition-all duration-150 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{branch.name}</p>
                    {branch.address && <p className="text-xs text-muted-foreground truncate">{branch.address}</p>}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => { setPendingStaff(null); setSelectedStaffId(null); setPin(""); }}
              className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← ย้อนกลับ
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border overflow-hidden">
        {!selectedStaffId ? (
          /* Step 1: Select Staff */
          <div className="p-8">
            <h2 className="text-xl font-semibold text-foreground text-center mb-6">เลือกพนักงาน</h2>
            <div className="space-y-3">
              {staffList.filter((s) => s.isActive).map((staff) => (
                <button
                  key={staff.id}
                  onClick={() => setSelectedStaffId(staff.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted hover:bg-secondary border border-border hover:border-primary/40 transition-all duration-200 group"
                >
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                    <span className="text-xl">
                      {staff.role === "admin" ? "🔑" : staff.role === "manager" ? "👑" : "⚡"}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-foreground font-medium">{staff.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {staff.role === "admin" ? "ผู้ดูแลระบบ" : staff.role === "manager" ? "ผู้จัดการ" : "พนักงาน"}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                </button>
              ))}
              {staffList.filter((s) => s.isActive).length === 0 && (
                <p className="text-muted-foreground text-center py-8">ยังไม่มีพนักงานในระบบ</p>
              )}
            </div>
          </div>
        ) : (
          /* Step 2: Enter PIN */
          <div className="p-8">
            <button
              onClick={() => { setSelectedStaffId(null); setPin(""); setError(""); }}
              className="text-muted-foreground hover:text-foreground text-sm mb-6 flex items-center gap-1 transition-colors"
            >
              ← เปลี่ยนพนักงาน
            </button>

            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-3">
                <span className="text-3xl">
                  {selectedStaff?.role === "admin" ? "🔑" : selectedStaff?.role === "manager" ? "👑" : "⚡"}
                </span>
              </div>
              <p className="text-foreground font-semibold text-lg">{selectedStaff?.name}</p>
              <p className="text-muted-foreground text-sm">
                {selectedStaff?.role === "admin" ? "ผู้ดูแลระบบ" : selectedStaff?.role === "manager" ? "ผู้จัดการ" : "พนักงาน"}
              </p>
            </div>

            <p className="text-muted-foreground text-center text-sm mb-4">กรอก PIN ของคุณ</p>

            {/* PIN dots */}
            <div className="flex justify-center gap-3 mb-2">
              {Array.from({ length: Math.max(pin.length, 4) }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-4 h-4 rounded-full border-2 transition-all duration-150",
                    i < pin.length
                      ? "bg-primary border-primary scale-110"
                      : "bg-transparent border-border"
                  )}
                />
              ))}
            </div>

            {error && (
              <p className="text-red-400 text-center text-sm mb-3 animate-pulse">{error}</p>
            )}

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {PAD_KEYS.map((key, idx) => {
                if (key === "") return <div key={idx} />;
                return (
                  <button
                    key={idx}
                    onClick={() => key === "⌫" ? handleDelete() : handlePinPress(key)}
                    className={cn(
                      "h-14 rounded-2xl font-semibold text-xl transition-all duration-150 active:scale-95",
                      key === "⌫"
                        ? "bg-muted text-muted-foreground hover:bg-secondary"
                        : "bg-muted text-foreground hover:bg-secondary border border-border/30"
                    )}
                  >
                    {key === "⌫" ? <Delete className="w-5 h-5 mx-auto" /> : key}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleConfirm}
              disabled={pin.length < 4 || isVerifying}
              className="w-full mt-6 h-14 rounded-2xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground font-bold text-lg transition-all duration-200 active:scale-[0.98]"
            >
              {isVerifying ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
