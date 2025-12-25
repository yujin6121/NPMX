import React from 'react';
import { 
    Activity, 
    Download, 
    XCircle, 
    AlertCircle, 
    Globe 
} from 'lucide-react';
import translations from './translations';

const ActivityLog = ({
    theme,
    language,
    activityStats,
    activityFilter,
    handleActivityFilterChange,
    loadActivityStats,
    handleActivitySearch,
    setActivityFilter,
    loadActivityLogs,
    activityLogs,
    activityLoading,
    renderActivityText,
    handleExportActivityLogs
}) => {
    const t = translations[language];

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <h2 className={`text-2xl font-semibold flex items-center gap-2 ${theme.text}`}>
                    <Activity className="w-6 h-6 text-blue-600" />
                    {t.activityLog}
                </h2>
                <button
                    onClick={handleExportActivityLogs}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                    <Download className="w-4 h-4" />
                    {t.exportCsv}
                </button>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className={`${theme.card} rounded-xl p-6 border shadow-sm`}>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className={`text-sm ${theme.textSecondary} mb-1`}>{t.totalRequests}</p>
                            <p className={`text-3xl font-bold ${theme.text}`}>
                                {activityStats ? activityStats.total : '-'}
                            </p>
                        </div>
                        <Activity className="w-10 h-10 text-blue-600 opacity-20" />
                    </div>
                </div>

                <div className={`${theme.card} rounded-xl p-6 border border-red-200 shadow-sm`}>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className={`text-sm ${theme.textSecondary} mb-1`}>{t.errors}</p>
                            <p className="text-3xl font-bold text-red-600">
                                {activityStats ? activityStats.errors : '-'}
                            </p>
                        </div>
                        <XCircle className="w-10 h-10 text-red-600 opacity-20" />
                    </div>
                </div>

                <div className={`${theme.card} rounded-xl p-6 border border-yellow-200 shadow-sm`}>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className={`text-sm ${theme.textSecondary} mb-1`}>{t.errorRate}</p>
                            <p className="text-3xl font-bold text-yellow-600">
                                {activityStats ? `${activityStats.errorRate}%` : '-'}
                            </p>
                        </div>
                        <AlertCircle className="w-10 h-10 text-yellow-600 opacity-20" />
                    </div>
                </div>

                <div className={`${theme.card} rounded-xl p-6 border border-purple-200 shadow-sm`}>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className={`text-sm ${theme.textSecondary} mb-1`}>{t.uniqueIps}</p>
                            <p className="text-3xl font-bold text-purple-600">
                                {activityStats ? activityStats.uniqueIPs : '-'}
                            </p>
                        </div>
                        <Globe className="w-10 h-10 text-purple-600 opacity-20" />
                    </div>
                </div>
            </div>

            {/* 필터 섹션 */}
            <div className={`${theme.card} rounded-xl p-6 border shadow-sm`}>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 검색 */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${theme.text}`}>
                                {t.search}
                            </label>
                            <input
                                type="text"
                                placeholder={t.searchPlaceholder}
                                value={activityFilter.search}
                                onChange={(e) => handleActivityFilterChange('search', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg ${theme.input} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            />
                        </div>

                        {/* 기간 선택 */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${theme.text}`}>
                                {t.period}
                            </label>
                            <select
                                value={activityFilter.period}
                                onChange={(e) => {
                                    handleActivityFilterChange('period', e.target.value);
                                    loadActivityStats(e.target.value);
                                }}
                                className={`w-full px-3 py-2 border rounded-lg ${theme.input} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            >
                                <option value="1h">{t.last1Hour}</option>
                                <option value="24h">{t.last24Hours}</option>
                                <option value="7d">{t.last7Days}</option>
                                <option value="30d">{t.last30Days}</option>
                            </select>
                        </div>

                        {/* 시작 날짜 */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${theme.text}`}>
                                {t.startDate}
                            </label>
                            <input
                                type="date"
                                value={activityFilter.startDate}
                                onChange={(e) => handleActivityFilterChange('startDate', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg ${theme.input} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            />
                        </div>

                        {/* 종료 날짜 */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${theme.text}`}>
                                {t.endDate}
                            </label>
                            <input
                                type="date"
                                value={activityFilter.endDate}
                                onChange={(e) => handleActivityFilterChange('endDate', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg ${theme.input} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            />
                        </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleActivitySearch}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            {t.search}
                        </button>
                        <button
                            onClick={() => {
                                setActivityFilter({
                                    search: '',
                                    action: '',
                                    startDate: '',
                                    endDate: '',
                                    period: '24h'
                                });
                                loadActivityLogs();
                                loadActivityStats('24h');
                            }}
                            className={`px-4 py-2 border rounded-lg ${theme.input} hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors`}
                        >
                            {t.reset}
                        </button>
                    </div>
                </div>
            </div>

            {/* 로그 테이블 */}
            <div className={`${theme.card} rounded-xl border shadow-sm overflow-hidden`}>
                <div className={`${theme.tableHeader} px-6 py-4 flex items-center justify-between`}>
                    <p className={`text-sm font-semibold ${theme.text}`}>
                        {t.activityHistory} ({activityLogs.length}건)
                    </p>
                    <button
                        onClick={() => loadActivityLogs(activityFilter)}
                        className="text-xs px-3 py-1 rounded border hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        {t.refresh}
                    </button>
                </div>

                <div className="overflow-x-auto">
                    {activityLoading ? (
                        <div className="flex justify-center items-center p-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : activityLogs && activityLogs.length > 0 ? (
                        <table className="w-full">
                            <thead className={theme.tableHeader}>
                                <tr>
                                    <th className={`px-6 py-3 text-left text-xs font-semibold ${theme.text}`}>{t.time}</th>
                                    <th className={`px-6 py-3 text-left text-xs font-semibold ${theme.text}`}>{t.action}</th>
                                    <th className={`px-6 py-3 text-left text-xs font-semibold ${theme.text}`}>{t.details}</th>
                                    <th className={`px-6 py-3 text-left text-xs font-semibold ${theme.text}`}>IP</th>
                                    <th className={`px-6 py-3 text-left text-xs font-semibold ${theme.text}`}>User Agent</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${theme.divider}`}>
                                {activityLogs.map((item) => (
                                    <tr key={item.id} className={`transition-colors ${theme.cardHover}`}>
                                        <td className={`px-6 py-4 text-sm ${theme.textSecondary} whitespace-nowrap`}>
                                            {new Date(item.created_on).toLocaleString()}
                                        </td>
                                        <td className={`px-6 py-4 text-sm font-medium`}>
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                {item.action}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-sm ${theme.textSecondary} max-w-md truncate`}>
                                            {renderActivityText(item)}
                                        </td>
                                        <td className={`px-6 py-4 text-sm font-mono ${theme.textSecondary}`}>
                                            {item.ip || '-'}
                                        </td>
                                        <td className={`px-6 py-4 text-sm ${theme.textSecondary} max-w-xs truncate`} title={item.user_agent}>
                                            {item.user_agent || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className={`px-6 py-12 text-center ${theme.textSecondary}`}>
                            <p>{t.noActivityLogs}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityLog;
