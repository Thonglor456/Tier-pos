import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { StaffProvider, useStaff } from "./contexts/StaffContext";
import { BranchProvider, useBranch } from "./contexts/BranchContext";
import { trpc } from "@/lib/trpc";
import StaffLoginScreen from "./pages/StaffLoginScreen";
import POSScreen from "./pages/POSScreen";
import AdminScreen from "./pages/AdminScreen";
import ReportsScreen from "./pages/ReportsScreen";
import SettingsScreen from "./pages/SettingsScreen";
import DashboardScreen from "./pages/DashboardScreen";
import BranchCompareScreen from "./pages/BranchCompareScreen";
import PriceEditScreen from "./pages/PriceEditScreen";
import StockScreen from "./pages/StockScreen";
import AccountingScreen from "./pages/AccountingScreen";

function AppRoutes() {
  const { currentStaff } = useStaff();
  const { currentBranch } = useBranch();
  const { data: branches = [] } = trpc.branches.list.useQuery();
  if (!currentStaff) return <StaffLoginScreen />;
  // เครื่องที่ตั้งเป็นคลังกลางไม่มีหน้าขาย: เปิดมาที่หน้าสต็อกเลย
  const isWarehouseDevice = branches.find((b) => b.id === currentBranch?.id)?.type === "warehouse";
  return (
    <Switch>
      <Route path="/" component={isWarehouseDevice ? StockScreen : POSScreen} />
      <Route path="/admin" component={AdminScreen} />
      <Route path="/reports" component={ReportsScreen} />
      <Route path="/settings" component={SettingsScreen} />
      <Route path="/dashboard" component={DashboardScreen} />
      <Route path="/branch-compare" component={BranchCompareScreen} />
      <Route path="/prices" component={PriceEditScreen} />
      <Route path="/stock" component={StockScreen} />
      <Route path="/accounting" component={AccountingScreen} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <StaffProvider>
        <BranchProvider>
          <ThemeProvider defaultTheme="light">
            <TooltipProvider>
              <Toaster position="top-center" richColors />
              <AppRoutes />
            </TooltipProvider>
          </ThemeProvider>
        </BranchProvider>
      </StaffProvider>
    </ErrorBoundary>
  );
}

export default App;
