import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { StaffProvider, useStaff } from "./contexts/StaffContext";
import StaffLoginScreen from "./pages/StaffLoginScreen";
import POSScreen from "./pages/POSScreen";
import AdminScreen from "./pages/AdminScreen";
import ReportsScreen from "./pages/ReportsScreen";
import SettingsScreen from "./pages/SettingsScreen";

function AppRoutes() {
  const { currentStaff } = useStaff();
  if (!currentStaff) return <StaffLoginScreen />;
  return (
    <Switch>
      <Route path="/" component={POSScreen} />
      <Route path="/admin" component={AdminScreen} />
      <Route path="/reports" component={ReportsScreen} />
      <Route path="/settings" component={SettingsScreen} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <StaffProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster position="top-center" richColors />
            <AppRoutes />
          </TooltipProvider>
        </ThemeProvider>
      </StaffProvider>
    </ErrorBoundary>
  );
}

export default App;
