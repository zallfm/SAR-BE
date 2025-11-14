import React, { useEffect, useState } from "react";
import { ApprovedIcon } from "../../../components/icons/ApprovedIcon";
import { RevokedIcon } from "../../../components/icons/RevokedIcon";
import { AccessReviewCompleteIcon } from "../../../components/icons/AccessReviewCompleteIcon";
import { UpTrendIcon } from "../../../components/icons/UpTrendIcon";
import { DownTrendIcon } from "../../../components/icons/DownTrendIcon";
import { getUarListApi as getUarDivListApi } from "@/src/api/uarDivision";
import { getUarListApi as getUarSoListApi } from "@/src/api/uarSystemOwner";
import { useAuthStore } from "@/src/store/authStore";
import { getAdminDashboard, getSoDashboard, getDphDashboard } from "@/src/services/uarProgressService";
import type { KpiDashboardStats } from '@/src/types/progress';

export const ROLE_ADMINISTRATOR = import.meta.env.VITE_ADMINISTRATOR
export const ROLE_SYSTEM_OWNER = import.meta.env.VITE_SYSTEM_OWNER
export const ROLE_DPH = import.meta.env.VITE_DPH

interface StatCardProps {
  title: string;
  value: string;
  trend: string;
  trendDirection: "up" | "down";
  trendText: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  trend,
  trendDirection,
  trendText,
  icon,
}) => {
  const isUp = trendDirection === "up";
  const trendColor = isUp ? "text-green-500" : "text-red-500";
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex-1">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
          <div className={`flex items-center mt-2 text-xs ${trendColor}`}>
            {isUp ? (
              <UpTrendIcon className="w-4 h-4 mr-1" />
            ) : (
              <DownTrendIcon className="w-4 h-4 mr-1" />
            )}
            <span className="font-semibold">{trend}</span>
            <span className="text-gray-500 ml-1">{trendText}</span>
          </div>
        </div>
        <div className="w-12 h-12 flex items-center justify-center">{icon}</div>
      </div>
    </div>
  );
};

// onStart now carries the 'kind' so parent can route correctly
interface DashboardContentProps {
  onStart: (uarId: string, kind: "so" | "div") => void;
  onSeeMore: (kind: "so" | "div", listType: "pending" | "reviewed") => void
}
type ListType = "pending" | "reviewed";

interface TaskListProps {
  title: string;
  items: string[];
  onStart: (uarId: string, kind: "so" | "div") => void;
  onSeeMore: (kind: "so" | "div", listType: ListType) => void;
  kind: "so" | "div";
  listType: ListType
}

const TaskList: React.FC<TaskListProps> = ({ title, items, onStart, onSeeMore, kind, listType }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex-1">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
    <div className="space-y-2">
      {items.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-4 border rounded-md bg-gray-50">
          UAR There isn't any
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item}
              className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
            >
              <p className="text-sm text-gray-600">{item}</p>
              <button
                className="text-xs font-semibold bg-teal-100 text-teal-600 px-4 py-1.5 rounded-md hover:bg-teal-200 transition-colors"
                onClick={() => onStart(item, kind)}
              >
                START
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
    <div className="mt-6 text-center">
      <button className="text-sm font-semibold bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors" onClick={() => onSeeMore(kind, listType)}>
        See More
      </button>
    </div>
  </div>
);

