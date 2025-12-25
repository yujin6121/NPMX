import React from 'react';
import { Settings as SettingsIcon, ChevronDown, Globe, Lock } from 'lucide-react';

const Settings = ({
    theme,
    t,
    showGeneralSettings,
    setShowGeneralSettings,
    language,
    setLanguage,
    isDark,
    setIsDark,
    showProxySettings,
    setShowProxySettings,
    http3Enabled,
    setHttp3Enabled,
    showBackupSection,
    setShowBackupSection,
    backupDownloading,
    handleDownloadBackup,
    restoreFile,
    setRestoreFile,
    restoreUploading,
    handleRestoreBackup,
    showDefaultPageSection,
    setShowDefaultPageSection,
    defaultPageSettings,
    setDefaultPageSettings,
    handleSaveDefaultPage
}) => {
    return (
        <div className={`${theme.card} rounded-xl border shadow-sm overflow-hidden`}>
            <div className={`p-6 ${theme.divider} border-b`}>
                <h2 className={`text-xl font-semibold flex items-center gap-2 ${theme.text}`}>
                    <SettingsIcon className="w-5 h-5 text-blue-600" />
                    {t.systemSettings}
                </h2>
            </div>

            <div className="p-6 space-y-6">
                {/* General Settings */}
                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={() => setShowGeneralSettings(!showGeneralSettings)}
                        className={`w-full flex items-center justify-between ${theme.text}`}
                    >
                        <h3 className={`font-semibold text-lg ${theme.text}`}>{t.generalSettings}</h3>
                        <ChevronDown className={`w-5 h-5 transition-transform ${showGeneralSettings ? 'rotate-180' : 'rotate-0'} ${theme.textSecondary}`} />
                    </button>
                    {showGeneralSettings && (
                        <div className="space-y-3">
                            {/* Language Settings */}
                            <div className={`flex items-center justify-between p-4 rounded-lg border ${theme.card}`}>
                                <span className={theme.text}>{t.language}</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setLanguage('ko')}
                                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${language === 'ko'
                                            ? 'bg-blue-600 text-white'
                                            : `${theme.textSecondary} hover:bg-gray-100 dark:hover:bg-slate-800`
                                            }`}
                                    >
                                        {t.korean}
                                    </button>
                                    <button
                                        onClick={() => setLanguage('en')}
                                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${language === 'en'
                                            ? 'bg-blue-600 text-white'
                                            : `${theme.textSecondary} hover:bg-gray-100 dark:hover:bg-slate-800`
                                            }`}
                                    >
                                        {t.english}
                                    </button>
                                    <button
                                        onClick={() => setLanguage('ja')}
                                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${language === 'ja'
                                            ? 'bg-blue-600 text-white'
                                            : `${theme.textSecondary} hover:bg-gray-100 dark:hover:bg-slate-800`
                                            }`}
                                    >
                                        {t.japanese}
                                    </button>
                                    <button
                                        onClick={() => setLanguage('zh')}
                                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${language === 'zh'
                                            ? 'bg-blue-600 text-white'
                                            : `${theme.textSecondary} hover:bg-gray-100 dark:hover:bg-slate-800`
                                            }`}
                                    >
                                        {t.chinese}
                                    </button>
                                </div>
                            </div>

                            {/* Theme Settings */}
                            <div className={`flex items-center justify-between p-4 rounded-lg border ${theme.card}`}>
                                <span className={theme.text}>{t.themeSettings}</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsDark(false)}
                                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${!isDark
                                            ? 'bg-blue-600 text-white'
                                            : `${theme.textSecondary} hover:bg-gray-100 dark:hover:bg-slate-800`
                                            }`}
                                    >
                                        {t.light}
                                    </button>
                                    <button
                                        onClick={() => setIsDark(true)}
                                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${isDark
                                            ? 'bg-blue-600 text-white'
                                            : `${theme.textSecondary} hover:bg-gray-100 dark:hover:bg-slate-800`
                                            }`}
                                    >
                                        {t.dark}
                                    </button>
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                {/* Proxy Settings */}
                <div className="space-y-3 mt-8 pt-8 border-t">
                    <button
                        type="button"
                        onClick={() => setShowProxySettings(!showProxySettings)}
                        className={`w-full flex items-center justify-between ${theme.text}`}
                    >
                        <h3 className={`font-semibold text-lg ${theme.text}`}>{t.proxySettings}</h3>
                        <ChevronDown className={`w-5 h-5 transition-transform ${showProxySettings ? 'rotate-180' : 'rotate-0'} ${theme.textSecondary}`} />
                    </button>
                    {showProxySettings && (
                        <div className="space-y-3 mt-4">
                            {/* Auto SSL Renewal */}
                            <div className="space-y-3">
                                <label className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer ${theme.card}`}>
                                    <span className={theme.text}>{t.autoSslRenewal}</span>
                                    <input type="checkbox" defaultChecked disabled className="w-5 h-5 text-blue-600" />
                                </label>
                                <p className={`text-sm ${theme.textSecondary}`}>{t.autoSslRenewalDesc}</p>
                            </div>

                            {/* HTTP/3 Support */}
                            <div className="space-y-3 mt-4 pt-4 border-t">
                                <label className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer ${theme.card}`}>
                                    <span className={theme.text}>{t.http3Enabled}</span>
                                    <input
                                        type="checkbox"
                                        checked={http3Enabled}
                                        onChange={(e) => setHttp3Enabled(e.target.checked)}
                                        className="w-5 h-5 text-blue-600"
                                    />
                                </label>
                                <p className={`text-sm ${theme.textSecondary}`}>{t.http3Desc}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Backup & Restore */}
                <div className="space-y-3 mt-8 pt-8 border-t">
                    <button
                        type="button"
                        onClick={() => setShowBackupSection(!showBackupSection)}
                        className={`w-full flex items-center justify-between ${theme.text}`}
                    >
                        <h3 className={`font-semibold text-lg ${theme.text}`}>{t.backupRestore}</h3>
                        <ChevronDown className={`w-5 h-5 transition-transform ${showBackupSection ? 'rotate-180' : 'rotate-0'} ${theme.textSecondary}`} />
                    </button>
                    <p className={`text-sm ${theme.textSecondary}`}>{t.backupRestoreDesc}</p>

                    {showBackupSection && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                            <div className={`p-4 rounded-lg border ${theme.card}`}>
                                <h4 className={`font-semibold ${theme.text}`}>{t.downloadBackup}</h4>
                                <p className={`text-sm mt-1 ${theme.textSecondary}`}>{t.downloadBackupDesc}</p>
                                <button
                                    onClick={handleDownloadBackup}
                                    disabled={backupDownloading}
                                    className={`mt-4 w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${backupDownloading
                                        ? 'bg-gray-400 cursor-not-allowed text-white'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                >
                                    {backupDownloading ? t.preparingDownload : t.downloadBackup}
                                </button>
                            </div>

                            <div className={`p-4 rounded-lg border ${theme.card}`}>
                                <h4 className={`font-semibold ${theme.text}`}>{t.restoreFromFile}</h4>
                                <p className={`text-sm mt-1 ${theme.textSecondary}`}>{t.restoreFromFileDesc}</p>
                                <input
                                    type="file"
                                    accept=".sqlite,.db,application/x-sqlite3"
                                    onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                                    className={`mt-4 w-full text-sm ${theme.text}`}
                                />
                                <button
                                    onClick={handleRestoreBackup}
                                    disabled={restoreUploading || !restoreFile}
                                    className={`mt-3 w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${restoreUploading || !restoreFile
                                        ? 'bg-gray-400 cursor-not-allowed text-white'
                                        : 'bg-red-600 hover:bg-red-700 text-white'
                                        }`}
                                >
                                    {restoreUploading ? t.restoring : t.executeRestore}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Default Page Settings */}
                <div className="space-y-3 mt-8 pt-8 border-t">
                    <button
                        type="button"
                        onClick={() => setShowDefaultPageSection(!showDefaultPageSection)}
                        className={`w-full flex items-center justify-between ${theme.text}`}
                    >
                        <h3 className={`font-semibold text-lg ${theme.text}`}>{t.defaultPageSettings}</h3>
                        <ChevronDown className={`w-5 h-5 transition-transform ${showDefaultPageSection ? 'rotate-180' : 'rotate-0'} ${theme.textSecondary}`} />
                    </button>
                    <p className={`text-sm ${theme.textSecondary}`}>{t.defaultPageSettingsDesc}</p>

                    {showDefaultPageSection && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                            {['http', 'https'].map((portType) => (
                                <div key={portType} className={`p-4 rounded-lg border ${theme.card}`}>
                                    <div className="flex items-center gap-2 mb-4">
                                        {portType === 'http' ? (
                                            <Globe className="w-5 h-5 text-blue-500" />
                                        ) : (
                                            <Lock className="w-5 h-5 text-green-500" />
                                        )}
                                        <h4 className={`font-semibold ${theme.text}`}>{portType === 'http' ? t.httpPort80 : t.httpsPort443}</h4>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <label className={`block text-sm font-medium mb-2 ${theme.text}`}>{t.actionType}</label>
                                            <select
                                                value={defaultPageSettings[portType]?.action_type || 'html'}
                                                onChange={(e) => setDefaultPageSettings({
                                                    ...defaultPageSettings,
                                                    [portType]: {
                                                        ...defaultPageSettings[portType],
                                                        action_type: e.target.value
                                                    }
                                                })}
                                                className={`w-full p-2 rounded-lg border text-sm ${theme.card}`}
                                            >
                                                <option value="html">{t.showHtmlPage}</option>
                                                <option value="redirect">{t.redirect}</option>
                                                <option value="not_found">{t.error404}</option>
                                            </select>
                                        </div>

                                        {defaultPageSettings[portType]?.action_type === 'html' && (
                                            <div>
                                                <label className={`block text-sm font-medium mb-2 ${theme.text}`}>{t.htmlCode}</label>
                                                <textarea
                                                    value={defaultPageSettings[portType]?.html_content || ''}
                                                    onChange={(e) => setDefaultPageSettings({
                                                        ...defaultPageSettings,
                                                        [portType]: {
                                                            ...defaultPageSettings[portType],
                                                            html_content: e.target.value
                                                        }
                                                    })}
                                                    rows="6"
                                                    className={`w-full p-2 rounded-lg border font-mono text-xs ${theme.card}`}
                                                    placeholder="<!DOCTYPE html>..."
                                                />
                                            </div>
                                        )}

                                        {defaultPageSettings[portType]?.action_type === 'redirect' && (
                                            <div>
                                                <label className={`block text-sm font-medium mb-2 ${theme.text}`}>{t.redirectUrl}</label>
                                                <input
                                                    type="text"
                                                    value={defaultPageSettings[portType]?.redirect_url || ''}
                                                    onChange={(e) => setDefaultPageSettings({
                                                        ...defaultPageSettings,
                                                        [portType]: {
                                                            ...defaultPageSettings[portType],
                                                            redirect_url: e.target.value
                                                        }
                                                    })}
                                                    className={`w-full p-2 rounded-lg border text-sm ${theme.card}`}
                                                    placeholder="https://example.com"
                                                />
                                            </div>
                                        )}

                                        <button
                                            onClick={() => handleSaveDefaultPage(portType)}
                                            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            {t.save}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
