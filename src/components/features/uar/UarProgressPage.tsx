import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ChevronDownIcon } from '../../icons/ChevronDownIcon';
import { UarReviewIcon } from '../../icons/UarReviewIcon';
import { DivisionApprovedIcon } from '../../icons/DivisionApprovedIcon';
import { SoApprovedIcon } from '../../icons/SoApprovedIcon';
import { CompletedIcon } from '../../icons/CompletedIcon';
import { uarDivisionProgress, uarDepartmentProgress, uarSystemProgressData } from '../../../../data';
import type { UarProgressData } from '../../../../data';
import { useUarProgressData } from '../../../hooks/useUarProgressData';
import { useUarProgressStore, UarProgressFilters } from '../../../store/uarProgressStore';
import type { DivisionChartItem, ApplicationChartItem } from '../../../types/progress';
import LoadingSpinner from '../../common/LoadingStates/LoadingSpinner';
import SkeletonLoader from '../../common/LoadingStates/SkeletonLoader';
import ErrorBoundary from '../../common/ErrorBoundary/ErrorBoundary';
import { debounce, performanceMonitor } from '../../../utils/performanceUtils';
import SearchableDropdown from '../../common/SearchableDropdown';
import {
    useUarProgressData as useUarProgressStoreData,
    useUarProgressFilters,
    useUarProgressUIState,
    useUarProgressActions,
    useUarProgressComputed,
    useUarProgressLoading
} from '../../../hooks/useStoreSelectors';

import Chart from 'chart.js/auto';
import { useAuthStore } from '@/src/store/authStore';
import { postLogMonitoringApi } from '@/src/api/log_monitoring';
import { AuditAction } from '@/src/constants/auditActions';

interface StatCardProps {
    icon: React.ReactNode;
    value: string;
    label: string;
}

const StatCard: React.FC<StatCardProps> = React.memo(({ icon, value, label }) => (
    <div className="bg-white flex items-center p-4 rounded-xl shadow-sm border border-gray-200">
        {icon}
        <div className="ml-4">
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-sm text-gray-600">{label}</p>
        </div>
    </div>
), (prevProps, nextProps) => {
    return prevProps.value === nextProps.value &&
        prevProps.label === nextProps.label;
});

interface ChartDataFormat {
    label: string;
    review: number;
    approved: number;
    soApproved: number;
    total: number;
}

