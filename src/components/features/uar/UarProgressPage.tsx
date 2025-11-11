import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ChevronDownIcon } from '../../icons/ChevronDownIcon';
import { UarReviewIcon } from '../../icons/UarReviewIcon';
import { DivisionApprovedIcon } from '../../icons/DivisionApprovedIcon';
import { SoApprovedIcon } from '../../icons/SoApprovedIcon';
import { CompletedIcon } from '../../icons/CompletedIcon';
import { uarDivisionProgress, uarDepartmentProgress, uarSystemProgressData } from '../../../../data';
import type { UarProgressData } from '../../../../data';
import { useUarProgressData } from '../../../hooks/useUarProgressData';
import { UarProgressFilters } from '../../../services/uarProgressService';
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

const UarProgressChart: React.FC<{ data: UarProgressData[]; selectedItem: string; yAxisRange?: { min: number, max: number }, onBarClick?: (label: string) => void; }> = React.memo(({ data, selectedItem, yAxisRange, onBarClick }) => {
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
    // Zustand store hooks
    const { filters } = useUarProgressFilters();
    const {
        selectedPeriod,
        selectedDivisionFilter,
        selectedDepartmentFilter,
        selectedSystemFilter,
        drilldownDivision,
        setSelectedPeriod,
        setSelectedDivisionFilter,
        setSelectedDepartmentFilter,
        setSelectedSystemFilter,
        setDrilldownDivision
    } = useUarProgressUIState();
    // ==== logging setup ====
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
        // postLogMonitoringApi({
        //     userId: username,
        //     module: MODULE,
        //     action: p.action,
        //     status: p.status ?? "Success",
        //     description: p.description,
        //     location: p.location,
        //     timestamp: new Date().toISOString(),
        //     ...(p.extra ? { extra: p.extra } : {}),
        // }).catch(() => { });
    };
    const { setProgressData, setFilteredData } = useUarProgressActions();
    const {
        getDivisionOptions,
        getDivisionChartData,
        getDepartmentOptions,
        getSystemOptions,
        getDepartmentChartData,
        getSystemChartData,
        getGrandTotal
    } = useUarProgressComputed();

    // Get computed values from store with memoization
    const divisionOptions = useMemo(() => getDivisionOptions(), []);
    const divisionChartData = useMemo(() => getDivisionChartData(), []);
    const departmentOptions = useMemo(() => getDepartmentOptions(), [selectedDivisionFilter]);
    const systemOptions = useMemo(() => getSystemOptions(), [selectedDivisionFilter, selectedDepartmentFilter]);
    const departmentChartData = useMemo(() => getDepartmentChartData(), [drilldownDivision]);
    const systemChartData = useMemo(() => getSystemChartData(), [selectedDivisionFilter, selectedDepartmentFilter]);
    const grandTotal = useMemo(() => getGrandTotal(), []);

    const systemAppsChartData = useMemo(() => {
        let filteredData = systemChartData;

        if (selectedSystemFilter) {
            filteredData = filteredData.filter(app => app.label === selectedSystemFilter);
        }

        return filteredData;
    }, [systemChartData, selectedSystemFilter]);

    const handleDivisionBarClick = (divisionLabel: string) => {
        setDrilldownDivision(divisionLabel);
        setSelectedDivisionFilter(divisionLabel);
        setSelectedDepartmentFilter('');
        setSelectedSystemFilter('');
        logStep({
            action: AuditAction.DATA_FILTER,
            description: `Drilldown to Division "${divisionLabel}" via bar click`,
            location: "UarProgressPage.handleDivisionBarClick",
            extra: { division: divisionLabel },
        });
    };

    const handleDepartmentBarClick = (departmentLabel: string) => {
        setSelectedDepartmentFilter(selectedDepartmentFilter === departmentLabel ? '' : departmentLabel);
        const next = selectedDepartmentFilter === departmentLabel ? '' : departmentLabel;
        setSelectedDepartmentFilter(next);
        logStep({
            action: AuditAction.DATA_FILTER,
            description: `Toggle Department selection to "${next || '(cleared)'}" via bar click`,
            location: "UarProgressPage.handleDepartmentBarClick",
            extra: { department: next || null },
        });

    };

    const handleBackToDivisionView = () => {
        setDrilldownDivision(null);
        setSelectedDivisionFilter('');
        setSelectedDepartmentFilter('');
        setSelectedSystemFilter('');
        logStep({
            action: AuditAction.DATA_FILTER,
            description: "Back to Division view (clear drilldown + filters)",
            location: "UarProgressPage.handleBackToDivisionView",
        });

    };

    const handleDivisionFilterChange = (value: string) => {
        setSelectedDivisionFilter(value);
        // Don't set drilldownDivision here - only highlight the selected division
        // Drilldown only happens when clicking the bar
        if (!value) {
            // If clearing the filter and we're drilled down, go back to division view
            setDrilldownDivision(null);
        }
        setSelectedDepartmentFilter('');
        setSelectedSystemFilter(''); logStep({
            action: AuditAction.DATA_FILTER,
            description: `Filter Division set to "${value || '(cleared)'}"`,
            location: "UarProgressPage.handleDivisionFilterChange",
            extra: { division: value || null },
        });

    };

    const handleDepartmentFilterChange = (value: string) => {
        setSelectedDepartmentFilter(value);
        setSelectedSystemFilter(''); // Reset system filter when department changes
        logStep({
            action: AuditAction.DATA_FILTER,
            description: `Filter Department set to "${value || '(cleared)'}"`,
            location: "UarProgressPage.handleDepartmentFilterChange",
            extra: { department: value || null },
        });
    };

    const handlePeriodFilterChange = (value: string) => {
        setSelectedPeriod(value);
        logStep({
            action: AuditAction.DATA_FILTER,
            description: `Filter Period set to "${value || '(cleared)'}"`,
            location: "UarProgressPage.handlePeriodFilterChange",
            extra: { period: value || null },
        });
    };

    const handleSystemFilterChange = (value: string) => {
        setSelectedSystemFilter(value);
        logStep({
            action: AuditAction.DATA_FILTER,
            description: `Filter System set to "${value || '(cleared)'}"`,
            location: "UarProgressPage.handleSystemFilterChange",
            extra: { system: value || null },
        });
    };




    const mainChartTitle = drilldownDivision
        ? `UAR Progress by Department (Division: ${drilldownDivision})`
        : 'UAR Progress by Division';

    const systemChartTitle = useMemo(() => {
        let title = 'UAR Progress by System Apps';
        if (selectedDepartmentFilter) {
            return `${title} (Department: ${selectedDepartmentFilter})`;
        }
        if (selectedDivisionFilter && !drilldownDivision) {
            // When a division filter is selected without drilldown, show the division in subtitle
            return `${title} (Division: ${selectedDivisionFilter})`;
        }
        if (drilldownDivision) {
            // When drilled down to department view, context is clear from Department chart
            return title;
        }
        return `${title} (All)`;
    }, [selectedDivisionFilter, drilldownDivision, selectedDepartmentFilter]);

    const isDrilledDown = !!drilldownDivision;

    // Use grand total from store
    const grandTotalStats = grandTotal;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">UAR Progress</h2>
                </div>
                <div className="flex gap-4 flex-wrap">
                    <SearchableDropdown
                        label="Period"
                        value={selectedPeriod}
                        onChange={handlePeriodFilterChange}
                        options={['07-2025']}
                    />
                    <SearchableDropdown
                        label="Division"
                        value={selectedDivisionFilter}
                        onChange={handleDivisionFilterChange}
                        options={divisionOptions}
                    />
                    <SearchableDropdown
                        label="Department"
                        value={selectedDepartmentFilter}
                        onChange={handleDepartmentFilterChange}
                        options={departmentOptions}
                    />
                    <SearchableDropdown
                        label="System"
                        value={selectedSystemFilter}
                        onChange={handleSystemFilterChange}
                        options={systemOptions}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={<UarReviewIcon />} value={`${grandTotalStats.review}%`} label="UAR Review" />
                <StatCard icon={<DivisionApprovedIcon />} value={`${grandTotalStats.approved}%`} label="Division Approved" />
                <StatCard icon={<SoApprovedIcon />} value={`${grandTotalStats.soApproved}%`} label="SO Approved" />
                <StatCard icon={<CompletedIcon />} value={`${grandTotalStats.completed}%`} label="Completed" />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Fixed Header */}
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

                {/* Chart Container */}
                <div className="relative p-6 pt-0">
                    <div className="overflow-x-auto">
                        <div className="min-w-max">
                            {isDrilledDown ? (
                                <UarProgressChart
                                    data={departmentChartData}
                                    selectedItem={selectedDepartmentFilter}
                                    onBarClick={handleDepartmentBarClick}
                                />
                            ) : (
                                <UarProgressChart
                                    data={divisionChartData}
                                    selectedItem={selectedDivisionFilter}
                                    onBarClick={handleDivisionBarClick}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Fixed Header */}
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-2xl font-bold text-gray-800">
                        {systemChartTitle}
                    </h3>
                </div>

                {/* Chart Container */}
                <div className="relative p-6 pt-0">
                    <div className="overflow-x-auto">
                        <div className="min-w-max">
                            <UarProgressChart data={systemAppsChartData} selectedItem={selectedSystemFilter} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

// Wrapper component with API integration ready
const UarProgressPageWithAPI: React.FC = React.memo(() => {
    // Zustand store hooks
    const { filters, setFilters } = useUarProgressFilters();
    const { setProgressData, setLoading, setError, setIsRefreshing } = useUarProgressActions();
    const { loading, error, isRefreshing } = useUarProgressLoading();

    const {
        data: apiData,
        loading: apiLoading,
        error: apiError,
        refresh,
        isRefreshing: apiIsRefreshing
    } = useUarProgressData(filters, {
        autoRefresh: true,
        refreshInterval: 30000, // 30 seconds
        enableCache: true,
    });

    // Sync API data with Zustand store
    useEffect(() => {
        if (apiData) {
            setProgressData(apiData);
        }
    }, [apiData, setProgressData]);

    useEffect(() => {
        setLoading(apiLoading);
    }, [apiLoading, setLoading]);

    useEffect(() => {
        setError(apiError);
    }, [apiError, setError]);

    useEffect(() => {
        setIsRefreshing(apiIsRefreshing);
    }, [apiIsRefreshing, setIsRefreshing]);

    // Debounced filter updates for better performance
    const debouncedSetFilters = useMemo(
        () => debounce((newFilters: UarProgressFilters) => {
            setFilters(newFilters);
        }, 300),
        [setFilters]
    );

    // Performance monitoring
    useEffect(() => {
        const stopTiming = performanceMonitor.startTiming('UarProgressPage');
        return stopTiming;
    }, []);

    if (loading && !apiData) {
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
                        <div className="flex items-center mb-4">
                            <div className="flex-shrink-0">
                                <svg
                                    className="h-8 w-8 text-red-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
                                    />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Failed to load data
                                </h3>
                            </div>
                        </div>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500">
                                {error}
                            </p>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={refresh}
                                disabled={isRefreshing}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                {isRefreshing ? (
                                    <div className="flex items-center">
                                        <LoadingSpinner size="sm" color="white" className="mr-2" />
                                        Retrying...
                                    </div>
                                ) : (
                                    'Retry'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </ErrorBoundary>
        );
    }

    // For now, use the original component with mock data
    // TODO: Replace with API data when ready
    return (
        <ErrorBoundary>
            <div className="relative">
                {isRefreshing && (
                    <div className="absolute top-4 right-4 z-50">
                        <div className="bg-white rounded-lg shadow-lg p-3 flex items-center">
                            <LoadingSpinner size="sm" color="blue" className="mr-2" />
                            <span className="text-sm text-gray-600">Updating...</span>
                        </div>
                    </div>
                )}
                <UarProgressPage />
            </div>
        </ErrorBoundary>
    );
});

export default UarProgressPageWithAPI;