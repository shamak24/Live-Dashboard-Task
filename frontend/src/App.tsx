import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { WakingUpProvider, WakingUpOverlay } from "@/contexts/WakingUpContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGuard } from "@/components/RoleGuard";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { AppShell } from "@/components/layout/AppShell";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { HomePage } from "@/pages/HomePage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { BookingsPage } from "@/pages/BookingsPage";
import { BookingDetailPage } from "@/pages/BookingDetailPage";
import { MechanicsPage } from "@/pages/MechanicsPage";
import { MechanicDetailPage } from "@/pages/MechanicDetailPage";
import { CustomersPage } from "@/pages/CustomersPage";
import { CustomerDetailPage } from "@/pages/CustomerDetailPage";
import { CustomerBookPage } from "@/pages/customer/CustomerBookPage";
import { CustomerHistoryPage } from "@/pages/customer/CustomerHistoryPage";
import { CustomerVehiclesPage } from "@/pages/customer/CustomerVehiclesPage";
import { CustomerAccountPage } from "@/pages/customer/CustomerAccountPage";
import { paths } from "@/lib/paths";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
      retry: 2,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WakingUpProvider>
        <AuthProvider>
          <SocketProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<MarketingLayout />}>
                  <Route path={paths.landing} element={<LandingPage />} />
                  <Route path={paths.login} element={<LoginPage />} />
                  <Route path={paths.signup} element={<SignupPage />} />
                </Route>

                <Route path={paths.home} element={<ProtectedRoute />}>
                  <Route element={<AppShell />}>
                    <Route index element={<HomePage />} />
                    <Route
                      path="analytics"
                      element={
                        <RoleGuard roles={["ADMIN"]}>
                          <AnalyticsPage />
                        </RoleGuard>
                      }
                    />
                    <Route path="bookings" element={<BookingsPage />} />
                    <Route
                      path="bookings/new"
                      element={
                        <RoleGuard roles={["CUSTOMER"]}>
                          <Navigate to={paths.customerBook} replace />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="profile"
                      element={
                        <RoleGuard roles={["CUSTOMER"]}>
                          <Navigate to={paths.customerAccount} replace />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="book"
                      element={
                        <RoleGuard roles={["CUSTOMER"]}>
                          <CustomerBookPage />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="history"
                      element={
                        <RoleGuard roles={["CUSTOMER"]}>
                          <CustomerHistoryPage />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="vehicles"
                      element={
                        <RoleGuard roles={["CUSTOMER"]}>
                          <CustomerVehiclesPage />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="account"
                      element={
                        <RoleGuard roles={["CUSTOMER"]}>
                          <CustomerAccountPage />
                        </RoleGuard>
                      }
                    />
                    <Route path="bookings/:id" element={<BookingDetailPage />} />
                    <Route
                      path="mechanics"
                      element={
                        <RoleGuard roles={["ADMIN"]}>
                          <MechanicsPage />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="mechanics/:id"
                      element={
                        <RoleGuard roles={["ADMIN"]}>
                          <MechanicDetailPage />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="customers"
                      element={
                        <RoleGuard roles={["ADMIN"]}>
                          <CustomersPage />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="customers/:id"
                      element={
                        <RoleGuard roles={["ADMIN"]}>
                          <CustomerDetailPage />
                        </RoleGuard>
                      }
                    />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to={paths.landing} replace />} />
              </Routes>
            </BrowserRouter>
            <WakingUpOverlay />
            <Toaster position="top-right" richColors />
          </SocketProvider>
        </AuthProvider>
      </WakingUpProvider>
    </QueryClientProvider>
  );
}
