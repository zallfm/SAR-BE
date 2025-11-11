import React, { lazy, Suspense, useEffect } from "react";
import type { User } from "./types";
import {
  useGlobalLogging,
  useNavigationLogging,
  useInteractionLogging,
  useApiLogging,
} from "./src/hooks/useGlobalLogging";
import { useLogging } from "./src/hooks/useLogging";
import { sessionManager } from "./src/services/sessionManager";
import { useAuthStore } from "./src/store/authStore";
import { initializeSecurity } from "./src/config/security";
import { AuditLogger } from "./src/services/auditLogger";
import { serviceWorkerManager } from "./src/utils/serviceWorker";
import { postLogMonitoringApi } from "./src/api/log_monitoring";
import { AuditAction } from "./src/constants/auditActions";

const LoginPage = lazy(
  () => import("./src/components/features/auth/LoginPage/LoginPage")
);
const Dashboard = lazy(() => import("./src/components/layout/Dashboard"));

const App: React.FC = () => {
  const { currentUser, login, logout } = useAuthStore();
  const { logAuthentication } = useLogging();

  // Initialize security, logging, and service worker
  useEffect(() => {
    initializeSecurity();
    AuditLogger.initialize();

    // Initialize service worker
    serviceWorkerManager.initialize().then((success) => {
      if (success) {
        console.log("✅ Service Worker initialized successfully");
      } else {
        console.warn("⚠️ Service Worker initialization failed");
      }
    });
  }, []);

  // Initialize global logging
  useGlobalLogging();
  useNavigationLogging();
  useInteractionLogging();
  useApiLogging();

  const handleLoginSuccess = (user: User) => {
    sessionManager.createSession({
      userId: user.username,
      username: user.username,
      role: user.role,
      name: user.name,
      ip: "127.0.0.1",
      userAgent: navigator.userAgent,
    });

    login(user);
  };

  const handleLogout = async() => {
    try {
      // await postLogMonitoringApi({
      //   userId: currentUser?.username ?? "anonymous",
      //   module: "Authentication",
      //   action: AuditAction.LOGOUT,
      //   status: "Success",
      //   description: `User ${
      //     currentUser?.username ?? "unknown"
      //   } logged out via App.tsx`,
      //   location: "App.handleLogout",
      //   timestamp: new Date().toISOString(),
      // });
    } catch (err) {
      console.warn("Failed to log logout:", err);
    }

    sessionManager.logout();
    logout();
    // Clear localStorage and force page reload to ensure clean state
    localStorage.clear();
    sessionStorage.clear();
    // Force clear currentUser state immediately
    useAuthStore.getState().logout();
    window.location.reload();
  };

  useEffect(() => {
    const checkSession = () => {
      if (currentUser && !sessionManager.isSessionValid()) {
        logout();
      }
    };

    const interval = setInterval(checkSession, 60000);

    return () => clearInterval(interval);
  }, [currentUser, logout]);

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-gray-100 font-sans">
          Loading...
        </div>
      }
    >
      <div className="bg-gray-100 h-screen font-sans">
        {currentUser ? (
          <Dashboard onLogout={handleLogout} />
        ) : (
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        )}
      </div>
    </Suspense>
  );
};

export default App;
