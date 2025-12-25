import React from 'react';
import { 
    Activity, 
    Globe, 
    CheckCircle, 
    Shield, 
    Cpu, 
    Zap, 
    HardDrive 
} from 'lucide-react';

const Dashboard = ({ 
    theme, 
    proxyHosts, 
    systemInfo, 
    logs, 
    activityLogs, 
    loadActivityLogs, 
    renderActivityText,
    activityLoading,
    t
}) => {
    return (
        <>
            <div className="mb-12">
                <h2 className={`text-2xl font-semibold flex items-center gap-2 mb-6 ${theme.text}`}>
                    <Activity className="w-6 h-6 text-blue-600" />
                    {t.dashboard}
                </h2>
                {/* 통계 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className={`${theme.card} rounded-xl p-6 border shadow-sm`}>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className={`text-sm ${theme.textSecondary} mb-1`}>{t.totalProxy}</p>
                                <p className={`text-3xl font-bold ${theme.text}`}>{proxyHosts.length}</p>
                            </div>
                            <Globe className="w-10 h-10 text-blue-600 opacity-20" />
                        </div>
                    </div>

                    <div className={`${theme.card} rounded-xl p-6 border border-green-200 shadow-sm`}>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className={`text-sm ${theme.textSecondary} mb-1`}>{t.activeHosts}</p>
                                <p className="text-3xl font-bold text-green-600">{proxyHosts.filter(h => h.enabled).length}</p>
                            </div>
                            <CheckCircle className="w-10 h-10 text-green-600 opacity-20" />
                        </div>
                    </div>

                    <div className={`${theme.card} rounded-xl p-6 border border-blue-200 shadow-sm`}>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className={`text-sm ${theme.textSecondary} mb-1`}>{t.sslEnabled}</p>
                                <p className="text-3xl font-bold text-blue-600">{proxyHosts.filter(h => h.certificate_id > 0).length}</p>
                            </div>
                            <Shield className="w-10 h-10 text-blue-600 opacity-20" />
                        </div>
                    </div>

                    <div className={`${theme.card} rounded-xl p-6 border border-purple-200 shadow-sm`}>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className={`text-sm ${theme.textSecondary} mb-1`}>{t.totalRequests}</p>
                                <p className="text-3xl font-bold text-purple-600">0</p>
                            </div>
                            <Activity className="w-10 h-10 text-purple-600 opacity-20" />
                        </div>
                    </div>
                </div>

                {/* 시스템 리소스 모니터링 */}
                <div className="mb-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* CPU */}
                        <div className={`${theme.card} rounded-xl p-6 border shadow-sm`}>
                            <div className="flex items-center gap-3 mb-4">
                                <Cpu className="w-5 h-5 text-orange-600" />
                                <p className={`text-sm font-semibold ${theme.text}`}>{t.cpu}</p>
                            </div>
                            {systemInfo?.cpu ? (
                                <div>
                                    <p className={`text-3xl font-bold mb-2 ${theme.text}`}>{systemInfo.cpu.usage}%</p>
                                    <div className="w-full bg-gray-300 dark:bg-slate-600 rounded-full h-2 mb-2">
                                        <div
                                            className={`h-2 rounded-full transition-all ${
                                                systemInfo.cpu.usage > 80 ? 'bg-red-600' :
                                                systemInfo.cpu.usage > 50 ? 'bg-yellow-600' :
                                                'bg-green-600'
                                            }`}
                                            style={{ width: `${systemInfo.cpu.usage}%` }}
                                        />
                                    </div>
                                    <p className={`text-xs ${theme.textSecondary}`}>{systemInfo.cpu.cores} cores</p>
                                </div>
                            ) : (
                                <p className={`text-sm ${theme.textSecondary}`}>{t.loading}</p>
                            )}
                        </div>

                        {/* 메모리 */}
                        <div className={`${theme.card} rounded-xl p-6 border shadow-sm`}>
                            <div className="flex items-center gap-3 mb-4">
                                <Zap className="w-5 h-5 text-blue-600" />
                                <p className={`text-sm font-semibold ${theme.text}`}>{t.memory}</p>
                            </div>
                            {systemInfo?.memory ? (
                                <div>
                                    <p className={`text-3xl font-bold mb-2 ${theme.text}`}>{systemInfo.memory.percentage}%</p>
                                    <div className="w-full bg-gray-300 dark:bg-slate-600 rounded-full h-2 mb-2">
                                        <div
                                            className={`h-2 rounded-full transition-all ${
                                                parseFloat(systemInfo.memory.percentage) > 80 ? 'bg-red-600' :
                                                parseFloat(systemInfo.memory.percentage) > 50 ? 'bg-yellow-600' :
                                                'bg-green-600'
                                            }`}
                                            style={{ width: `${systemInfo.memory.percentage}%` }}
                                        />
                                    </div>
                                    <p className={`text-xs ${theme.textSecondary}`}>
                                        {(systemInfo.memory.used / 1024 / 1024 / 1024).toFixed(2)}GB / {(systemInfo.memory.total / 1024 / 1024 / 1024).toFixed(2)}GB
                                    </p>
                                </div>
                            ) : (
                                <p className={`text-sm ${theme.textSecondary}`}>{t.loading}</p>
                            )}
                        </div>

                        {/* 디스크 */}
                        <div className={`${theme.card} rounded-xl p-6 border shadow-sm`}>
                            <div className="flex items-center gap-3 mb-4">
                                <HardDrive className="w-5 h-5 text-purple-600" />
                                <p className={`text-sm font-semibold ${theme.text}`}>{t.disk}</p>
                            </div>
                            {systemInfo?.disk ? (
                                <div>
                                    <p className={`text-3xl font-bold mb-2 ${theme.text}`}>{systemInfo.disk.percentage}%</p>
                                    <div className="w-full bg-gray-300 dark:bg-slate-600 rounded-full h-2 mb-2">
                                        <div
                                            className={`h-2 rounded-full transition-all ${
                                                parseFloat(systemInfo.disk.percentage) > 80 ? 'bg-red-600' :
                                                parseFloat(systemInfo.disk.percentage) > 50 ? 'bg-yellow-600' :
                                                'bg-green-600'
                                            }`}
                                            style={{ width: `${systemInfo.disk.percentage}%` }}
                                        />
                                    </div>
                                    <p className={`text-xs ${theme.textSecondary}`}>
                                        {(systemInfo.disk.used / 1024 / 1024 / 1024).toFixed(2)}GB / {(systemInfo.disk.total / 1024 / 1024 / 1024).toFixed(2)}GB
                                    </p>
                                </div>
                            ) : (
                                <p className={`text-sm ${theme.textSecondary}`}>{t.loading}</p>
                            )}
                        </div>

                        {/* 시스템 정보 */}
                        <div className={`${theme.card} rounded-xl p-6 border shadow-sm`}>
                            <div className="flex items-center gap-3 mb-4">
                                <Activity className="w-5 h-5 text-green-600" />
                                <p className={`text-sm font-semibold ${theme.text}`}>{t.system}</p>
                            </div>
                            {systemInfo?.system ? (
                                <div className="space-y-2">
                                    <div>
                                        <p className={`text-xs ${theme.textSecondary}`}>{t.uptime}</p>
                                        <p className={`text-sm font-semibold ${theme.text}`}>{systemInfo.system.uptimeString}</p>
                                    </div>
                                    <div>
                                        <p className={`text-xs ${theme.textSecondary}`}>{t.hostname}</p>
                                        <p className={`text-sm font-semibold ${theme.text}`}>{systemInfo.system.hostname}</p>
                                    </div>
                                    <div>
                                        <p className={`text-xs ${theme.textSecondary}`}>{t.platform}</p>
                                        <p className={`text-sm font-semibold ${theme.text}`}>{systemInfo.system.platform} ({systemInfo.system.arch})</p>
                                    </div>
                                </div>
                            ) : (
                                <p className={`text-sm ${theme.textSecondary}`}>{t.loading}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* 로그 섹션 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 프록시 접속 로그 */}
                    <div className={`${theme.card} rounded-lg border overflow-hidden`}>
                        <div className={`${theme.tableHeader} px-6 py-4`}>
                            <p className={`text-sm font-semibold ${theme.text}`}>{t.proxyAccessLog}</p>
                        </div>
                        <div className="divide-y divide-gray-200 dark:divide-slate-700">
                            {logs && logs.length > 0 ? (
                                logs.slice(0, 20).map((log, idx) => (
                                    <div key={idx} className={`px-6 py-3 text-sm ${theme.textSecondary} font-mono hover:${theme.card} transition-colors`}>
                                        <div className="flex items-center gap-4">
                                            <span className={`flex-shrink-0 ${log.status >= 200 && log.status < 300 ? 'text-green-600' : log.status >= 400 ? 'text-red-600' : 'text-yellow-600'}`}>
                                                [{log.status || '200'}]
                                            </span>
                                            <span className="flex-1 truncate">{log.path || 'GET /'}</span>
                                            <span className="flex-shrink-0 text-gray-400">{log.time || new Date().toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className={`px-6 py-8 text-center ${theme.textSecondary}`}>
                                    <p>{t.noLogs}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 활동 로그 */}
                    <div className={`${theme.card} rounded-lg border overflow-hidden`}>
                        <div className={`${theme.tableHeader} px-6 py-4 flex items-center justify-between`}>
                            <p className={`text-sm font-semibold ${theme.text}`}>{t.activityLog}</p>
                            <button onClick={loadActivityLogs} className="text-xs px-2 py-1 rounded border hover:bg-gray-100 dark:hover:bg-slate-700">{t.refresh}</button>
                        </div>
                        <div className="divide-y divide-gray-200 dark:divide-slate-700">
                            {activityLoading ? (
                                <div className="px-6 py-6 text-center">
                                    <span className="animate-pulse text-sm ${theme.textSecondary}">{t.loading}</span>
                                </div>
                            ) : activityLogs && activityLogs.length > 0 ? (
                                activityLogs.map((item) => (
                                    <div key={item.id} className={`px-6 py-3 text-sm ${theme.textSecondary} hover:${theme.card} transition-colors`}>
                                        <div className="flex items-center gap-3">
                                            <span className="text-blue-600">[{item.action}]</span>
                                            <span className="flex-1 truncate">
                                                {renderActivityText(item)}
                                            </span>
                                            <span className="flex-shrink-0 text-gray-400">{new Date(item.created_on).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className={`px-6 py-8 text-center ${theme.textSecondary}`}>
                                    <p>{t.noActivityLogs}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Dashboard;
