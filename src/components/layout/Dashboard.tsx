import React, { lazy, Suspense } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import type { LogEntry, UarSystemOwnerRecord } from "../../../data";
import { useLogging } from "../../hooks/useLogging";
import Copyright from "../common/Copyright";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { useUarStore } from "../../store/uarStore";
import { useLogout, useMenu } from "../../hooks/useAuth";
import { UarHeader } from "@/src/types/uarDivision";
import { SystemOwnerUarHeader } from "@/src/types/uarSystemOwner";

const DashboardContent = lazy(
  () => import("../features/DashboardContent/DashboardContent")
);
const ApplicationPage = lazy(
  () => import("../features/application/ApplicationPage")
);
const LoggingMonitoringPage = lazy(
  () => import("../features/LogingMonitoring/LoggingMonitoringPage")
);
const LoggingMonitoringDetailPage = lazy(
  () => import("../features/LogingMonitoring/LoggingMonitoringDetailPage")
);
const UarPicPage = lazy(() => import("../features/UarPic/UarPicPage"));
const SystemMasterPage = lazy(
  () => import("../features/system-master/SystemMasterPage")
);
const UarLatestRolePage = lazy(
  () => import("../features/uar/UarLatestRolePage")
);
const SchedulePage = lazy(() => import("../features/schedule/SchedulePage"));
const UarSystemOwnerPage = lazy(
  () => import("../features/uar/UarSystemOwnerPage")
);
const UarProgressPage = lazy(() => import("../features/uar/UarProgressPage"));
const UarSystemOwnerDetailPage = lazy(
  () => import("../features/uar/UarSystemOwnerDetailPage")
);
const UarDivisionUserPage = lazy(
  () => import("../features/uar/UarDivisionUserPage")
);
const UarDivisionUserDetailPage = lazy(
  () => import("../features/uar/UarDivisionUserDetailPage")
);

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = () => {
  const { data: menuTree, isLoading, error } = useMenu();
  const { currentUser } = useAuthStore();
  const { activeView, setActiveView, resetActiveView } = useUIStore();
  const { setSystemOwnerFilters, setDivisionUserFilters } = useUarStore();
  const {
    selectedLog,
    setSelectedLog,
    selectedSystemOwner,
    selectSystemOwner,
    selectedDivisionUser,
    selectDivisionUser,
  } = useUarStore();

  // onStart from DashboardContent now passes kind ("so" | "div")
  const handleStartUarFromDashboard = (uarId: string, kind: "so" | "div") => {
    if (kind === "so") {
      setSystemOwnerFilters({ uarId });
      setActiveView("uar_system_owner");
      return;
    }
    setDivisionUserFilters({ uarId });
    setActiveView("uar_division_user");
  };
  const handleSeeMore = (
    kind: "so" | "div",
    listType: "pending" | "reviewed"
  ) => {
    if (kind === "so") {
      setSystemOwnerFilters({
        status: "InProgress",
        reviewStatus: listType,
        uarId: "",
        page: 1,
        limit: 10,
      });
      setActiveView("uar_system_owner");
      return;
    }

    setDivisionUserFilters({
      status: "InProgress",
      reviewStatus: listType,
      uarId: "",
      page: 1,
      limit: 10,
    });
    setActiveView("uar_division_user");
  };

  const user = currentUser!;
  const { logUserAction, logNavigation } = useLogging({
    componentName: "Dashboard",
    userId: user.username,
    enablePerformanceLogging: true,
  });

  const { mutateAsync: doLogout } = useLogout();
  const handleLogout = async () => {
    try {
      await doLogout();
      const { token, currentUser, tokenExpiryMs } = useAuthStore.getState();
      console.debug("[After logout]", { token, currentUser, tokenExpiryMs });
      resetActiveView();
      window.location.href = "/";
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const handleViewDetail = (log: LogEntry) => {
    setSelectedLog(log);
    setActiveView("logging_monitoring_detail");
    logNavigation("logging_monitoring", "logging_monitoring_detail", {
      logId: log.NO,
      timestamp: new Date().toISOString(),
    });
  };

  const handleBackToLogs = () => {
    setSelectedLog(null);
    setActiveView("logging_monitoring");
  };

  const handleReviewUarRecord = (record: SystemOwnerUarHeader) => {
    selectSystemOwner(record);
    setActiveView("uar_system_owner_detail");
  };

  const handleBackToUarSystemOwner = () => {
    selectSystemOwner(null);
    setActiveView("uar_system_owner");
  };

  const handleReviewUarDivisionRecord = (record: UarHeader) => {
    selectDivisionUser(record);
    setActiveView("uar_division_user_detail");
  };

  const handleBackToUarDivisionUser = () => {
    selectDivisionUser(null);
    setActiveView("uar_division_user");
  };

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <DashboardContent onStart={handleStartUarFromDashboard} onSeeMore={handleSeeMore} />;
      case "application":
        return <ApplicationPage />;
      case "logging_monitoring":
        return <LoggingMonitoringPage onViewDetail={handleViewDetail} />;
      case "logging_monitoring_detail":
        return selectedLog ? (
          <LoggingMonitoringDetailPage
            logEntry={selectedLog}
            onBack={handleBackToLogs}
          />
        ) : (
          <LoggingMonitoringPage onViewDetail={handleViewDetail} />
        );
      case "uar_pic":
        return <UarPicPage />;
      case "system_master":
        return <SystemMasterPage user={user} />;
      case "uar_latest_role":
        return <UarLatestRolePage />;
      case "schedule":
        return <SchedulePage />;
      case "uar_system_owner":
        return <UarSystemOwnerPage onReview={handleReviewUarRecord} />;
      case "uar_system_owner_detail":
        return selectedSystemOwner ? (
          <UarSystemOwnerDetailPage
            record={selectedSystemOwner}
            onBack={handleBackToUarSystemOwner}
            user={user}
          />
        ) : (
          <UarSystemOwnerPage onReview={handleReviewUarRecord} />
        );
      case "uar_progress":
        return <UarProgressPage />;
      case "uar_division_user":
        return <UarDivisionUserPage onReview={handleReviewUarDivisionRecord} />;
      case "uar_division_user_detail":
        return selectedDivisionUser ? (
          <UarDivisionUserDetailPage
            uarHeader={selectedDivisionUser}
            onBack={handleBackToUarDivisionUser}
            user={user}
          />
        ) : (
          <UarDivisionUserPage onReview={handleReviewUarDivisionRecord} />
        );
      default:
        return <DashboardContent onStart={handleStartUarFromDashboard} onSeeMore={handleSeeMore} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-64 flex-shrink-0 h-full">
        <Sidebar
          activeView={activeView}
          setActiveView={(view) => {
            logNavigation(activeView, view, {
              userId: user.username,
              timestamp: new Date().toISOString(),
            });
            setActiveView(view);
          }}
          items={menuTree ?? []}
          loading={isLoading}
          error={error ? String(error) : null}
        />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        <Header user={user} onLogout={handleLogout} />
        <main className="flex-1 overflow-x-auto overflow-y-auto bg-gray-100 p-6">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-gray-500">
                Loading...
              </div>
            }
          >
            {renderContent()}
          </Suspense>
        </main>
        <Copyright />
      </div>
    </div>
  );
};

export default Dashboard;
