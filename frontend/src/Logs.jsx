import React from 'react';
import { BarChart3 } from 'lucide-react';

const Logs = ({
    theme,
    loadLogs,
    logFilters,
    handleLogFilterChange,
    setLogFilters,
    saveLogSettings,
    logSettingsSaving,
    logSettingsDraft,
    setLogSettingsDraft,
    logSettings,
    logEntries,
    logLoading,
    t
}) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className={`text-2xl font-semibold flex items-center gap-2 ${theme.text}`}>
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                    {t.realtimeTrafficLog}
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => loadLogs()}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                    >
                        {t.refreshNow}
                    </button>
                </div>
            </div>

            <div className={`${theme.card} rounded-xl border shadow-sm p-5 space-y-4`}>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div>
                        <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>{t.logType}</label>
                        <select
                            value={logFilters.type}
                            onChange={(e) => handleLogFilterChange('type', e.target.value)}
                            className={`w-full ${theme.input} border rounded-lg px-3 py-2 text-sm`}
                        >
                            <option value="access">{t.accessLog}</option>
                            <option value="error">{t.errorLog}</option>
                        </select>
                    </div>
                    <div>
                        <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>{t.host}</label>
                        <input
                            value={logFilters.host}
                            onChange={(e) => handleLogFilterChange('host', e.target.value)}
                            placeholder="example.com"
                            className={`w-full ${theme.input} border rounded-lg px-3 py-2 text-sm`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>{t.ip}</label>
                        <input
                            value={logFilters.ip}
                            onChange={(e) => handleLogFilterChange('ip', e.target.value)}
                            placeholder="203.0.113.1"
                            className={`w-full ${theme.input} border rounded-lg px-3 py-2 text-sm`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>{t.statusCode}</label>
                        <input
                            value={logFilters.status}
                            onChange={(e) => handleLogFilterChange('status', e.target.value)}
                            placeholder="200,301,403"
                            className={`w-full ${theme.input} border rounded-lg px-3 py-2 text-sm`}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>{t.searchKeyword}</label>
                        <input
                            value={logFilters.search}
                            onChange={(e) => handleLogFilterChange('search', e.target.value)}
                            placeholder={t.searchPlaceholder}
                            className={`w-full ${theme.input} border rounded-lg px-3 py-2 text-sm`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>{t.displayCount}</label>
                        <select
                            value={logFilters.limit}
                            onChange={(e) => handleLogFilterChange('limit', parseInt(e.target.value, 10))}
                            className={`w-full ${theme.input} border rounded-lg px-3 py-2 text-sm`}
                        >
                            {[100, 200, 500, 1000].map((n) => (
                                <option key={n} value={n}>{n}{t.items}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-3 mt-6">
                        <input
                            type="checkbox"
                            id="blockedOnly"
                            checked={logFilters.blocked}
                            onChange={(e) => handleLogFilterChange('blocked', e.target.checked)}
                            className="w-5 h-5"
                        />
                        <label htmlFor="blockedOnly" className={`${theme.text}`}>{t.errorBlockedOnly}</label>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        onClick={() => loadLogs()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
                    >
                        {t.applyFilter}
                    </button>
                    <button
                        onClick={() => setLogFilters({ type: 'access', search: '', host: '', ip: '', status: '', blocked: false, limit: 200 })}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border ${theme.input}`}
                    >
                        {t.reset}
                    </button>
                </div>
            </div>

            <div className={`${theme.card} rounded-xl border shadow-sm p-5 space-y-4`}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className={`font-semibold ${theme.text}`}>{t.excludeHighlightPatterns}</p>
                        <p className={`text-sm ${theme.textSecondary}`}>{t.regexHint}</p>
                    </div>
                    <button
                        onClick={saveLogSettings}
                        disabled={logSettingsSaving}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold ${logSettingsSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                    >
                        {logSettingsSaving ? t.saving : t.save}
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>{t.excludePatterns}</label>
                        <textarea
                            value={logSettingsDraft.excludePatterns}
                            onChange={(e) => setLogSettingsDraft((prev) => ({ ...prev, excludePatterns: e.target.value }))}
                            rows={5}
                            placeholder="(?i)healthcheck\n\.css$"
                            className={`w-full ${theme.input} border rounded-lg px-3 py-2 text-sm font-mono`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>{t.highlightPatterns}</label>
                        <textarea
                            value={logSettingsDraft.highlightPatterns}
                            onChange={(e) => setLogSettingsDraft((prev) => ({ ...prev, highlightPatterns: e.target.value }))}
                            rows={5}
                            placeholder="403\nWAF"
                            className={`w-full ${theme.input} border rounded-lg px-3 py-2 text-sm font-mono`}
                        />
                    </div>
                </div>
                {(logSettings.excludePatterns?.length || logSettings.highlightPatterns?.length) ? (
                    <div className="flex flex-wrap gap-2 text-xs">
                        {logSettings.excludePatterns?.map((p) => (
                            <span key={`ex-${p}`} className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">{t.excludePrefix} {p}</span>
                        ))}
                        {logSettings.highlightPatterns?.map((p) => (
                            <span key={`hi-${p}`} className="px-2 py-1 rounded bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-100">{t.highlightPrefix} {p}</span>
                        ))}
                    </div>
                ) : null}
            </div>

            <div className={`${theme.card} rounded-xl border shadow-sm overflow-hidden`}>
                <div className={`${theme.tableHeader} px-6 py-4 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                        <p className={`text-sm font-semibold ${theme.text}`}>{t.logsCount.replace('{count}', logEntries.length)}</p>
                        {logLoading && <span className={`text-xs ${theme.textSecondary}`}>{t.refreshing}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 rounded bg-red-100 text-red-700">{t.blockedError}</span>
                        <span className="px-2 py-1 rounded bg-amber-100 text-amber-800">{t.highlight}</span>
                    </div>
                </div>

                <div className="divide-y divide-gray-200 dark:divide-slate-800 max-h-[70vh] overflow-y-auto">
                    {logEntries.length === 0 && (
                        <div className={`px-6 py-8 text-center ${theme.textSecondary}`}>{t.noLogs}</div>
                    )}
                    {logEntries.map((entry, idx) => {
                        const isAccess = entry.type === 'access' || entry.status;
                        const isBlocked = entry.blocked || (entry.status >= 400);
                        const highlighted = entry.highlighted;
                        const rowClass = `${highlighted ? 'bg-amber-50 dark:bg-amber-900/40' : ''} ${isBlocked ? 'border-l-4 border-red-400' : ''}`;
                        const time = entry.time || entry.timestamp || new Date().toISOString();
                        return (
                            <div key={`${idx}-${time}`} className={`px-6 py-3 text-sm ${rowClass}`}>
                                <div className="flex flex-wrap items-center gap-3 mb-1">
                                    <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs font-semibold">
                                        {entry.type === 'error' ? 'ERROR' : 'ACCESS'}
                                    </span>
                                    <span className={`text-xs font-mono ${theme.textSecondary}`}>{new Date(time).toLocaleString()}</span>
                                    {isAccess && (
                                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${isBlocked ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100'}`}>
                                            {entry.status || '-'}
                                        </span>
                                    )}
                                    {entry.method && (
                                        <span className={`text-xs font-semibold ${theme.textSecondary}`}>{entry.method}</span>
                                    )}
                                    {entry.host && (
                                        <span className={`text-xs font-mono ${theme.textSecondary}`}>{entry.host}</span>
                                    )}
                                </div>

                                {isAccess ? (
                                    <div className={`text-sm ${theme.text}`}>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono break-all">{entry.uri || entry.request || ''}</span>
                                        </div>
                                        <div className={`text-xs mt-1 ${theme.textSecondary} flex flex-wrap gap-3`}>
                                            <span>real_ip: {entry.real_ip || entry.client_ip || entry.remote_addr || '-'}</span>
                                            <span>referer: {entry.referer || '-'}</span>
                                            <span>ua: {(entry.ua || '').slice(0, 120)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`font-mono text-xs ${theme.text}`}>{entry.raw}</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Logs;
