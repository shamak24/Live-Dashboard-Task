import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { WakingUpProvider, WakingUpOverlay } from "@/contexts/WakingUpContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGuard } from "@/components/RoleGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { BookingsPage } from "@/pages/BookingsPage";
import { BookingDetailPage } from "@/pages/BookingDetailPage";
import { MechanicsPage } from "@/pages/MechanicsPage";
import { MechanicDetailPage } from "@/pages/MechanicDetailPage";
import { CustomersPage } from "@/pages/CustomersPage";

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
                <Route path="/login" element={<LoginPage />} />
                <Route element={<ProtectedRoute />}>
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
                <Route path="*" element={<Navigate to="/" replace />} />
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
