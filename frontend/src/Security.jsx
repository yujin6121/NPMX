import React from 'react';
import { Shield, Activity, AlertCircle, LogOut, Cpu, Lock, CheckCircle, Trash2 } from 'lucide-react';
import GeoMap from './GeoMap';

export default function Security({
    activeTab,
    setActiveTab,
    theme,
    securityData,
    securityLoading,
    loadSecurityData,
    geoipStats,
    geoipStatsLoading,
    loadGeoipStats,
    newVuln,
    setNewVuln,
    addVulnerability,
    updateVulnerability,
    deleteVulnerability,
    newPathBlock,
    setNewPathBlock,
    addPathBlock,
    updatePathBlock,
    deletePathBlock,
    proxyHosts,
    sslCertificates,
    toggleWafRule,
    handleWafUpdate,
    toggleBotRule,
    isDark,
    handleEditHostSecurity,
    t
}) {
    return (
        <>
            {/* 보안 센터 탭 (개요) */}
            {activeTab === 'security' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className={`text-2xl font-semibold flex items-center gap-2 ${theme.text}`}>
                            <Shield className="w-6 h-6 text-blue-600" />
                            {t.securityCenter}
                        </h2>
                    </div>

                    {/* GeoIP Blocking Stats */}
                    <div className={`${theme.card} rounded-xl border shadow-sm p-6 space-y-6`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={`font-semibold ${theme.text}`}>{t.securityStatsTitle}</p>
                                <p className={`text-sm ${theme.textSecondary}`}>{t.securityStatsDesc}</p>
                            </div>
                            <button onClick={loadGeoipStats} className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ${geoipStatsLoading ? 'animate-spin' : ''}`}>
                                <Activity className="w-5 h-5 text-blue-600" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 relative h-[400px]">
                                {geoipStats?.blockedCountries && geoipStats.blockedCountries.length > 0 ? (
                                    <GeoMap blockedCountries={geoipStats.blockedCountries} isDark={isDark} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <div className="text-center space-y-3">
                                            <div className="text-6xl">🗺️</div>
                                            <p className={`font-semibold ${theme.text}`}>GeoIP Blocking Map</p>
                                            <p className={`text-sm ${theme.textSecondary} max-w-md`}>
                                                차단된 국가가 없습니다. 프록시 호스트에서 GeoIP 차단을 설정하면 여기에 표시됩니다.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-4 flex flex-col h-[400px]">
                                <div className={`p-4 rounded-lg border ${theme.border} ${theme.bgSecondary}`}>
                                    <p className={`text-sm ${theme.textSecondary}`}>{t.totalBlocked}</p>
                                    <p className={`text-3xl font-bold ${theme.text} mt-1`}>{geoipStats?.total || 0}</p>
                                </div>
                                
                                <div className={`p-4 rounded-lg border ${theme.border} ${theme.bgSecondary} flex-1 flex flex-col min-h-0`}>
                                    <p className={`text-sm ${theme.textSecondary} mb-3 font-semibold`}>{t.recentBlocked}</p>
                                    <div className="overflow-y-auto pr-2 flex-1 space-y-2">
                                        {geoipStats?.recent?.map((log) => (
                                            <div key={log.id} className={`flex items-center justify-between text-sm p-2 rounded ${theme.card} border ${theme.border}`}>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded min-w-[32px] text-center">{log.country}</span>
                                                    <div className="flex flex-col">
                                                        <span className={`${theme.text} font-medium`}>{log.ip}</span>
                                                        <span className={`text-xs ${theme.textSecondary}`}>{log.domain}</span>
                                                    </div>
                                                </div>
                                                <span className={`text-xs ${theme.textSecondary}`}>{new Date(log.created_on).toLocaleTimeString()}</span>
                                            </div>
                                        ))}
                                        {(!geoipStats?.recent || geoipStats.recent.length === 0) && (
                                            <div className="h-full flex items-center justify-center">
                                                <p className={`text-sm ${theme.textSecondary}`}>{t.noRecords}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className={`${theme.card} rounded-xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition-all`} onClick={() => setActiveTab('vulnerabilities')}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 rounded-full bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className={`text-base font-semibold ${theme.text}`}>{t.vulnManagement}</h3>
                                    <p className={`text-xs ${theme.textSecondary}`}>{t.vulnManagementDesc}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className={`text-xl font-bold ${theme.text}`}>{securityData.vulnerabilities.length}</span>
                                <span className={`text-xs ${theme.textSecondary}`}>{t.itemsCount}</span>
                            </div>
                        </div>

                        <div className={`${theme.card} rounded-xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition-all`} onClick={() => setActiveTab('path_blocking')}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-200">
                                    <LogOut className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className={`text-base font-semibold ${theme.text}`}>{t.pathBlocking}</h3>
                                    <p className={`text-xs ${theme.textSecondary}`}>{t.pathBlockingDesc}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className={`text-xl font-bold ${theme.text}`}>{securityData.pathBlocks.length}</span>
                                <span className={`text-xs ${theme.textSecondary}`}>{t.rulesCount}</span>
                            </div>
                        </div>

                        <div className={`${theme.card} rounded-xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition-all`} onClick={() => setActiveTab('bot_blocking')}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-200">
                                    <Cpu className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className={`text-base font-semibold ${theme.text}`}>{t.botBlocking}</h3>
                                    <p className={`text-xs ${theme.textSecondary}`}>{t.botBlockingDesc}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className={`text-xl font-bold ${theme.text}`}>{proxyHosts.filter(h => h.meta?.bot_block_enabled).length}</span>
                                <span className={`text-xs ${theme.textSecondary}`}>{t.hostsBlockedCount}</span>
                            </div>
                        </div>

                        <div className={`${theme.card} rounded-xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition-all`} onClick={() => setActiveTab('waf')}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className={`text-base font-semibold ${theme.text}`}>{t.wafSettings}</h3>
                                    <p className={`text-xs ${theme.textSecondary}`}>{t.wafDesc}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className={`text-xl font-bold ${theme.text}`}>{proxyHosts.filter(h => h.meta?.waf_enabled).length}</span>
                                <span className={`text-xs ${theme.textSecondary}`}>{t.hostsProtectedCount}</span>
                            </div>
                        </div>

                        <div className={`${theme.card} rounded-xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition-all`} onClick={() => setActiveTab('ssl')}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-200">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className={`text-base font-semibold ${theme.text}`}>{t.sslCertificates}</h3>
                                    <p className={`text-xs ${theme.textSecondary}`}>{t.sslDesc}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className={`text-xl font-bold ${theme.text}`}>{sslCertificates.length}</span>
                                <span className={`text-xs ${theme.textSecondary}`}>{t.issuedCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 취약점 관리 탭 */}
            {activeTab === 'vulnerabilities' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className={`text-2xl font-semibold flex items-center gap-2 ${theme.text}`}>
                            <AlertCircle className="w-6 h-6 text-red-600" />
                            {t.vulnManagement}
                        </h2>
                    </div>

                    {/* Global WAF Rules */}
                    <div className={`${theme.card} rounded-xl border shadow-sm p-6 space-y-6`}>
                        <div>
                            <p className={`font-semibold ${theme.text}`}>{t.globalProtectionPolicy}</p>
                            <p className={`text-sm ${theme.textSecondary}`}>{t.globalProtectionDesc}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { key: 'sqli', label: 'SQL Injection', desc: t.sqlInjectionDesc },
                                { key: 'xss', label: 'XSS Protection', desc: t.xssProtectionDesc },
                                { key: 'lfi', label: 'LFI Protection', desc: t.lfiProtectionDesc },
                                { key: 'rce', label: 'RCE Protection', desc: t.rceProtectionDesc },
                                { key: 'php', label: 'PHP Injection', desc: t.phpInjectionDesc },
                                { key: 'java', label: 'Java Injection', desc: t.javaInjectionDesc },
                                { key: 'nodejs', label: 'Node.js Injection', desc: t.nodejsInjectionDesc },
                                { key: 'shell', label: 'Shell Injection', desc: t.shellInjectionDesc },
                            ].map((rule) => (
                                <div key={rule.key} className={`p-4 rounded-lg border ${theme.border} ${theme.bgSecondary} flex flex-col justify-between`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`font-medium ${theme.text}`}>{rule.label}</span>
                                        <button
                                            onClick={() => toggleWafRule(rule.key)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                                securityData.wafRules?.[rule.key] ? 'bg-blue-600' : 'bg-gray-200'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    securityData.wafRules?.[rule.key] ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                    <p className={`text-xs ${theme.textSecondary}`}>{rule.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={`${theme.card} rounded-xl border shadow-sm p-6 space-y-6`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={`font-semibold ${theme.text}`}>{t.newVulnerability}</p>
                                <p className={`text-sm ${theme.textSecondary}`}>{t.newVulnerabilityDesc}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-700">
                            <input
                                value={newVuln.title}
                                onChange={(e) => setNewVuln({ ...newVuln, title: e.target.value })}
                                placeholder={t.vulnTitlePlaceholder}
                                className={`w-full ${theme.input} border rounded-lg px-4 py-2.5 text-sm`}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <select
                                    value={newVuln.severity}
                                    onChange={(e) => setNewVuln({ ...newVuln, severity: e.target.value })}
                                    className={`w-full ${theme.input} border rounded-lg px-4 py-2.5 text-sm`}
                                >
                                    <option value="low">{t.severityLow}</option>
                                    <option value="medium">{t.severityMedium}</option>
                                    <option value="high">{t.severityHigh}</option>
                                    <option value="critical">{t.severityCritical}</option>
                                </select>
                                <select
                                    value={newVuln.status}
                                    onChange={(e) => setNewVuln({ ...newVuln, status: e.target.value })}
                                    className={`w-full ${theme.input} border rounded-lg px-4 py-2.5 text-sm`}
                                >
                                    <option value="open">{t.statusOpen}</option>
                                    <option value="mitigated">{t.statusMitigated}</option>
                                    <option value="resolved">{t.statusResolved}</option>
                                </select>
                            </div>
                            <textarea
                                value={newVuln.note}
                                onChange={(e) => setNewVuln({ ...newVuln, note: e.target.value })}
                                placeholder={t.vulnNotePlaceholder}
                                rows={3}
                                className={`w-full ${theme.input} border rounded-lg px-4 py-2.5 text-sm`}
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={addVulnerability}
                                    className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
                                >
                                    {t.addVulnerability}
                                </button>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h3 className={`text-lg font-semibold mb-4 ${theme.text}`}>{t.vulnList}</h3>
                            <div className="divide-y divide-gray-200 dark:divide-slate-700 border rounded-lg overflow-hidden">
                                {securityData.vulnerabilities.length === 0 && (
                                    <div className={`py-12 text-center ${theme.textSecondary}`}>
                                        <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>{t.noVuln}</p>
                                    </div>
                                )}
                                {securityData.vulnerabilities.map((v) => {
                                    const severityColors = {
                                        low: 'bg-green-100 text-green-700 border-green-200',
                                        medium: 'bg-amber-100 text-amber-800 border-amber-200',
                                        high: 'bg-orange-100 text-orange-800 border-orange-200',
                                        critical: 'bg-red-100 text-red-700 border-red-200',
                                    };
                                    return (
                                        <div key={v.id} className={`p-4 hover:${theme.cardHover} transition-colors`}>
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${severityColors[v.severity] || severityColors.medium}`}>
                                                        {v.severity.toUpperCase()}
                                                    </span>
                                                    <h4 className={`font-semibold ${theme.text}`}>{v.title}</h4>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={v.status}
                                                        onChange={(e) => updateVulnerability(v.id, { status: e.target.value })}
                                                        className={`text-xs ${theme.input} border rounded px-2 py-1`}
                                                    >
                                                        <option value="open">{t.statusOpen}</option>
                                                        <option value="mitigated">{t.statusMitigated}</option>
                                                        <option value="resolved">{t.statusResolved}</option>
                                                    </select>
                                                    <button onClick={() => deleteVulnerability(v.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            {v.note && <p className={`text-sm ${theme.textSecondary} mb-2 ml-1`}>{v.note}</p>}
                                            <div className="flex items-center justify-between mt-2">
                                                <p className={`text-xs ${theme.textSecondary}`}>{new Date(v.created_at).toLocaleString()}</p>
                                                <textarea
                                                    value={v.note || ''}
                                                    onChange={(e) => updateVulnerability(v.id, { note: e.target.value })}
                                                    className={`w-64 ${theme.input} border rounded px-2 py-1 text-xs`}
                                                    placeholder={t.updateNotePlaceholder}
                                                    rows={1}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* URL 경로 차단 탭 */}
            {activeTab === 'path_blocking' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className={`text-2xl font-semibold flex items-center gap-2 ${theme.text}`}>
                            <LogOut className="w-6 h-6 text-orange-600" />
                            {t.pathBlocking}
                        </h2>
                    </div>
                    <div className={`${theme.card} rounded-xl border shadow-sm p-6 space-y-6`}>
                        <div>
                            <p className={`font-semibold ${theme.text} mb-1`}>{t.addBlockRule}</p>
                            <p className={`text-sm ${theme.textSecondary} mb-4`}>{t.addBlockRuleDesc}</p>
                            
                            <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-700">
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <input
                                            value={newPathBlock.pattern}
                                            onChange={(e) => setNewPathBlock({ ...newPathBlock, pattern: e.target.value })}
                                            placeholder={t.blockPatternPlaceholder}
                                            className={`w-full ${theme.input} border rounded-lg px-4 py-2.5 text-sm font-mono`}
                                        />
                                    </div>
                                    <div className="flex items-center">
                                        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={newPathBlock.enabled}
                                                onChange={(e) => setNewPathBlock({ ...newPathBlock, enabled: e.target.checked })}
                                                className="w-4 h-4 text-blue-600 rounded"
                                            />
                                            <span className={theme.text}>{t.enableImmediately}</span>
                                        </label>
                                    </div>
                                </div>
                                <textarea
                                    value={newPathBlock.note}
                                    onChange={(e) => setNewPathBlock({ ...newPathBlock, note: e.target.value })}
                                    placeholder={t.blockReasonPlaceholder}
                                    rows={2}
                                    className={`w-full ${theme.input} border rounded-lg px-4 py-2.5 text-sm`}
                                />
                                <div className="flex justify-end">
                                    <button
                                        onClick={addPathBlock}
                                        className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
                                    >
                                        {t.addRule}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h3 className={`text-lg font-semibold mb-4 ${theme.text}`}>{t.activeBlockRules}</h3>
                            <div className="divide-y divide-gray-200 dark:divide-slate-700 border rounded-lg overflow-hidden">
                                {securityData.pathBlocks.length === 0 && (
                                    <div className={`py-12 text-center ${theme.textSecondary}`}>
                                        <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>{t.noBlockRules}</p>
                                    </div>
                                )}
                                {securityData.pathBlocks.map((p) => (
                                    <div key={p.id} className={`p-4 hover:${theme.cardHover} transition-colors flex items-center justify-between`}>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <input
                                                    type="checkbox"
                                                    checked={p.enabled}
                                                    onChange={(e) => updatePathBlock(p.id, { enabled: e.target.checked })}
                                                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                                />
                                                <span className={`font-mono text-sm font-medium ${p.enabled ? theme.text : 'text-gray-400 line-through'}`}>{p.pattern}</span>
                                                {!p.enabled && <span className="text-xs text-gray-400">{t.inactive}</span>}
                                            </div>
                                            {p.note && <p className={`text-sm ${theme.textSecondary} ml-7`}>{p.note}</p>}
                                            <p className={`text-xs ${theme.textSecondary} ml-7 mt-1`}>{t.registeredAt} {new Date(p.created_at).toLocaleString()}</p>
                                        </div>
                                        <button onClick={() => deletePathBlock(p.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* WAF 설정 탭 */}
            {activeTab === 'waf' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className={`text-2xl font-semibold flex items-center gap-2 ${theme.text}`}>
                            <Shield className="w-6 h-6 text-blue-600" />
                            {t.wafSettings}
                        </h2>
                    </div>
                    
                    <div className={`${theme.card} rounded-xl border shadow-sm overflow-hidden`}>
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>{t.hostWafSettings}</h3>
                            <p className={`${theme.textSecondary} text-sm`}>
                                {t.hostWafSettingsDesc}
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className={`border-b ${theme.divider} ${theme.tableHeader}`}>
                                        <th className={`p-4 font-semibold ${theme.text}`}>Host</th>
                                        <th className={`p-4 font-semibold ${theme.text}`}>WAF Status</th>
                                        <th className={`p-4 font-semibold ${theme.text}`}>Mode</th>
                                        <th className={`p-4 font-semibold ${theme.text}`}>Paranoia Level</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {proxyHosts.map(host => (
                                        <tr key={host.id} className={`border-b ${theme.divider} hover:bg-gray-50 dark:hover:bg-gray-800/50`}>
                                            <td className={`p-4 ${theme.text}`}>
                                                <div className="font-medium">{host.domain_names.join(', ')}</div>
                                                <div className={`text-xs ${theme.textSecondary}`}>{host.forward_host}:{host.forward_port}</div>
                                            </td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => handleWafUpdate(host, { waf_enabled: !host.meta?.waf_enabled })}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                        host.meta?.waf_enabled ? 'bg-blue-600' : 'bg-gray-200'
                                                    }`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                            host.meta?.waf_enabled ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                    />
                                                </button>
                                            </td>
                                            <td className="p-4">
                                                <select
                                                    value={host.meta?.waf_mode || 'DetectionOnly'}
                                                    onChange={(e) => handleWafUpdate(host, { waf_mode: e.target.value })}
                                                    disabled={!host.meta?.waf_enabled}
                                                    className={`p-2 rounded border ${theme.input} ${theme.text} text-sm disabled:opacity-50`}
                                                >
                                                    <option value="DetectionOnly">Detection Only</option>
                                                    <option value="On">Blocking</option>
                                                </select>
                                            </td>
                                            <td className="p-4">
                                                <select
                                                    value={host.meta?.waf_paranoia_level || 1}
                                                    onChange={(e) => handleWafUpdate(host, { waf_paranoia_level: parseInt(e.target.value) })}
                                                    disabled={!host.meta?.waf_enabled}
                                                    className={`p-2 rounded border ${theme.input} ${theme.text} text-sm disabled:opacity-50`}
                                                >
                                                    <option value="1">Level 1 (Basic)</option>
                                                    <option value="2">Level 2</option>
                                                    <option value="3">Level 3</option>
                                                    <option value="4">Level 4 (Strict)</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                    {proxyHosts.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className={`p-8 text-center ${theme.textSecondary}`}>
                                                {t.noProxyHosts}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                        
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 text-left">
                        <div className={`p-4 rounded-lg border ${theme.card}`}>
                            <h4 className={`font-semibold ${theme.text} mb-2`}>{t.detectionMode}</h4>
                            <p className={`text-sm ${theme.textSecondary}`}>{t.detectionModeDesc}</p>
                        </div>
                        <div className={`p-4 rounded-lg border ${theme.card}`}>
                            <h4 className={`font-semibold ${theme.text} mb-2`}>{t.blockingMode}</h4>
                            <p className={`text-sm ${theme.textSecondary}`}>{t.blockingModeDesc}</p>
                        </div>
                        <div className={`p-4 rounded-lg border ${theme.card}`}>
                            <h4 className={`font-semibold ${theme.text} mb-2`}>{t.paranoiaLevel}</h4>
                            <p className={`text-sm ${theme.textSecondary}`}>{t.paranoiaLevelDesc}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* 봇 차단 탭 */}
            {activeTab === 'bot_blocking' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className={`text-2xl font-semibold flex items-center gap-2 ${theme.text}`}>
                            <Cpu className="w-6 h-6 text-purple-600" />
                            {t.botBlockingStatus}
                        </h2>
                    </div>

                    {/* Bot Control Rules */}
                    <div className={`${theme.card} rounded-xl border shadow-sm p-6 space-y-6`}>
                        <div>
                            <p className={`font-semibold ${theme.text}`}>{t.botBlockingPolicy}</p>
                            <p className={`text-sm ${theme.textSecondary}`}>{t.botBlockingPolicyDesc}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                                { key: 'block_ai_bots', label: t.blockAiBots, desc: t.blockAiBotsDesc, default: true },
                                { key: 'block_google_bot', label: t.blockGoogleBot, desc: t.blockGoogleBotDesc, default: false },
                                { key: 'block_other_search_bots', label: t.blockOtherSearchBots, desc: t.blockOtherSearchBotsDesc, default: false },
                                { key: 'block_social_bots', label: t.blockSocialBots, desc: t.blockSocialBotsDesc, default: false },
                                { key: 'block_scrapers', label: t.blockScrapers, desc: t.blockScrapersDesc, default: true },
                            ].map((rule) => {
                                const isEnabled = securityData.botRules?.[rule.key] !== undefined 
                                    ? securityData.botRules[rule.key] 
                                    : rule.default;
                                return (
                                    <div key={rule.key} className={`p-4 rounded-lg border ${theme.border} ${theme.bgSecondary} flex flex-col justify-between`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`font-medium ${theme.text}`}>{rule.label}</span>
                                            <button
                                                onClick={() => toggleBotRule(rule.key)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                                    isEnabled ? 'bg-blue-600' : 'bg-gray-200'
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                        isEnabled ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                        <p className={`text-xs ${theme.textSecondary}`}>{rule.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className={`${theme.card} rounded-xl border shadow-sm p-6`}>
                        <div className="mb-6">
                            <p className={`${theme.textSecondary}`}>
                                {t.botHostSettingsDesc}<br/>
                                {t.botHostSettingsNote}
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className={theme.tableHeader}>
                                    <tr>
                                        <th className={`px-6 py-4 text-left text-sm font-semibold ${theme.text}`}>{t.domain}</th>
                                        <th className={`px-6 py-4 text-left text-sm font-semibold ${theme.text}`}>{t.botBlocking}</th>
                                        <th className={`px-6 py-4 text-left text-sm font-semibold ${theme.text}`}>{t.challengeMode}</th>
                                        <th className={`px-6 py-4 text-left text-sm font-semibold ${theme.text}`}>{t.status}</th>
                                        <th className={`px-6 py-4 text-right text-sm font-semibold ${theme.text}`}>{t.manage}</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${theme.divider}`}>
                                    {proxyHosts.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className={`px-6 py-8 text-center ${theme.textSecondary}`}>{t.noHosts}</td>
                                        </tr>
                                    )}
                                    {proxyHosts.map((h) => {
                                        const meta = h.meta || {};
                                        const domains = (h.domain_names || []).join(', ');
                                        const block = !!meta.bot_block_enabled;
                                        const challenge = !!meta.bot_challenge_enabled;
                                        
                                        return (
                                            <tr key={h.id} className={`hover:${theme.cardHover} transition-colors`}>
                                                <td className={`px-6 py-4 ${theme.text} font-medium`}>{domains || t.noDomain}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${block ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {block ? t.active : t.inactive}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${challenge ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {challenge ? t.active : t.inactive}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {h.enabled ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            Online
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                            Offline
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleEditHostSecurity(h)}
                                                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                                                    >
                                                        {t.configure}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