const UarProgressChart: React.FC<{ data: ChartDataFormat[]; selectedItem: string; yAxisRange?: { min: number, max: number }, onBarClick?: (label: string) => void; }> = React.memo(({ data, selectedItem, yAxisRange, onBarClick }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const [hiddenDatasets, setHiddenDatasets] = useState<Set<number>>(new Set());

    const originalColors = {
        review: '#FDE047',      // 1. Kuning (Review Progress)
        approved: '#A7F3D0',    // 2. Hijau (Division Approved)
        soApproved: '#F9A8D4',  // 3. Magenta (SO Approved)
        total: '#93C5FD',       // 4. Biru (Total Progress)
    };
    const grayColor = '#E5E7EB'; // tailwind gray-200

    const toggleDataset = (index: number) => {
        setHiddenDatasets(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const legendItems = [
        { label: 'Review Progress', color: originalColors.review, index: 0 },
        { label: 'Division Approved', color: originalColors.approved, index: 1 },
        { label: 'SO Approved', color: originalColors.soApproved, index: 2 },
        { label: 'Total Progress', color: originalColors.total, index: 3 },
    ];

    useEffect(() => {
        if (chartRef.current) {
            const chartInstance = new Chart(chartRef.current, {
                type: 'bar',
                data: {
                    labels: data.map(d => d.label),
                    datasets: [
                        {
                            label: 'Review Progress',
                            data: data.map(d => d.review),
                            backgroundColor: data.map(d =>
                                (selectedItem && d.label !== selectedItem) ? grayColor : originalColors.review
                            ),
                            borderRadius: 4,
                            hidden: hiddenDatasets.has(0),
                        },
                        {
                            label: 'Division Approved',
                            data: data.map(d => d.approved),
                            backgroundColor: data.map(d =>
                                (selectedItem && d.label !== selectedItem) ? grayColor : originalColors.approved
                            ),
                            borderRadius: 4,
                            hidden: hiddenDatasets.has(1),
                        },
                        {
                            label: 'SO Approved',
                            data: data.map(d => d.soApproved),
                            backgroundColor: data.map(d =>
                                (selectedItem && d.label !== selectedItem) ? grayColor : originalColors.soApproved
                            ),
                            borderRadius: 4,
                            hidden: hiddenDatasets.has(2),
                        },
                        {
                            label: 'Total Progress',
                            data: data.map(d => d.total),
                            backgroundColor: data.map(d =>
                                (selectedItem && d.label !== selectedItem) ? grayColor : originalColors.total
                            ),
                            borderRadius: 4,
                            hidden: hiddenDatasets.has(3),
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    onClick: (event: any, elements: any[]) => {
                        if (onBarClick && elements && elements.length > 0) {
                            const elementIndex = elements[0].index;
                            const label = chartInstance.data.labels?.[elementIndex];
                            if (typeof label === 'string') {
                                onBarClick(label);
                            }
                        }
                    },
                    onHover: (event: any, chartElement: any[]) => {
                        const canvas = event.native.target;
                        if (canvas) {
                            canvas.style.cursor = onBarClick && chartElement[0] ? 'pointer' : 'default';
                        }
                    },
                    plugins: {
                        legend: {
                            display: false // Hide Chart.js legend, use custom fixed legend
                        },
                        tooltip: {
                            enabled: true,
                            callbacks: {
                                label: function (context: any) {
                                    return `${context.dataset.label} ${context.parsed.y}%`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: yAxisRange ? false : true,
                            min: yAxisRange ? yAxisRange.min : 0,
                            max: yAxisRange ? yAxisRange.max : 100,
                            display: true, // Show Chart.js Y-axis
                            grid: {
                                drawOnChartArea: true,
                                drawTicks: true,
                            },
                            ticks: {
                                font: {
                                    size: 12
                                },
                                color: '#6B7280',
                                stepSize: 20, // Only show even numbers: 0, 20, 40, 60, 80, 100
                                callback: function (value: any) {
                                    return value % 20 === 0 ? value : '';
                                }
                            }
                        },
                        x: {
                            display: true, // Show X-axis labels (division names)
                            grid: {
                                display: false,
                            },
                            ticks: {
                                font: {
                                    size: 12
                                },
                                color: '#6B7280',
                            }
                        },
                    },
                },
            });
            return () => chartInstance.destroy();
        }
    }, [data, selectedItem, yAxisRange, onBarClick, hiddenDatasets]);

    const chartWidth = Math.max(data.length * 160, 600); // Increased width per item for better visibility

    return (
        <div className="relative">
            {/* Custom Fixed Legend - fixed for horizontal scroll, scrollable for vertical */}
            <div
                className="absolute top-0 left-0 z-20 bg-white p-3 rounded-lg"
                style={{
                    position: 'sticky',
                    top: '0',
                    left: '0',
                    zIndex: 20,
                    width: 'fit-content'
                }}
            >
                <div className="flex flex-wrap gap-4 text-xs">
                    {legendItems.map((item) => (
                        <button
                            key={item.index}
                            onClick={() => toggleDataset(item.index)}
                            className={`flex items-center gap-2 px-2 py-1 rounded transition-colors text-sm ${hiddenDatasets.has(item.index)
                                ? 'opacity-50 hover:opacity-75'
                                : 'hover:bg-gray-100'
                                }`}
                        >
                            <div
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: item.color }}
                            ></div>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart with top padding for legend */}
            <div className="overflow-x-auto p-1 pt-2">
                <div style={{ width: `${chartWidth}px`, height: '300px' }}>
                    <canvas ref={chartRef}></canvas>
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data) &&
        prevProps.selectedItem === nextProps.selectedItem &&
        JSON.stringify(prevProps.yAxisRange) === JSON.stringify(nextProps.yAxisRange) &&
        prevProps.onBarClick === nextProps.onBarClick;
});

const UarProgressPage: React.FC = React.memo(() => {
    // --- NEW: Get state and actions directly from the new store ---
    const {
        kpiStats,
        divisionChartData: rawDivisionData,
        applicationChartData: rawAppData,
        filters,
        filterOptions,
        drilldownDivision,
        isLoading,
        isFiltersLoading,
        error,
        fetchDashboardData,
        fetchFilterOptions,
        setFilters,
        setDrilldownDivision,
    } = useUarProgressStore();

    // --- Logging (Unchanged) ---
    const { currentUser } = useAuthStore();
    const username = currentUser?.username ?? "anonymous";
    const MODULE = "UAR.PROGRESS";
    const logStep = (p: {
        action: string;
        status?: "Success" | "Error" | "InProgress" | "Warning";
        description: string;
        location: string;
        extra?: Record<string, unknown>;
    }) => {
        // postLogMonitoringApi({ ... }); // Uncomment when ready
        console.log("LOG:", p.description, p.extra);
    };

    // --- NEW: Data Fetching on Load ---
    useEffect(() => {
        // Fetch main data and filter options on initial component mount
        logStep({
            action: AuditAction.DATA_VIEW,
            description: `User ${username} viewed UAR Progress Page`,
            location: "UarProgressPage.useEffect[]"
        });
        fetchDashboardData();
        fetchFilterOptions();
    }, [fetchDashboardData, fetchFilterOptions, username]);

    // --- NEW: Data Transformation (API format -> Chart format) ---
    const { kpiCards, divisionChartData, applicationChartData } = useMemo(() => {
        // 1. Transform KPI Stats
        const kpiCards = {
            review: kpiStats?.reviewed.percentage.toFixed(1) ?? '0',
            approved: kpiStats?.divApproved.percentage.toFixed(1) ?? '0',
            soApproved: kpiStats?.soApproved.percentage.toFixed(1) ?? '0',
            completed: kpiStats?.completed.percentage.toFixed(1) ?? '0',
        };

        // 2. Transform Division Chart Data
        const divisionChartData = rawDivisionData.map((d: DivisionChartItem) => ({
            label: d.divisionName,
            review: (d.reviewedCount / d.total * 100) || 0,
            approved: (d.divApprovedCount / d.total * 100) || 0,
            soApproved: (d.soApprovedCount / d.total * 100) || 0,
            total: (d.completedCount / d.total * 100) || 0, // Using 'completed' for 'total' bar
        }));

        // 3. Transform Application Chart Data
        const applicationChartData = rawAppData.map((d: ApplicationChartItem) => ({
            label: d.applicationName,
            review: (d.reviewedCount / d.total * 100) || 0,
            approved: (d.divApprovedCount / d.total * 100) || 0,
            soApproved: (d.soApprovedCount / d.total * 100) || 0,
            total: (d.completedCount / d.total * 100) || 0,
        }));

        return { kpiCards, divisionChartData, applicationChartData };
    }, [kpiStats, rawDivisionData, rawAppData]);


    // --- FIX: Filter Dropdown Options (Simple Mappers to string[]) ---
    const periodOptions = useMemo(() => filterOptions.periods, [filterOptions.periods]);
    const divisionOptions = useMemo(() => filterOptions.divisions.map(d => d.name), [filterOptions.divisions]);
    const departmentOptions = useMemo(() => filterOptions.departments.map(d => d.name), [filterOptions.departments]);
    const applicationOptions = useMemo(() => filterOptions.applications.map(a => a.name), [filterOptions.applications]);

    // --- FIX: Create specific handlers for each filter ---
    const handlePeriodFilterChange = (label: string | null) => {
        const value = label || undefined;
        setFilters({ period: value });
        logStep({
            action: AuditAction.DATA_FILTER,
            description: `Filter Period set to "${value || '(cleared)'}"`,
            location: "UarProgressPage.handlePeriodFilterChange",
            extra: { period: value || null },
        });
    };

    const handleDivisionFilterChange = (label: string | null) => {
        const selectedDivision = filterOptions.divisions.find(d => d.name === label);
        setFilters({ divisionId: selectedDivision?.id });
        logStep({
            action: AuditAction.DATA_FILTER,
            description: `Filter Division set to "${label || '(cleared)'}"`,
            location: "UarProgressPage.handleDivisionFilterChange",
            extra: { division: label || null, divisionId: selectedDivision?.id || null },
        });
    };

    const handleDepartmentFilterChange = (label: string | null) => {
        const selectedDept = filterOptions.departments.find(d => d.name === label);
        setFilters({ departmentId: selectedDept?.id });
        logStep({
            action: AuditAction.DATA_FILTER,
            description: `Filter Department set to "${label || '(cleared)'}"`,
            location: "UarProgressPage.handleDepartmentFilterChange",
            extra: { department: label || null, departmentId: selectedDept?.id || null },
        });
    };

    const handleApplicationFilterChange = (label: string | null) => {
        const selectedApp = filterOptions.applications.find(a => a.name === label);
        setFilters({ applicationId: selectedApp?.id });
        logStep({
            action: AuditAction.DATA_FILTER,
            description: `Filter System set to "${label || '(cleared)'}"`,
            location: "UarProgressPage.handleApplicationFilterChange",
            extra: { system: label || null, applicationId: selectedApp?.id || null },
        });
    };

    const [departmentChartData, setDepartmentChartData] = useState<ChartDataFormat[]>([]); // Local state for now

    const handleDivisionBarClick = (divisionLabel: string) => {
        const division = filterOptions.divisions.find(d => d.name === divisionLabel);
        if (!division) return;

        setDrilldownDivision(divisionLabel);

        // This will trigger the API call in the store
        setFilters({ divisionId: division.id, departmentId: undefined, applicationId: undefined });

        // TODO: This needs a dedicated API endpoint
        // For now, we clear it.
        setDepartmentChartData([]);

        logStep({
            action: AuditAction.DATA_FILTER,
            description: `Drilldown to Division "${divisionLabel}" via bar click`,
            location: "UarProgressPage.handleDivisionBarClick",
            extra: { division: divisionLabel },
        });
    };

    const handleDepartmentBarClick = (departmentLabel: string) => {
        const department = filterOptions.departments.find(d => d.name === departmentLabel);
        const departmentId = filters.departmentId === department?.id ? undefined : department?.id;

        setFilters({ departmentId }); // This will refetch data

        logStep({
            action: AuditAction.DATA_FILTER,
            description: `Toggle Department selection to "${departmentLabel || '(cleared)'}" via bar click`,
            location: "UarProgressPage.handleDepartmentBarClick",
            extra: { department: departmentLabel || null },
        });
    };

    const handleBackToDivisionView = () => {
        setDrilldownDivision(null);
        // Clear all filters
        setFilters({ divisionId: undefined, departmentId: undefined, applicationId: undefined });
        logStep({
            action: AuditAction.DATA_FILTER,
            description: "Back to Division view (clear drilldown + filters)",
            location: "UarProgressPage.handleBackToDivisionView",
        });
    };

    // --- Chart Titles (Unchanged) ---
    const mainChartTitle = drilldownDivision
        ? `UAR Progress by Department (Division: ${drilldownDivision})`
        : 'UAR Progress by Division';

    const systemChartTitle = useMemo(() => {
        let title = 'UAR Progress by System Apps';
        const selectedDept = filterOptions.departments.find(d => d.id === filters.departmentId);
        const selectedDiv = filterOptions.divisions.find(d => d.id === filters.divisionId);

        if (selectedDept) {
            return `${title} (Department: ${selectedDept.name})`;
        }
        if (selectedDiv && !drilldownDivision) {
            return `${title} (Division: ${selectedDiv.name})`;
        }
        return `${title} (All)`;
    }, [filters, drilldownDivision, filterOptions]);

    const isDrilledDown = !!drilldownDivision;
    const selectedPeriodLabel = filters.period || "";
    const selectedDivisionLabel = filterOptions.divisions.find(d => d.id === filters.divisionId)?.name || "";
    const selectedDepartmentLabel = filterOptions.departments.find(d => d.id === filters.departmentId)?.name || "";
    const selectedApplicationLabel = filterOptions.applications.find(a => a.id === filters.applicationId)?.name || "";

    // --- NEW: Loading and Error Handling ---
    if (isLoading && !kpiStats) {
        return (
            <ErrorBoundary>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <SkeletonLoader type="text" className="w-48" />
                        <div className="flex gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <SkeletonLoader key={i} type="text" className="w-32" />
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <SkeletonLoader key={i} type="card" />
                        ))}
                    </div>
                    <SkeletonLoader type="chart" />
                    <SkeletonLoader type="chart" />
                </div>
            </ErrorBoundary>
        );
    }

    if (error) {
        return (
            <ErrorBoundary>
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900">Failed to load data</h3>
                        <p className="text-sm text-gray-500 mt-2">{error}</p>
                        <button
                            onClick={() => {
                                fetchDashboardData();
                                fetchFilterOptions();
                            }}
                            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </ErrorBoundary>
        );
    }

    // --- Render JSX ---
    return (
        <ErrorBoundary>
            <div className="space-y-6">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">UAR Progress</h2>
                    </div>
                    <div className="flex gap-4 flex-wrap">
                        <SearchableDropdown
                            label="Period"
                            value={selectedPeriodLabel}
                            onChange={(val) => handlePeriodFilterChange(val as string)}
                            options={periodOptions}
                        />
                        <SearchableDropdown
                            label="Division"
                            value={selectedDivisionLabel}
                            onChange={(val) => handleDivisionFilterChange(val as string)}
                            options={divisionOptions}
                        />
                        <SearchableDropdown
                            label="Department"
                            value={selectedDepartmentLabel}
                            onChange={(val) => handleDepartmentFilterChange(val as string)}
                            options={departmentOptions}
                        />
                        <SearchableDropdown
                            label="System"
                            value={selectedApplicationLabel}
                            onChange={(val) => handleApplicationFilterChange(val as string)}
                            options={applicationOptions}
                        />
                    </div>
                </div>

                {isLoading && (
                    <div className="absolute top-4 right-4 z-50">
                        <div className="bg-white rounded-lg shadow-lg p-3 flex items-center">
                            <LoadingSpinner size="sm" color="blue" className="mr-2" />
                            <span className="text-sm text-gray-600">Updating...</span>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard icon={<UarReviewIcon />} value={`${kpiCards.review}%`} label="UAR Review" />
                    <StatCard icon={<DivisionApprovedIcon />} value={`${kpiCards.approved}%`} label="Division Approved" />
                    <StatCard icon={<SoApprovedIcon />} value={`${kpiCards.soApproved}%`} label="SO Approved" />
                    <StatCard icon={<CompletedIcon />} value={`${kpiCards.completed}%`} label="Completed" />
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h3
                            className={`text-2xl font-bold text-gray-800 ${isDrilledDown ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
                            onClick={isDrilledDown ? handleBackToDivisionView : undefined}
                            aria-label={isDrilledDown ? "Back to Division View" : mainChartTitle}
                            role="button"
                        >
                            {mainChartTitle}
                        </h3>
                    </div>
                    <div className="relative p-6 pt-0">
                        <div className="overflow-x-auto">
                            <div className="min-w-max">
                                {isDrilledDown ? (
                                    <UarProgressChart
                                        data={departmentChartData} // This needs a real data source
                                        selectedItem={selectedDepartmentLabel}
                                        onBarClick={handleDepartmentBarClick}
                                    />
                                ) : (
                                    <UarProgressChart
                                        data={divisionChartData}
                                        selectedItem={selectedDivisionLabel}
                                        onBarClick={handleDivisionBarClick}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="text-2xl font-bold text-gray-800">
                            {systemChartTitle}
                        </h3>
                    </div>
                    <div className="relative p-6 pt-0">
                        <div className="overflow-x-auto">
                            <div className="min-w-max">
                                <UarProgressChart
                                    data={applicationChartData}
                                    selectedItem={filterOptions.applications.find(a => a.id === filters.applicationId)?.name || ''}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
});


// Wrapper component with API integration ready

export default UarProgressPage;