const DashboardContent: React.FC<DashboardContentProps> = ({ onStart, onSeeMore }) => {
  const { currentUser } = useAuthStore();
  const [reviewItems, setReviewItems] = useState<string[]>([]);
  const [approveItems, setApproveItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [kpiStats, setKpiStats] = useState<KpiDashboardStats | null>(null);
  const [loadingKpi, setLoadingKpi] = useState(true);
  const [errorKpi, setErrorKpi] = useState<string | null>(null);

  // Role normalization
  const role = (currentUser?.role ?? "").trim().toUpperCase();
  const isAdmin = role === ROLE_ADMINISTRATOR;
  const isSO = role === ROLE_SYSTEM_OWNER;
  const isDPH = role === ROLE_DPH;

  // Admin gets a toggle; non-admins get fixed source (SO for SO, DIV for DPH)
  const initialSource: "so" | "div" = isSO ? "so" : isDPH ? "div" : "so";
  const [source, setSource] = useState<"so" | "div">(initialSource);

  // Keep source in sync when role is not admin
  useEffect(() => {
    if (isSO && source !== "so") setSource("so");
    if (isDPH && source !== "div") setSource("div");
  }, [isSO, isDPH]); // eslint-disable-line

  useEffect(() => {
    const ac = new AbortController();
    const fetchKpiData = async () => {
      try {
        setLoadingKpi(true);
        setErrorKpi(null);

        let apiCall;
        if (isAdmin) {
          apiCall = getAdminDashboard;
        } else if (isSO) {
          apiCall = getSoDashboard;
        } else if (isDPH) {
          apiCall = getDphDashboard;
        } else {
          return; // No recognized role
        }

        const response = await apiCall(ac.signal);

        setKpiStats(response);
        console.log(response)

      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setErrorKpi(e?.message ?? "Failed to load KPI data");
        }
      } finally {
        setLoadingKpi(false);
      }
    };

    fetchKpiData();
    return () => ac.abort();
  }, [isAdmin, isSO, isDPH]);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        if (!isAdmin && !isSO && !isDPH) {
          setReviewItems([]);
          setApproveItems([]);
          return;
        }

        const isSoMode = source === "so";
        const [pendingResp, reviewedResp] = await Promise.all([
          isSoMode
            ? getUarSoListApi(
              {
                status: "InProgress",
                reviewStatus: "pending",
                page: 1,
                limit: 5,
              },
              ac.signal
            )
            : getUarDivListApi(
              {
                status: "InProgress",
                reviewStatus: "pending",
                page: 1,
                limit: 5,
              },
              ac.signal
            ),
          isSoMode
            ? getUarSoListApi(
              {
                status: "InProgress",
                reviewStatus: "reviewed",
                page: 1,
                limit: 5,
              },
              ac.signal
            )
            : getUarDivListApi(
              {
                status: "InProgress",
                reviewStatus: "reviewed",
                page: 1,
                limit: 5,
              },
              ac.signal
            ),
        ]);

        const pendingIds = (pendingResp?.data ?? []).map((h: any) => h.uarId);
        const inProgressIds = (reviewedResp?.data ?? []).map(
          (h: any) => h.uarId
        );

        setReviewItems(Array.from(new Set(pendingIds)));
        setApproveItems(Array.from(new Set(inProgressIds)));
      } catch (e: any) {
        if (e?.name !== "AbortError")
          setErr(e?.message ?? "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [currentUser, source, isAdmin, isSO, isDPH]);

  useEffect(() => {
    // This will run only after the component has successfully re-rendered 
    // with the new kpiStats value
    if (kpiStats !== null) {
      console.log("kpiStats is updated:", kpiStats);
    }
  }, [kpiStats]);

  if (loading || loadingKpi)
    return <div className="text-sm text-gray-500">Loading dashboard…</div>;
  if (err || errorKpi)
    return <div className="text-sm text-red-600">Error: {err || errorKpi}</div>;

  const formatTrendProps = (item: { percentage: number; trend: number; }) => {
    const trendValue = Math.abs(item.trend);

    const trendDirection: "up" | "down" = item.trend >= 0 ? "up" : "down";

    const trendText = "from yesterday";

    return {
      value: `${item.percentage.toFixed(0)}%`,
      trend: `${trendValue.toFixed(1)}%`,
      trendDirection,
      trendText
    };
  };



  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpiStats && (
          <>
            <StatCard
              title="Approved"
              {...formatTrendProps(kpiStats.approved)}
              icon={<ApprovedIcon />}
            />
            <StatCard
              title="Revoked"
              {...formatTrendProps(kpiStats.revoked)}
              icon={<RevokedIcon />}
            />
            <StatCard
              title="Access Review Complete"
              {...formatTrendProps(kpiStats.accessReviewComplete)}
              icon={<AccessReviewCompleteIcon />}
            />
          </>
        )}
      </div>
      {/* Admin-only dropdown to switch source */}
      <div className="mt-4">
        {isAdmin && (
          <div className="flex items-center gap-2">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as "so" | "div")}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
            >
              <option value="so">UAR System Owner</option>
              <option value="div">UAR Division User</option>
            </select>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TaskList
          title="To Do Review"
          items={reviewItems}
          onStart={onStart}
          onSeeMore={onSeeMore}
          kind={source}
          listType="pending"
        />
        <TaskList
          title="To Do Approve"
          items={approveItems}
          onStart={onStart}
          onSeeMore={onSeeMore}
          kind={source}
          listType="reviewed"
        />
      </div>
    </div>
  );
};

export default DashboardContent;
