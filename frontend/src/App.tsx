import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { WakingUpProvider, WakingUpOverlay } from "@/contexts/WakingUpContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGuard } from "@/components/RoleGuard";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { AppLayout } from "@/components/layout/AppLayout";
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
import { CreateBookingPage } from "@/pages/CreateBookingPage";
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
                  <Route element={<AppLayout />}>
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
                          <CreateBookingPage />
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
