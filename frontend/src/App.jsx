import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Activity, Globe, Plus, Settings as SettingsIcon, Shield, CheckCircle, XCircle, Clock, Edit, Trash2, ExternalLink, Moon, Sun, LogOut, ChevronDown, Pencil, Cpu, HardDrive, Zap, BarChart3, Download, AlertCircle, Menu, X, Lock as LockIcon } from 'lucide-react';
import QRCode from 'qrcode';
import translations from './translations';
import { safeLocalStorage } from './utils';
import ErrorBoundary from './ErrorBoundary';
import Login from './Login';
import Security from './Security';
import Dashboard from './Dashboard';
import ProxyHosts from './ProxyHosts';
import Logs from './Logs';
import ActivityLog from './ActivityLog';
import SSLCertificates from './SSLCertificates';
import Settings from './Settings';
import { GEOIP_COUNTRY_OPTIONS } from './constants';
// HomePage removed; show Login directly when not authenticated

// Configure Axios base URL
axios.defaults.baseURL = '/api';

// Add axios interceptor to include token in all requests
axios.interceptors.request.use(
    (config) => {
        const token = safeLocalStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Global response interceptor: handle 401 by clearing token and redirecting to login
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        const apiError = error?.response?.data?.error;
        const config = error?.config;
        
        // Allow OTP-related 401s to pass through (login form handles them)
        if (status === 401 && (apiError?.otp_required || apiError?.otp_invalid)) {
            return Promise.reject(error);
        }
        
        // Don't reload on login/me endpoint failures - let the component handle it
        if (status === 401 && (config?.url?.includes('/auth/login') || config?.url?.includes('/auth/me'))) {
            return Promise.reject(error);
        }
        
        if (status === 401) {
            try {
                safeLocalStorage.removeItem('token');
                delete axios.defaults.headers.common['Authorization'];
            } catch {}
            // Force app to show login by reloading state
            if (window && window.location) {
                // Soft reload to re-evaluate App auth gate
                window.location.reload();
            }
        }
        return Promise.reject(error);
    }
);


function ProxyManager({ user, onLogout, onUserUpdate }) {
    const [isDark, setIsDark] = useState(safeLocalStorage.getItem('theme') === 'dark');
    const [language, setLanguage] = useState(safeLocalStorage.getItem('language') || 'ko');

    const renderActivityText = (item) => {
        const t = translations[language];
        const d = item.details || {};
        switch (item.action) {
            case 'login':
                return `${t.loginAction}${d.email || ''}`;
            case 'change_password':
                return t.changePasswordAction;
            case 'change_email':
                return `${t.changeEmailAction}'${d.new_email}'`;
            case 'change_name':
                return `${t.changeNameAction}'${d.new_name}'`;
            case 'otp_setup_start':
                return t.otpSetupStartAction;
            case 'otp_enabled':
                return t.otpEnabledAction;
            case 'add_proxy_host':
                return `${t.addProxyHostAction}${(d.domain_names || []).join(', ')}`;
            case 'update_proxy_host':
                return `${t.updateProxyHostAction}${(d.domain_names || []).join(', ')}`;
            case 'delete_proxy_host':
                return `${t.deleteProxyHostAction}${d.id}`;
            case 'geoip_block': {
                const country = d.country || 'UNKNOWN';
                const reason = d.reason === 'not_in_allow_list' ? t.notInAllowList : t.inBlockList;
                const domains = Array.isArray(d.domains) ? d.domains.join(', ') : '';
                return `${t.geoipBlockAction}${country} (${reason}) ${domains ? `→ ${domains}` : ''}`.trim();
            }
            default:
                return JSON.stringify(item.details);
        }
    };
    const t = translations[language];

    useEffect(() => {
        safeLocalStorage.setItem('theme', isDark ? 'dark' : 'light');
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDark]);

    useEffect(() => {
        safeLocalStorage.setItem('language', language);
    }, [language]);

    const [activeTab, setActiveTab] = useState('dashboard');
    const [showAddModal, setShowAddModal] = useState(false);
    const [modalTab, setModalTab] = useState('details');
    const [proxyHosts, setProxyHosts] = useState([]);
    const [sslCertificates, setSslCertificates] = useState([]);
    const [editingHost, setEditingHost] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [logs, setLogs] = useState([]);
    const [scanningPorts, setScanningPorts] = useState(false);
    const [scannedPorts, setScannedPorts] = useState([]);
    const [scanTarget, setScanTarget] = useState('192.168.');

    const [formData, setFormData] = useState({
        domain_names: '',
        forward_scheme: 'http',
        forward_host: '',
        forward_port: 80,
        certificate_id: 0,
        ssl_forced: false,
        http3_support: true,
        block_exploits: true,
        caching_enabled: false,
        allow_websocket_upgrade: false,
        custom_locations: [],
        enabled: true,
        hsts_enabled: false,
        hsts_subdomains: false,
        brotli_enabled: false,
        security_headers_enabled: false,
        waf_enabled: true,
        waf_mode: 'DetectionOnly',
        waf_paranoia_level: 1,
        geoip_allow_countries: '',
        geoip_deny_countries: ''
    });

    const [emailForm, setEmailForm] = useState({ password: '', newEmail: '' });
    const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '' });
    const [nameForm, setNameForm] = useState({ newName: user.name });
    const [showAddCertModal, setShowAddCertModal] = useState(false);
    const [certFormData, setCertFormData] = useState({ domain_names: '' });
    const [defaultPageSettings, setDefaultPageSettings] = useState({
        http: { action_type: 'html', html_content: '', redirect_url: '' },
        https: { action_type: 'html', html_content: '', redirect_url: '' }
    });

    const [backupDownloading, setBackupDownloading] = useState(false);
    const [restoreFile, setRestoreFile] = useState(null);
    const [restoreUploading, setRestoreUploading] = useState(false);
    const [showBackupSection, setShowBackupSection] = useState(false);
    const [showDefaultPageSection, setShowDefaultPageSection] = useState(false);
    const [showGeneralSettings, setShowGeneralSettings] = useState(false);
    const [showProxySettings, setShowProxySettings] = useState(false);
    const [http3Enabled, setHttp3Enabled] = useState(true);
    const [editingField, setEditingField] = useState(null);
    const [profileImageUrl, setProfileImageUrl] = useState(null);
    const profileFileInputRef = useRef(null);
    const [twoFactor, setTwoFactor] = useState({
        loading: false,
        enabled: false,
        setup: null,
        otp: '',
        qrDataUrl: '',
    });
    const [systemInfo, setSystemInfo] = useState(null);
    const [systemLoading, setSystemLoading] = useState(false);
    const [activityLogs, setActivityLogs] = useState([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityStats, setActivityStats] = useState(null);
    const [activityStatsLoading, setActivityStatsLoading] = useState(false);
    const [activityFilter, setActivityFilter] = useState({
        search: '',
        action: '',
        startDate: '',
        endDate: '',
        period: '24h'
    });
    const [logEntries, setLogEntries] = useState([]);
    const [logFilters, setLogFilters] = useState({
        type: 'access',
        search: '',
        host: '',
        ip: '',
        status: '',
        blocked: false,
        limit: 200,
    });
    const [logSettings, setLogSettings] = useState({ excludePatterns: [], highlightPatterns: [] });
    const [logSettingsDraft, setLogSettingsDraft] = useState({ excludePatterns: '', highlightPatterns: '' });
    const [logLoading, setLogLoading] = useState(false);
    const [logSettingsSaving, setLogSettingsSaving] = useState(false);
    const [logSettingsLoaded, setLogSettingsLoaded] = useState(false);
    const [logsExpanded, setLogsExpanded] = useState(false);
    const [securityExpanded, setSecurityExpanded] = useState(false);
    const [securityData, setSecurityData] = useState({ vulnerabilities: [], pathBlocks: [], wafRules: {}, botRules: {} });
    const [securityLoading, setSecurityLoading] = useState(false);
    const [securityLoaded, setSecurityLoaded] = useState(false);
    const [geoipStats, setGeoipStats] = useState(null);
    const [geoipStatsLoading, setGeoipStatsLoading] = useState(false);
    const [newVuln, setNewVuln] = useState({ title: '', severity: 'medium', status: 'open', note: '' });
    const [newPathBlock, setNewPathBlock] = useState({ pattern: '', note: '', enabled: true });
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


    const allowedCountrySet = useMemo(() => {
        return new Set(
            (formData.geoip_allow_countries || '')
                .split(',')
                .map((code) => code.trim().toUpperCase())
                .filter(Boolean)
        );
    }, [formData.geoip_allow_countries]);

    const deniedCountrySet = useMemo(() => {
        return new Set(
            (formData.geoip_deny_countries || '')
                .split(',')
                .map((code) => code.trim().toUpperCase())
                .filter(Boolean)
        );
    }, [formData.geoip_deny_countries]);

    useEffect(() => {
        return () => {
            if (profileImageUrl) {
                URL.revokeObjectURL(profileImageUrl);
            }
        };
    }, [profileImageUrl]);

    const handleProfileImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const nextUrl = URL.createObjectURL(file);
        setProfileImageUrl((prevUrl) => {
            if (prevUrl) URL.revokeObjectURL(prevUrl);
            return nextUrl;
        });

        // allow re-selecting the same file
        e.target.value = '';
    };

    const loadTwoFactorStatus = async () => {
        setTwoFactor((prev) => ({ ...prev, loading: true }));
        try {
            const res = await axios.get('/auth/2fa/status');
            setTwoFactor((prev) => ({
                ...prev,
                enabled: !!res.data?.enabled,
                setup: null,
                otp: '',
                qrDataUrl: '',
            }));
        } catch (err) {
            console.error('Failed to load 2FA status:', err);
        } finally {
            setTwoFactor((prev) => ({ ...prev, loading: false }));
        }
    };

    const startTwoFactorSetup = async () => {
        setTwoFactor((prev) => ({ ...prev, loading: true }));
        try {
            const res = await axios.post('/auth/2fa/setup');
            const setup = res.data;
            const otpauthUrl = setup?.otpauthUrl;

            let qrDataUrl = '';
            if (otpauthUrl) {
                qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 180 });
            }

            setTwoFactor((prev) => ({
                ...prev,
                setup,
                otp: '',
                qrDataUrl,
            }));
        } catch (err) {
            console.error('Failed to start 2FA setup:', err);
            alert(err.response?.data?.error?.message || t.otpSetupFail);
        } finally {
            setTwoFactor((prev) => ({ ...prev, loading: false }));
        }
    };

    const enableTwoFactor = async () => {
        if (!twoFactor.otp) {
            alert(t.enterOtp);
            return;
        }
        setTwoFactor((prev) => ({ ...prev, loading: true }));
        try {
            await axios.post('/auth/2fa/enable', { otp: twoFactor.otp });
            alert(t.otpEnabledSuccess);
            await loadTwoFactorStatus();
        } catch (err) {
            console.error('Failed to enable 2FA:', err);
            alert(err.response?.data?.error?.message || t.otpEnableFail);
        } finally {
            setTwoFactor((prev) => ({ ...prev, loading: false }));
        }
    };

    useEffect(() => {
        let interval = null;

        if (activeTab === 'account') {
            loadTwoFactorStatus();
        }
        if (activeTab === 'dashboard') {
            loadSystemInfo();
            loadActivityLogs();
            // Refresh system info and activity every 10 seconds when on dashboard
            interval = setInterval(() => {
                loadSystemInfo();
                loadActivityLogs();
            }, 10000);
        }
        if (activeTab === 'activity') {
            loadActivityLogs(activityFilter);
            loadActivityStats(activityFilter.period);
        }
        if (activeTab === 'logs') {
            if (!logSettingsLoaded) {
                loadLogSettings();
            }
            loadLogs();
            interval = setInterval(() => {
                loadLogs();
            }, 5000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeTab, logFilters, logSettingsLoaded]);

    useEffect(() => {
        if (activeTab === 'logs') {
            loadLogs();
        }
    }, [logFilters, activeTab]);

    const loadSystemInfo = async () => {
        setSystemLoading(true);
        try {
            const res = await axios.get('/system/info');
            setSystemInfo(res.data);
        } catch (err) {
            console.error('Failed to load system info:', err);
        } finally {
            setSystemLoading(false);
        }
    };

    const loadActivityLogs = async (filters = {}) => {
        setActivityLoading(true);
        try {
            const params = {};
            if (filters.search) params.search = filters.search;
            if (filters.action) params.action = filters.action;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (filters.limit) params.limit = filters.limit;
            
            const res = await axios.get('/activity/recent', { params });
            setActivityLogs(res.data || []);
        } catch (err) {
            console.error('Failed to load activity logs:', err);
        } finally {
            setActivityLoading(false);
        }
    };

    const loadActivityStats = async (period = '24h') => {
        setActivityStatsLoading(true);
        try {
            const res = await axios.get('/activity/stats', { params: { period } });
            setActivityStats(res.data);
        } catch (err) {
            console.error('Failed to load activity stats:', err);
        } finally {
            setActivityStatsLoading(false);
        }
    };

    const handleExportActivityLogs = async () => {
        try {
            const params = {};
            if (activityFilter.search) params.search = activityFilter.search;
            if (activityFilter.action) params.action = activityFilter.action;
            if (activityFilter.startDate) params.startDate = activityFilter.startDate;
            if (activityFilter.endDate) params.endDate = activityFilter.endDate;
            
            const response = await axios.get('/activity/export', { 
                params,
                responseType: 'blob' 
            });
            
            const blob = new Blob([response.data], { type: 'text/csv; charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().split('T')[0];
            a.download = `activity-log-${timestamp}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to export activity logs:', err);
            alert(t.csvExportFail);
        }
    };

    const handleActivityFilterChange = (key, value) => {
        setActivityFilter(prev => ({ ...prev, [key]: value }));
    };

    const handleActivitySearch = () => {
        loadActivityLogs(activityFilter);
    };

    const loadLogSettings = async () => {
        try {
            const res = await axios.get('/logs/settings');
            const next = res.data || { excludePatterns: [], highlightPatterns: [] };
            setLogSettings(next);
            setLogSettingsDraft({
                excludePatterns: (next.excludePatterns || []).join('\n'),
                highlightPatterns: (next.highlightPatterns || []).join('\n'),
            });
            setLogSettingsLoaded(true);
        } catch (err) {
            console.error('Failed to load log settings:', err);
            setLogSettingsLoaded(true);
        }
    };

    const saveLogSettings = async () => {
        setLogSettingsSaving(true);
        try {
            const payload = {
                excludePatterns: (logSettingsDraft.excludePatterns || '')
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean),
                highlightPatterns: (logSettingsDraft.highlightPatterns || '')
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean),
            };
            const res = await axios.put('/logs/settings', payload);
            const next = res.data || payload;
            setLogSettings(next);
            alert(t.logFilterSaved);
        } catch (err) {
            console.error('Failed to save log settings:', err);
            alert(err.response?.data?.error?.message || t.saveFail);
        } finally {
            setLogSettingsSaving(false);
        }
    };

    const loadLogs = async (override = {}) => {
        setLogLoading(true);
        try {
            const merged = { ...logFilters, ...override };
            const params = {
                ...merged,
                blocked: merged.blocked ? 1 : 0,
            };
            const res = await axios.get('/logs', { params });
            setLogEntries(res.data?.entries || []);
        } catch (err) {
            console.error('Failed to load logs:', err);
        } finally {
            setLogLoading(false);
        }
    };

    const handleLogFilterChange = (key, value) => {
        setLogFilters((prev) => ({ ...prev, [key]: value }));
    };

    const loadSecurityData = async () => {
        if (securityLoading) return;
        setSecurityLoading(true);
        try {
            const res = await axios.get('/security');
            setSecurityData(res.data || { vulnerabilities: [], pathBlocks: [] });
            setSecurityLoaded(true);
        } catch (err) {
            console.error('Failed to load security data:', err);
            setSecurityLoaded(true);
        } finally {
            setSecurityLoading(false);
        }
    };

    const loadGeoipStats = async () => {
        if (geoipStatsLoading) return;
        setGeoipStatsLoading(true);
        try {
            const res = await axios.get('/activity/geoip-stats');
            setGeoipStats(res.data);
        } catch (err) {
            console.error('Failed to load geoip stats:', err);
        } finally {
            setGeoipStatsLoading(false);
        }
    };

    const addVulnerability = async () => {
        if (!newVuln.title.trim()) {
            alert(t.enterTitle);
            return;
        }
        try {
            const res = await axios.post('/security/vulns', newVuln);
            setSecurityData(res.data);
            setNewVuln({ title: '', severity: 'medium', status: 'open', note: '' });
        } catch (err) {
            console.error('Failed to add vulnerability:', err);
            alert(t.addVulnFail);
        }
    };

    const updateVulnerability = async (id, payload) => {
        try {
            const res = await axios.patch(`/security/vulns/${id}`, payload);
            setSecurityData(res.data);
        } catch (err) {
            console.error('Failed to update vulnerability:', err);
            alert(t.updateFail);
        }
    };

    const deleteVulnerability = async (id) => {
        if (!window.confirm(t.deleteConfirmSimple)) return;
        try {
            const res = await axios.delete(`/security/vulns/${id}`);
            setSecurityData(res.data);
        } catch (err) {
            console.error('Failed to delete vulnerability:', err);
            alert(t.deleteFailSimple);
        }
    };

    const addPathBlock = async () => {
        if (!newPathBlock.pattern.trim()) {
            alert(t.enterPattern);
            return;
        }
        try {
            const res = await axios.post('/security/path-blocks', newPathBlock);
            setSecurityData(res.data);
            setNewPathBlock({ pattern: '', note: '', enabled: true });
        } catch (err) {
            console.error('Failed to add path block:', err);
            alert(t.addPathBlockFail);
        }
    };

    const updatePathBlock = async (id, payload) => {
        try {
            const res = await axios.patch(`/security/path-blocks/${id}`, payload);
            setSecurityData(res.data);
        } catch (err) {
            console.error('Failed to update path block:', err);
            alert(t.updateFail);
        }
    };

    const deletePathBlock = async (id) => {
        if (!window.confirm(t.deleteConfirmSimple)) return;
        try {
            const res = await axios.delete(`/security/path-blocks/${id}`);
            setSecurityData(res.data);
        } catch (err) {
            console.error('Failed to delete path block:', err);
            alert(t.deleteFailSimple);
        }
    };

    const toggleWafRule = async (ruleName) => {
        try {
            const currentRules = securityData.wafRules || {};
            const newValue = !currentRules[ruleName];
            
            // Optimistic update
            setSecurityData(prev => ({
                ...prev,
                wafRules: {
                    ...prev.wafRules,
                    [ruleName]: newValue
                }
            }));

            const res = await axios.post('/security/waf-rules', {
                [ruleName]: newValue
            });
            
            setSecurityData(res.data);
        } catch (err) {
            console.error('Failed to toggle WAF rule:', err);
            alert(t.settingChangeFail);
            loadSecurityData();
        }
    };

    const toggleBotRule = async (ruleName) => {
        try {
            const currentRules = securityData.botRules || {};
            // Default values if undefined:
            // block_ai_bots: true
            // block_google_bot: false
            // block_other_search_bots: false
            // block_social_bots: false
            // block_scrapers: true
            
            let currentValue = currentRules[ruleName];
            if (currentValue === undefined) {
                if (ruleName === 'block_ai_bots' || ruleName === 'block_scrapers') currentValue = true;
                else currentValue = false;
            }

            const newValue = !currentValue;
            
            // Optimistic update
            setSecurityData(prev => ({
                ...prev,
                botRules: {
                    ...prev.botRules,
                    [ruleName]: newValue
                }
            }));

            const res = await axios.post('/security/bot-rules', {
                [ruleName]: newValue
            });
            
            setSecurityData(res.data);
        } catch (err) {
            console.error('Failed to toggle Bot rule:', err);
            alert(t.settingChangeFail);
            loadSecurityData();
        }
    };

    const handleDownloadBackup = async () => {
        setBackupDownloading(true);
        try {
            const response = await axios.get('/backup/download', { responseType: 'blob' });
            const contentType = response.headers?.['content-type'] || 'application/octet-stream';
            const blob = new Blob([response.data], { type: contentType });

            let filename = 'backup.sqlite';
            const disposition = response.headers?.['content-disposition'];
            if (disposition) {
                const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
                const rawName = match?.[1] || match?.[2];
                if (rawName) {
                    try {
                        filename = decodeURIComponent(rawName);
                    } catch {
                        filename = rawName;
                    }
                }
            }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error?.message || t.backupDownloadError);
        } finally {
            setBackupDownloading(false);
        }
    };

    const handleRestoreBackup = async () => {
        if (!restoreFile) {
            alert(t.selectBackupFile);
            return;
        }
        const ok = confirm(t.restoreConfirm);
        if (!ok) return;

        setRestoreUploading(true);
        try {
            const fd = new FormData();
            fd.append('backup', restoreFile);
            await axios.post('/backup/restore', fd);
            alert(t.restoreSuccess);
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error?.message || t.restoreFail);
        } finally {
            setRestoreUploading(false);
        }
    };

    const handleSaveDefaultPage = async (portType) => {
        try {
            await axios.post(`/default-page/${portType}`, defaultPageSettings[portType]);
            alert(`${portType === 'http' ? 'HTTP' : 'HTTPS'} ${t.defaultPageSaved}`);
        } catch (err) {
            console.error(err);
            alert(t.saveError);
        }
    };

    const loadProxyHosts = async () => {
        try {
            const response = await axios.get('/proxy-hosts');
            setProxyHosts(response.data);
        } catch (err) {
            console.error('Failed to load proxy hosts:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadCertificates = async () => {
        try {
            const response = await axios.get('/certificates');
            setSslCertificates(response.data);
        } catch (err) {
            console.error('Failed to load certificates:', err);
        }
    };

    const handleEditHost = (host) => {
        setEditingHost(host);
        setModalTab('details');
        setFormData({
            domain_names: host.domain_names.join(', '),
            forward_scheme: host.forward_scheme,
            forward_host: host.forward_host,
            forward_port: host.forward_port,
            certificate_id: host.certificate_id,
            ssl_forced: !!host.ssl_forced,
            http3_support: !!host.http3_support,
            block_exploits: !!host.block_exploits,
            caching_enabled: !!host.caching_enabled,
            allow_websocket_upgrade: !!host.allow_websocket_upgrade,
            custom_locations: host.custom_locations || [],
            enabled: !!host.enabled,
            hsts_enabled: !!host.hsts_enabled,
            hsts_subdomains: !!host.hsts_subdomains,
            brotli_enabled: !!host.meta?.brotli_enabled,
            security_headers_enabled: !!host.meta?.security_headers_enabled,
            waf_enabled: host.meta?.waf_enabled !== undefined ? !!host.meta.waf_enabled : true,
            waf_mode: host.meta?.waf_mode || 'DetectionOnly',
            waf_paranoia_level: host.meta?.waf_paranoia_level || 1,
            geoip_allow_countries: Array.isArray(host.meta?.geoip_allow_countries) ? host.meta.geoip_allow_countries.join(', ') : '',
            geoip_deny_countries: Array.isArray(host.meta?.geoip_deny_countries) ? host.meta.geoip_deny_countries.join(', ') : '',
            bot_block_enabled: host.meta?.bot_block_enabled ? 1 : 0,
            bot_challenge_enabled: host.meta?.bot_challenge_enabled ? 1 : 0,
        });
        setShowAddModal(true);
    };

    const handleEditHostSecurity = (host) => {
        setEditingHost(host);
        setFormData({
            ...host,
            domain_names: host.domain_names.join(', '),
            certificate_id: host.certificate_id || 0,
            ssl_forced: !!host.ssl_forced,
            http3_support: !!host.http3_support,
            block_exploits: !!host.block_exploits,
            caching_enabled: !!host.caching_enabled,
            allow_websocket_upgrade: !!host.allow_websocket_upgrade,
            hsts_enabled: !!host.hsts_enabled,
            hsts_subdomains: !!host.hsts_subdomains,
            brotli_enabled: !!host.meta?.brotli_enabled,
            security_headers_enabled: !!host.meta?.security_headers_enabled,
            waf_enabled: !!host.meta?.waf_enabled,
            waf_mode: host.meta?.waf_mode || 'DetectionOnly',
            waf_paranoia_level: host.meta?.waf_paranoia_level || 1,
            geoip_allow_countries: Array.isArray(host.meta?.geoip_allow_countries) ? host.meta.geoip_allow_countries.join(', ') : '',
            geoip_deny_countries: Array.isArray(host.meta?.geoip_deny_countries) ? host.meta.geoip_deny_countries.join(', ') : '',
            geoipExpanded: !!(host.meta?.geoip_allow_countries || host.meta?.geoip_deny_countries),
            geoipAllowExpanded: !!host.meta?.geoip_allow_countries,
            geoipDenyExpanded: !!host.meta?.geoip_deny_countries,
            wafOptionsExpanded: !!host.meta?.waf_enabled
        });
        setModalTab('security');
        setShowAddModal(true);
    };

    const handleCreateHost = () => {
        setEditingHost(null);
        setModalTab('details');
        setFormData({
            domain_names: '',
            forward_scheme: 'http',
            forward_host: '',
            forward_port: 80,
            certificate_id: 0,
            ssl_forced: false,
            http3_support: true,
            block_exploits: true,
            caching_enabled: false,
            allow_websocket_upgrade: false,
            custom_locations: [],
            enabled: true,
            hsts_enabled: false,
            hsts_subdomains: false,
            brotli_enabled: false,
            security_headers_enabled: false,
            waf_enabled: true,
            waf_mode: 'DetectionOnly',
            waf_paranoia_level: 1,
            geoip_allow_countries: '',
            geoip_deny_countries: '',
            bot_block_enabled: 0,
            bot_challenge_enabled: 0,
        });
        setShowAddModal(true);
    };

    const handleSubmit = async () => {
        try {
            const domains = formData.domain_names.split(',').map(d => d.trim()).filter(d => d);
            const allowCountries = formData.geoip_allow_countries.split(',').map(c => c.trim().toUpperCase()).filter(c => c);
            const denyCountries = formData.geoip_deny_countries.split(',').map(c => c.trim().toUpperCase()).filter(c => c);
            const payload = {
                domain_names: domains,
                forward_scheme: formData.forward_scheme,
                forward_host: formData.forward_host,
                forward_port: parseInt(formData.forward_port),
                certificate_id: parseInt(formData.certificate_id),
                ssl_forced: !!formData.ssl_forced,
                hsts_enabled: !!formData.hsts_enabled,
                hsts_subdomains: !!formData.hsts_subdomains,
                http3_support: !!formData.http3_support,
                block_exploits: !!formData.block_exploits,
                caching_enabled: !!formData.caching_enabled,
                allow_websocket_upgrade: !!formData.allow_websocket_upgrade,
                advanced_config: formData.advanced_config || '',
                enabled: !!formData.enabled,
                custom_locations: formData.custom_locations || [],
                brotli_enabled: !!formData.brotli_enabled,
                security_headers_enabled: !!formData.security_headers_enabled,
                waf_enabled: !!formData.waf_enabled,
                waf_mode: formData.waf_mode || 'DetectionOnly',
                waf_paranoia_level: formData.waf_paranoia_level || 1,
                geoip_allow_countries: allowCountries,
                geoip_deny_countries: denyCountries,
                bot_block_enabled: !!formData.bot_block_enabled,
                bot_challenge_enabled: !!formData.bot_challenge_enabled,
            };

            // Optimistic update for edit
            if (editingHost) {
                setProxyHosts(prev => prev.map(h => h.id === editingHost.id ? { ...h, ...payload, id: h.id, created_on: h.created_on, modified_on: new Date().toISOString() } : h));
                setShowAddModal(false); // Close modal immediately
                await axios.put(`/proxy-hosts/${editingHost.id}`, payload);
            } else {
                // For create, we wait for response to get ID
                const response = await axios.post('/proxy-hosts', payload);
                setProxyHosts(prev => [...prev, response.data]);
                setShowAddModal(false);
            }

            // Silent reload to ensure consistency
            loadProxyHosts();
        } catch (err) {
            alert(t.saveFail + (err.response?.data?.error?.message || err.message));
            loadProxyHosts(); // Revert/Reload on error
        }
    };

    const handlePortScan = async () => {
        if (!scanTarget) {
            alert(t.enterScanIp);
            return;
        }

        setScanningPorts(true);
        setScannedPorts([]);

        try {
            const response = await axios.post('/port-scan', { target: scanTarget });
            const { ports, found } = response.data;

            setScannedPorts(ports);
            
            if (found === 0) {
                alert(t.noOpenPortsFound);
            }
        } catch (err) {
            console.error('Scan error:', err);
            alert(t.scanError + (err.response?.data?.error || err.message));
        } finally {
            setScanningPorts(false);
        }
    };

    const handleQuickAdd = (scannedPort) => {
        setFormData({
            ...formData,
            forward_scheme: scannedPort.scheme,
            forward_host: scannedPort.host,
            forward_port: scannedPort.port,
        });
    };

    const handleDeleteHost = async (id) => {
        if (!confirm(t.deleteConfirm)) return;

        // Optimistic update
        const previousHosts = [...proxyHosts];
        setProxyHosts(proxyHosts.filter(h => h.id !== id));

        try {
            await axios.delete(`/proxy-hosts/${id}`);
        } catch (err) {
            alert(t.deleteFail);
            setProxyHosts(previousHosts); // Revert on failure
        }
    };

    const handleDeleteCertificate = async (id) => {
        if (!confirm('Are you sure you want to delete this certificate?')) return;

        // Optimistic update
        const previousCerts = [...sslCertificates];
        setSslCertificates(sslCertificates.filter(c => c.id !== id));

        try {
            await axios.delete(`/certificates/${id}`);
        } catch (err) {
            alert('Failed to delete certificate: ' + (err.response?.data?.error?.message || err.message));
            setSslCertificates(previousCerts); // Revert on failure
        }
    };

    const handleChangeEmail = async (e) => {
        e.preventDefault();
        if (!confirm(t.confirmEmailChange)) return;
        try {
            await axios.post('/auth/change-email', emailForm);
            alert(t.emailChangeSuccess);
            setEmailForm({ password: '', newEmail: '' });
        } catch (err) {
            alert(t.emailChangeFail + (err.response?.data?.error?.message || err.message));
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!confirm(t.confirmPasswordChange)) return;
        try {
            await axios.post('/auth/change-password', passwordForm);
            alert(t.passwordChangeSuccess);
            setPasswordForm({ oldPassword: '', newPassword: '' });
        } catch (err) {
            alert(t.passwordChangeFail + (err.response?.data?.error?.message || err.message));
        }
    };

    const handleChangeName = async (e) => {
        e.preventDefault();
        if (!confirm(t.confirmNameChange)) return;
        try {
            const response = await axios.post('/auth/change-name', nameForm);
            alert(t.nameChangeSuccess);

            // Update token and user state
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                // Update axios header
                axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
                // Update parent state
                onUserUpdate({ ...user, name: nameForm.newName });
            }
        } catch (err) {
            alert(t.nameChangeFail + (err.response?.data?.error?.message || err.message));
        }
    };

    const handleIssueCertificate = async (e) => {
        e.preventDefault();
        if (!certFormData.domain_names) {
            alert(t.domainRequired);
            return;
        }
        try {
            const domains = certFormData.domain_names.split(',').map(d => d.trim());
            await axios.post('/certificates', {
                provider: 'letsencrypt',
                nice_name: domains[0],
                domain_names: domains,
                meta: {}
            });
            loadCertificates();
            setShowAddCertModal(false);
            setCertFormData({ domain_names: '' });
        } catch (error) {
            alert(t.certIssueFail + (error.response?.data?.message || error.message));
        }
    };

    const handleWafUpdate = async (host, updates) => {
        // Optimistic update
        const updatedHost = {
            ...host,
            meta: {
                ...host.meta,
                ...updates
            }
        };
        
        setProxyHosts(prev => prev.map(h => h.id === host.id ? updatedHost : h));

        try {
            await axios.put(`/proxy-hosts/${host.id}`, updates);
        } catch (err) {
            console.error('Failed to update WAF settings:', err);
            // Revert
            setProxyHosts(prev => prev.map(h => h.id === host.id ? host : h));
            alert(t.settingChangeFail);
        }
    };

    const onlineHosts = proxyHosts.filter(h => h.enabled).length;
    const sslEnabled = proxyHosts.filter(h => h.certificate_id > 0).length;
    const totalRequests = 0; // TODO: Implement real stats

    // 테마별 클래스
    const theme = {
        bg: isDark ? 'bg-slate-950' : 'bg-gray-50',
        sidebar: isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
        card: isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200',
        cardHover: isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-50',
        input: isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900',
        text: isDark ? 'text-white' : 'text-gray-900',
        textSecondary: isDark ? 'text-slate-400' : 'text-gray-600',
        divider: isDark ? 'border-slate-800' : 'border-gray-200',
        tableHeader: isDark ? 'bg-slate-800' : 'bg-gray-100',
        modalBg: isDark ? 'bg-slate-900' : 'bg-white',
        modalOverlay: 'bg-black/50',
    };

    // Initialize data on mount
    useEffect(() => {
        loadProxyHosts();
        loadCertificates();
    }, []);

    // Load security data when tab changes
    useEffect(() => {
        if (activeTab === 'security' || activeTab === 'vulnerabilities') {
            if (!securityLoaded) loadSecurityData();
            if (activeTab === 'security') loadGeoipStats();
        }
    }, [activeTab, securityLoaded]);

    return (
        <ErrorBoundary>
        <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
            {/* 모바일 헤더 */}
            <div className={`md:hidden flex items-center justify-between p-4 border-b ${theme.card}`}>
                <div 
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setActiveTab('dashboard')}
                >
                    <Shield className="w-6 h-6 text-blue-600" />
                    <span className={`font-semibold ${theme.text}`}>NPMX</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(true)} className={`p-2 rounded-lg ${theme.cardHover}`}>
                    <Menu className={`w-6 h-6 ${theme.text}`} />
                </button>
            </div>

            <div className="flex">
                {/* 모바일 오버레이 */}
                {isMobileMenuOpen && (
                    <div 
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}

                {/* 사이드바 */}
                <div className={`fixed inset-y-0 left-0 w-64 border-r p-6 flex flex-col transform transition-transform duration-300 z-50 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${theme.sidebar}`}>
                    <div className="flex items-center justify-between mb-6 flex-shrink-0">
                        <div 
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => setActiveTab('dashboard')}
                        >
                            <Shield className="w-6 h-6 text-blue-600" />
                            <div className="overflow-hidden">
                                <p className={`text-lg font-semibold truncate ${theme.text}`}>NPMX</p>
                                <p className={`text-xs truncate ${theme.textSecondary}`}>Proxy Manager</p>
                            </div>
                        </div>
                        <button onClick={() => setIsMobileMenuOpen(false)} className={`md:hidden p-1 rounded-lg ${theme.cardHover}`}>
                            <X className={`w-5 h-5 ${theme.textSecondary}`} />
                        </button>
                    </div>

                    <nav className="space-y-2 flex-1 overflow-y-auto min-h-0 -mx-2 px-2">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'dashboard'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : `${theme.textSecondary} ${theme.cardHover}`
                                }`}
                        >
                            <Activity className="w-5 h-5" />
                            <span className="font-medium">{t.dashboard}</span>
                        </button>

                    <button
                        onClick={() => setActiveTab('hosts')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'hosts'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : `${theme.textSecondary} ${theme.cardHover}`
                            }`}
                    >
                        <Globe className="w-5 h-5" />
                        <span className="font-medium">{t.proxyHosts}</span>
                    </button>



                    {/* 로그 섹션 (접었다 폈다) */}
                    <div className="space-y-1">
                        <button
                            onClick={() => setLogsExpanded(!logsExpanded)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${theme.textSecondary} ${theme.cardHover}`}
                        >
                            <div className="flex items-center gap-3">
                                <BarChart3 className="w-5 h-5" />
                                <span className="font-medium">{t.logs}</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform ${logsExpanded ? 'rotate-180' : ''}`} />
                        </button>

                        {logsExpanded && (
                            <div className="ml-4 space-y-1">
                                <button
                                    onClick={() => setActiveTab('activity')}
                                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm ${activeTab === 'activity'
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : `${theme.textSecondary} ${theme.cardHover}`
                                        }`}
                                >
                                    <Activity className="w-4 h-4" />
                                    <span>{t.activityLog}</span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('logs')}
                                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm ${activeTab === 'logs'
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : `${theme.textSecondary} ${theme.cardHover}`
                                        }`}
                                >
                                    <BarChart3 className="w-4 h-4" />
                                    <span>{t.realtimeLog}</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 보안 섹션 (접었다 폈다) */}
                    <div className="space-y-1">
                        <button
                            onClick={() => setSecurityExpanded(!securityExpanded)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${theme.textSecondary} ${theme.cardHover}`}
                        >
                            <div className="flex items-center gap-3">
                                <Shield className="w-5 h-5" />
                                <span className="font-medium">{t.security}</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform ${securityExpanded ? 'rotate-180' : ''}`} />
                        </button>

                        {securityExpanded && (
                            <div className="ml-4 space-y-1">
                                <button
                                    onClick={() => setActiveTab('security')}
                                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm ${activeTab === 'security'
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : `${theme.textSecondary} ${theme.cardHover}`
                                        }`}
                                >
                                    <Shield className="w-4 h-4" />
                                    <span>{t.securityCenter}</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('vulnerabilities')}
                                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm ${activeTab === 'vulnerabilities'
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : `${theme.textSecondary} ${theme.cardHover}`
                                        }`}
                                >
                                    <AlertCircle className="w-4 h-4" />
                                    <span>{t.vulnerabilityManagement}</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('path_blocking')}
                                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm ${activeTab === 'path_blocking'
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : `${theme.textSecondary} ${theme.cardHover}`
                                        }`}
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>{t.pathBlocking}</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('bot_blocking')}
                                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm ${activeTab === 'bot_blocking'
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : `${theme.textSecondary} ${theme.cardHover}`
                                        }`}
                                >
                                    <Cpu className="w-4 h-4" />
                                    <span>{t.botBlocking}</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('waf')}
                                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm ${activeTab === 'waf'
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : `${theme.textSecondary} ${theme.cardHover}`
                                        }`}
                                >
                                    <Shield className="w-4 h-4" />
                                    <span>{t.wafSettings}</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('ssl')}
                                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm ${activeTab === 'ssl'
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : `${theme.textSecondary} ${theme.cardHover}`
                                        }`}
                                >
                                    <LockIcon className="w-4 h-4" />
                                    <span>{t.sslCertificates}</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'settings'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : `${theme.textSecondary} ${theme.cardHover}`
                            }`}
                    >
                        <SettingsIcon className="w-5 h-5" />
                        <span className="font-medium">{t.settings}</span>
                    </button>
                </nav>

                {/* 로그아웃 및 사용자 프로필 */}
                <div className="mt-auto pt-6 space-y-4 flex-shrink-0">
                    <div className={`${theme.card} p-4 rounded-lg border`}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                                {user.email[0].toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                                <p className={`text-sm font-medium truncate ${theme.text}`}>{user.name}</p>
                                <p className={`text-xs truncate ${theme.textSecondary}`}>{user.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setActiveTab('account')}
                            className="w-full text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded transition-colors dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-300"
                        >
                            {t.account}
                        </button>
                    </div>

                    <button
                        onClick={onLogout}
                        className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg border ${theme.card} ${theme.cardHover} ${theme.text}`}
                    >
                        <LogOut className="w-4 h-4" />
                        <span>{t.logout}</span>
                    </button>
                </div>
            </div>

            {/* 메인 컨텐츠 */}
            <div className="md:ml-64 ml-0 p-4 md:p-8 w-full">

                {/* 대시보드 탭 */}
                {activeTab === 'dashboard' && (
                    <Dashboard
                        theme={theme}
                        proxyHosts={proxyHosts}
                        systemInfo={systemInfo}
                        logs={logs}
                        activityLogs={activityLogs}
                        loadActivityLogs={loadActivityLogs}
                        renderActivityText={renderActivityText}
                        activityLoading={activityLoading}
                        t={t}
                    />
                )}

                <Security
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    theme={theme}
                    securityData={securityData}
                    securityLoading={securityLoading}
                    loadSecurityData={loadSecurityData}
                    geoipStats={geoipStats}
                    geoipStatsLoading={geoipStatsLoading}
                    loadGeoipStats={loadGeoipStats}
                    newVuln={newVuln}
                    setNewVuln={setNewVuln}
                    addVulnerability={addVulnerability}
                    updateVulnerability={updateVulnerability}
                    deleteVulnerability={deleteVulnerability}
                    newPathBlock={newPathBlock}
                    setNewPathBlock={setNewPathBlock}
                    addPathBlock={addPathBlock}
                    updatePathBlock={updatePathBlock}
                    deletePathBlock={deletePathBlock}
                    proxyHosts={proxyHosts}
                    sslCertificates={sslCertificates}
                    toggleWafRule={toggleWafRule}
                    handleWafUpdate={handleWafUpdate}
                    toggleBotRule={toggleBotRule}
                    isDark={isDark}
                    handleEditHostSecurity={handleEditHostSecurity}
                    t={t}
                />

                {/* 프록시 호스트 탭 */}
                {activeTab === 'hosts' && (
                    <ProxyHosts
                        theme={theme}
                        t={t}
                        proxyHosts={proxyHosts}
                        isLoading={isLoading}
                        handleCreateHost={handleCreateHost}
                        handleEditHost={handleEditHost}
                        handleDeleteHost={handleDeleteHost}
                    />
                )}

                {/* 실시간 로그 탭 */}
                {activeTab === 'logs' && (
                    <Logs
                        theme={theme}
                        loadLogs={loadLogs}
                        logFilters={logFilters}
                        handleLogFilterChange={handleLogFilterChange}
                        setLogFilters={setLogFilters}
                        saveLogSettings={saveLogSettings}
                        logSettingsSaving={logSettingsSaving}
                        logSettingsDraft={logSettingsDraft}
                        setLogSettingsDraft={setLogSettingsDraft}
                        logSettings={logSettings}
                        logEntries={logEntries}
                        logLoading={logLoading}
                        t={t}
                    />
                )}

                {/* SSL 인증서 탭 */}
                {activeTab === 'ssl' && (
                    <SSLCertificates
                        theme={theme}
                        t={t}
                        sslCertificates={sslCertificates}
                        setShowAddCertModal={setShowAddCertModal}
                        handleDeleteCertificate={handleDeleteCertificate}
                    />
                )}

                {/* 활동 로그 탭 */}
                {activeTab === 'activity' && (
                    <ActivityLog
                        theme={theme}
                        language={language}
                        activityStats={activityStats}
                        activityFilter={activityFilter}
                        handleActivityFilterChange={handleActivityFilterChange}
                        loadActivityStats={loadActivityStats}
                        handleActivitySearch={handleActivitySearch}
                        setActivityFilter={setActivityFilter}
                        loadActivityLogs={loadActivityLogs}
                        activityLogs={activityLogs}
                        activityLoading={activityLoading}
                        renderActivityText={renderActivityText}
                        handleExportActivityLogs={handleExportActivityLogs}
                    />
                )}

                {/* 설정 탭 */}
                {activeTab === 'settings' && (
                    <Settings
                        theme={theme}
                        t={t}
                        showGeneralSettings={showGeneralSettings}
                        setShowGeneralSettings={setShowGeneralSettings}
                        language={language}
                        setLanguage={setLanguage}
                        isDark={isDark}
                        setIsDark={setIsDark}
                        showProxySettings={showProxySettings}
                        setShowProxySettings={setShowProxySettings}
                        http3Enabled={http3Enabled}
                        setHttp3Enabled={setHttp3Enabled}
                        showBackupSection={showBackupSection}
                        setShowBackupSection={setShowBackupSection}
                        backupDownloading={backupDownloading}
                        handleDownloadBackup={handleDownloadBackup}
                        restoreFile={restoreFile}
                        setRestoreFile={setRestoreFile}
                        restoreUploading={restoreUploading}
                        handleRestoreBackup={handleRestoreBackup}
                        showDefaultPageSection={showDefaultPageSection}
                        setShowDefaultPageSection={setShowDefaultPageSection}
                        defaultPageSettings={defaultPageSettings}
                        setDefaultPageSettings={setDefaultPageSettings}
                        handleSaveDefaultPage={handleSaveDefaultPage}
                    />
                )}

                {/* 계정 관리 탭 */}
                {activeTab === 'account' && (
                    <div className={`${theme.card} rounded-xl border shadow-sm overflow-hidden`}>
                        <div className={`p-6 ${theme.divider} border-b`}>
                            <h2 className={`text-xl font-semibold flex items-center gap-2 ${theme.text}`}>
                                <SettingsIcon className="w-5 h-5 text-blue-600" />
                                {t.accountSettings}
                            </h2>
                        </div>

                        <div className="p-6">
                            <div className={`p-6 rounded-lg border ${theme.card}`}>
                                <div className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-4">
                                    {/* 프로필 사진: 이름/이메일/비밀번호 옆(이메일 행 위치) */}
                                    <div className="col-start-1 row-start-2 relative w-24">
                                        {/* absolute로 올려서 row 높이에 영향 없게 */}
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2">
                                            <div className="relative group">
                                                <button
                                                    type="button"
                                                    onClick={() => profileFileInputRef.current?.click()}
                                                    className="relative w-24 h-24 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    aria-label={t.changeProfileImage}
                                                >
                                                        {profileImageUrl ? (
                                                            <img
                                                                src={profileImageUrl}
                                                                alt="Profile"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                        <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-3xl">
                                                            {user.email[0].toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Pencil className="w-5 h-5 text-white" />
                                                    </div>
                                                </button>
                                                <input
                                                    ref={profileFileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleProfileImageChange}
                                                    className="hidden"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 이름 */}
                                    <div className="col-start-2 row-start-1">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <h4 className={`font-medium text-sm ${theme.textSecondary}`}>{t.name}</h4>
                                                {editingField === 'name' ? null : (
                                                    <p className={`text-lg font-semibold ${theme.text}`}>{user.name}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setEditingField(editingField === 'name' ? null : 'name')}
                                                className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                {editingField === 'name' ? t.cancel : t.change}
                                            </button>
                                        </div>
                                        {editingField === 'name' ? (
                                            <form onSubmit={handleChangeName} className="space-y-3 mt-3">
                                                <input
                                                    type="text"
                                                    value={nameForm.newName}
                                                    onChange={(e) => setNameForm({ ...nameForm, newName: e.target.value })}
                                                    className={`w-full ${theme.input} border rounded px-3 py-2 text-sm`}
                                                    required
                                                />
                                                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors text-sm">
                                                    {t.save}
                                                </button>
                                            </form>
                                        ) : null}
                                    </div>

                                    {/* 이메일 */}
                                    <div className="col-start-2 row-start-2">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <h4 className={`font-medium text-sm ${theme.textSecondary}`}>{t.email}</h4>
                                                {editingField === 'email' ? null : (
                                                    <p className={`text-lg font-semibold ${theme.text}`}>{user.email}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setEditingField(editingField === 'email' ? null : 'email')}
                                                className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                {editingField === 'email' ? t.cancel : t.change}
                                            </button>
                                        </div>
                                        {editingField === 'email' ? (
                                            <form onSubmit={handleChangeEmail} className="space-y-3 mt-3">
                                                <input
                                                    type="email"
                                                    value={emailForm.newEmail}
                                                    onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                                                    className={`w-full ${theme.input} border rounded px-3 py-2 text-sm`}
                                                    required
                                                />
                                                <input
                                                    type="password"
                                                    value={emailForm.password}
                                                    onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                                                    placeholder={t.currentPassword}
                                                    className={`w-full ${theme.input} border rounded px-3 py-2 text-sm`}
                                                    required
                                                />
                                                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors text-sm">
                                                    {t.save}
                                                </button>
                                            </form>
                                        ) : null}
                                    </div>

                                    {/* 비밀번호 */}
                                    <div className="col-start-2 row-start-3">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <h4 className={`font-medium text-sm ${theme.textSecondary}`}>{t.password}</h4>
                                                {editingField === 'password' ? null : (
                                                    <p className={`text-lg font-semibold ${theme.text}`}>••••••••</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setEditingField(editingField === 'password' ? null : 'password')}
                                                className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                {editingField === 'password' ? t.cancel : t.change}
                                            </button>
                                        </div>
                                        {editingField === 'password' ? (
                                            <form onSubmit={handleChangePassword} className="space-y-3 mt-3">
                                                <input
                                                    type="password"
                                                    value={passwordForm.oldPassword}
                                                    onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                                                    placeholder={t.currentPassword}
                                                    className={`w-full ${theme.input} border rounded px-3 py-2 text-sm`}
                                                    required
                                                />
                                                <input
                                                    type="password"
                                                    value={passwordForm.newPassword}
                                                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                                    placeholder={t.newPassword}
                                                    className={`w-full ${theme.input} border rounded px-3 py-2 text-sm`}
                                                    required
                                                />
                                                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors text-sm">
                                                    {t.save}
                                                </button>
                                            </form>
                                        ) : null}
                                    </div>

                                    {/* 2차 인증 (OTP) */}
                                    <div className="col-start-2 row-start-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <h4 className={`font-medium text-sm ${theme.textSecondary}`}>{t.twoFactorAuth}</h4>
                                                <p className={`text-lg font-semibold ${theme.text}`}>
                                                    {twoFactor.enabled ? t.activated : t.deactivated}
                                                </p>
                                            </div>
                                            {!twoFactor.enabled && !twoFactor.setup && (
                                                <button
                                                    type="button"
                                                    onClick={startTwoFactorSetup}
                                                    disabled={twoFactor.loading}
                                                    className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                                >
                                                    {t.activate}
                                                </button>
                                            )}
                                        </div>

                                        {!twoFactor.enabled && twoFactor.setup && (
                                            <div className="mt-3 space-y-3">
                                                <div className={`p-4 rounded-lg border ${theme.card}`}>
                                                    <p className={`text-sm ${theme.textSecondary} mb-3`}>
                                                        {t.otpDesc}
                                                    </p>
                                                    <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                                                        {twoFactor.qrDataUrl ? (
                                                            <img
                                                                src={twoFactor.qrDataUrl}
                                                                alt="OTP QR"
                                                                className="w-[180px] h-[180px] rounded bg-white p-2"
                                                            />
                                                        ) : null}
                                                        <div className="flex-1 min-w-0">
                                                            <div className={`text-xs ${theme.textSecondary}`}>{t.secretKey}</div>
                                                            <div className={`mt-1 font-mono text-sm ${theme.text} break-all`}>
                                                                {twoFactor.setup?.secret}
                                                            </div>
                                                            <div className="mt-3">
                                                                <label className={`block text-sm mb-1 ${theme.textSecondary}`}>OTP</label>
                                                                <input
                                                                    inputMode="numeric"
                                                                    autoComplete="one-time-code"
                                                                    placeholder={t.sixDigits}
                                                                    value={twoFactor.otp}
                                                                    onChange={(e) => setTwoFactor((prev) => ({ ...prev, otp: e.target.value }))}
                                                                    className={`w-full ${theme.input} border rounded px-3 py-2 text-sm`}
                                                                />
                                                            </div>
                                                            <div className="mt-3 flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={enableTwoFactor}
                                                                    disabled={twoFactor.loading}
                                                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                                                >
                                                                    {t.confirm}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setTwoFactor((prev) => ({ ...prev, setup: null, otp: '', qrDataUrl: '' }))}
                                                                    disabled={twoFactor.loading}
                                                                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                                                >
                                                                    {t.cancel}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Certificate Modal */}
                {showAddCertModal && (
                    <div className={`fixed inset-0 ${theme.modalOverlay} backdrop-blur-sm flex items-center justify-center p-4 z-50`}>
                        <div className={`${theme.modalBg} rounded-xl border ${theme.divider} max-w-md w-full shadow-2xl`}>
                            <div className={`flex justify-between items-center p-6 border-b ${theme.divider}`}>
                                <h3 className={`text-lg font-semibold ${theme.text}`}>{t.addCertificate}</h3>
                                <button onClick={() => setShowAddCertModal(false)} className={theme.textSecondary}>
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6">
                                <div className={`p-4 border rounded-lg ${theme.card} mb-6`}>
                                    <h4 className={`font-semibold mb-3 ${theme.text}`}>{t.letsEncrypt}</h4>
                                    <p className={`text-sm ${theme.textSecondary} mb-3`}>
                                        {t.letsEncryptDesc}
                                    </p>
                                    <form onSubmit={handleIssueCertificate}>
                                        <div className="mb-4">
                                            <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>{t.domainNames}</label>
                                            <input
                                                type="text"
                                                value={certFormData.domain_names}
                                                onChange={(e) => setCertFormData({ ...certFormData, domain_names: e.target.value })}
                                                placeholder="example.com, www.example.com"
                                                className={`w-full ${theme.input} border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                required
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-colors"
                                        >
                                            {t.issueRequest}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 호스트 추가 모달 */}
                {showAddModal && (
                    <div
                        className={`fixed inset-0 ${theme.modalOverlay} backdrop-blur-sm flex items-center justify-center p-4 z-50`}
                        onClick={() => setShowAddModal(false)}
                    >
                        <div
                            className={`${theme.modalBg} rounded-xl border ${theme.divider} max-w-7xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Left Panel - Port Scanner */}
                            <div className={`w-80 ${theme.sidebar} border-r ${theme.divider} p-6 overflow-y-auto`}>
                                <h4 className={`text-lg font-bold mb-4 ${theme.text}`}>{t.portScanner}</h4>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>{t.targetIp}</label>
                                        <input
                                            type="text"
                                            value={scanTarget}
                                            onChange={(e) => setScanTarget(e.target.value)}
                                            placeholder="192.168.1.100"
                                            className={`w-full ${theme.input} border rounded-lg px-3 py-2 text-sm`}
                                        />
                                    </div>

                                    <button
                                        onClick={handlePortScan}
                                        disabled={scanningPorts}
                                        className={`w-full px-4 py-2 rounded-lg font-semibold transition-colors ${
                                            scanningPorts 
                                                ? 'bg-gray-400 cursor-not-allowed' 
                                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                    >
                                        {scanningPorts ? t.scanning : t.startScan}
                                    </button>

                                    {scanningPorts && (
                                        <div className={`text-xs ${theme.textSecondary} text-center`}>
                                            <p>{t.scanningDesc}</p>
                                            <p className="mt-1">{t.pleaseWait}</p>
                                        </div>
                                    )}

                                    {!scanningPorts && scannedPorts.length === 0 && (
                                        <div className={`text-xs ${theme.textSecondary} p-3 rounded-lg ${theme.card} border ${theme.divider}`}>
                                            <p className="font-semibold mb-1">💡 {t.usage}</p>
                                            <p>{t.usage1}</p>
                                            <p>{t.usage2}</p>
                                            <p>{t.usage3}</p>
                                        </div>
                                    )}

                                    {scannedPorts.length > 0 && (
                                        <div className="mt-4">
                                            <h5 className={`text-sm font-semibold mb-2 ${theme.text}`}>{t.foundServices} ({scannedPorts.length})</h5>
                                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                                {scannedPorts.map((port, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`p-3 rounded-lg border ${theme.card} hover:border-blue-500 cursor-pointer transition-colors`}
                                                        onClick={() => handleQuickAdd(port)}
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className={`font-mono text-sm font-semibold ${theme.text}`}>
                                                                {port.scheme}://{port.host}:{port.port}
                                                            </span>
                                                            <span className="text-xs text-green-600 font-semibold">OPEN</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${port.serviceColor}`}>
                                                                {port.serviceName}
                                                            </span>
                                                            <span className={`text-xs ${theme.textSecondary}`}>← {t.clickToEnter}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Panel - Form */}
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className={`p-6 border-b ${theme.divider}`}>
                                    <h3 className={`text-2xl font-bold ${theme.text}`}>{editingHost ? t.editProxyHost : t.addProxyHost}</h3>
                                </div>

                                <div className="flex border-b border-gray-200 dark:border-slate-700">
                                    {['details', 'custom_locations', 'ssl', 'security', 'advanced'].map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setModalTab(tab)}
                                            className={`flex-1 py-3 text-sm font-medium transition-colors ${modalTab === tab
                                                ? 'border-b-2 border-blue-600 text-blue-600'
                                                : `text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200`
                                                }`}
                                        >
                                            {tab === 'details' && t.details}
                                            {tab === 'custom_locations' && t.customLocations}
                                            {tab === 'ssl' && t.ssl}
                                            {tab === 'security' && t.security}
                                            {tab === 'advanced' && t.advanced}
                                        </button>
                                    ))}
                                </div>

                                <div className="p-6 overflow-y-auto flex-1">
                                {modalTab === 'details' && (
                                    <div className="space-y-5">
                                        <div>
                                            <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>{t.domainNames}</label>
                                <input
                                    type="text"
                                    value={formData.domain_names}
                                    onChange={(e) => setFormData({ ...formData, domain_names: e.target.value })}
                                    placeholder="example.com, www.example.com"
                                    className={`w-full ${theme.input} border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                />
                                        </div>

                                        <div className="flex gap-4">
                                <div className="w-1/4">
                                    <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>{t.scheme}</label>
                                    <select
                                        value={formData.forward_scheme}
                                        onChange={(e) => setFormData({ ...formData, forward_scheme: e.target.value })}
                                        className={`w-full ${theme.input} border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    >
                                        <option value="http">http</option>
                                        <option value="https">https</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>{t.forwardHostIp}</label>
                                    <input
                                        type="text"
                                        value={formData.forward_host}
                                        onChange={(e) => setFormData({ ...formData, forward_host: e.target.value })}
                                        placeholder="127.0.0.1"
                                        className={`w-full ${theme.input} border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    />
                                </div>
                                <div className="w-1/4">
                                    <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>{t.port}</label>
                                    <input
                                        type="number"
                                        value={formData.forward_port}
                                        onChange={(e) => setFormData({ ...formData, forward_port: e.target.value })}
                                        placeholder="80"
                                        className={`w-full ${theme.input} border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    />
                                </div>
                                        </div>

                                        <div className="space-y-3">
                                <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer ${theme.card}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.caching_enabled}
                                        onChange={(e) => setFormData({ ...formData, caching_enabled: e.target.checked })}
                                        className="w-5 h-5 text-blue-600"
                                    />
                                    <div>
                                        <p className={`font-semibold ${theme.text}`}>{t.caching}</p>
                                        <p className={`text-sm ${theme.textSecondary}`}>{t.cachingDesc}</p>
                                    </div>
                                </label>

                                <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer ${theme.card}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.allow_websocket_upgrade}
                                        onChange={(e) => setFormData({ ...formData, allow_websocket_upgrade: e.target.checked })}
                                        className="w-5 h-5 text-blue-600"
                                    />
                                    <div>
                                        <p className={`font-semibold ${theme.text}`}>{t.websocket}</p>
                                        <p className={`text-sm ${theme.textSecondary}`}>{t.websocketDesc}</p>
                                    </div>
                                </label>

                                <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer ${theme.card}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.enabled}
                                        onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                                        className="w-5 h-5 text-blue-600"
                                    />
                                    <div>
                                        <p className={`font-semibold ${theme.text}`}>{t.enabled}</p>
                                        <p className={`text-sm ${theme.textSecondary}`}>{t.enableProxyHostDesc}</p>
                                    </div>
                                </label>

                                        </div>
                                    </div>
                                )}

                                {modalTab === 'custom_locations' && (
                                    <div className="space-y-4">
                                        <button
                                            onClick={() => setFormData({
                                                ...formData,
                                                custom_locations: [...(formData.custom_locations || []), {
                                                    path: '/',
                                                    forward_scheme: 'http',
                                                    forward_host: '',
                                                    forward_port: 80,
                                                    advanced_config: ''
                                                }]
                                            })}
                                            className="flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700"
                                        >
                                            <Plus className="w-4 h-4" />
                                            {t.addLocation}
                                        </button>

                                        {(formData.custom_locations || []).map((loc, idx) => (
                                            <div key={idx} className={`p-4 border rounded-lg ${theme.card} space-y-3`}>
                                                <div className="flex justify-between items-center">
                                                    <h4 className={`font-semibold ${theme.text}`}>{t.location} #{idx + 1}</h4>
                                                    <button
                                            onClick={() => {
                                                const newLocs = [...formData.custom_locations];
                                                newLocs.splice(idx, 1);
                                                setFormData({ ...formData, custom_locations: newLocs });
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-semibold mb-1 ${theme.text}`}>{t.path}</label>
                                        <input
                                            type="text"
                                            value={loc.path}
                                            onChange={(e) => {
                                                const newLocs = [...formData.custom_locations];
                                                newLocs[idx].path = e.target.value;
                                                setFormData({ ...formData, custom_locations: newLocs });
                                            }}
                                            className={`w-full ${theme.input} border rounded px-3 py-2`}
                                            placeholder="/api"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="w-1/4">
                                            <label className={`block text-sm font-semibold mb-1 ${theme.text}`}>{t.scheme}</label>
                                            <select
                                                value={loc.forward_scheme}
                                                onChange={(e) => {
                                                    const newLocs = [...formData.custom_locations];
                                                    newLocs[idx].forward_scheme = e.target.value;
                                                    setFormData({ ...formData, custom_locations: newLocs });
                                                }}
                                                className={`w-full ${theme.input} border rounded px-3 py-2`}
                                            >
                                                <option value="http">http</option>
                                                <option value="https">https</option>
                                            </select>
                                        </div>
                                        <div className="flex-1">
                                            <label className={`block text-sm font-semibold mb-1 ${theme.text}`}>{t.host}</label>
                                            <input
                                                type="text"
                                                value={loc.forward_host}
                                                onChange={(e) => {
                                                    const newLocs = [...formData.custom_locations];
                                                    newLocs[idx].forward_host = e.target.value;
                                                    setFormData({ ...formData, custom_locations: newLocs });
                                                }}
                                                className={`w-full ${theme.input} border rounded px-3 py-2`}
                                                placeholder="127.0.0.1"
                                            />
                                        </div>
                                        <div className="w-1/4">
                                            <label className={`block text-sm font-semibold mb-1 ${theme.text}`}>{t.port}</label>
                                            <input
                                                type="number"
                                                value={loc.forward_port}
                                                onChange={(e) => {
                                                    const newLocs = [...formData.custom_locations];
                                                    newLocs[idx].forward_port = parseInt(e.target.value);
                                                    setFormData({ ...formData, custom_locations: newLocs });
                                                }}
                                                className={`w-full ${theme.input} border rounded px-3 py-2`}
                                                placeholder="80"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-semibold mb-1 ${theme.text}`}>{t.advancedConfig}</label>
                                        <textarea
                                            value={loc.advanced_config}
                                            onChange={(e) => {
                                                const newLocs = [...formData.custom_locations];
                                                newLocs[idx].advanced_config = e.target.value;
                                                setFormData({ ...formData, custom_locations: newLocs });
                                            }}
                                            className={`w-full ${theme.input} border rounded px-3 py-2 h-20 font-mono text-xs`}
                                            placeholder="Nginx directives..."
                                        />
                                    </div>
                                </div>
                                        ))}
                                    </div>
                                )}

                                {modalTab === 'ssl' && (
                                    <div className="space-y-5">
                                        <div>
                                            <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>{t.sslCertificates}</label>
                                <select
                                    value={formData.certificate_id}
                                    onChange={async (e) => {
                                        if (e.target.value === 'new') {
                                            if (!formData.domain_names) {
                                                alert(t.domainRequired);
                                                return;
                                            }


                                            try {
                                                const domains = formData.domain_names.split(',').map(d => d.trim());
                                                const response = await axios.post('/certificates', {
                                                    provider: 'letsencrypt',
                                                    nice_name: domains[0],
                                                    domain_names: domains,
                                                    meta: {}
                                                });
                                                // Refresh certificates list
                                                const certsResponse = await axios.get('/certificates');
                                                setSslCertificates(certsResponse.data);

                                                // Select the new certificate
                                                setFormData({ ...formData, certificate_id: response.data.id });
                                            } catch (error) {
                                                alert(t.certIssueFail + ' ' + (error.response?.data?.message || error.message));
                                            }
                                        } else {
                                            setFormData({ ...formData, certificate_id: parseInt(e.target.value) });
                                        }
                                    }}
                                    className={`w-full ${theme.input} border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                >
                                    <option value="0">{t.none}</option>
                                    <option value="new">{t.newCert}</option>
                                    {sslCertificates.map(cert => (
                                        <option key={cert.id} value={cert.id}>
                                            {cert.nice_name} ({cert.provider})
                                        </option>
                                    ))}
                                </select>
                            </div>



                            <div className="space-y-3">
                                <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer ${theme.card}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.ssl_forced}
                                        onChange={(e) => setFormData({ ...formData, ssl_forced: e.target.checked })}
                                        className="w-5 h-5 text-blue-600"
                                    />
                                    <div>
                                        <p className={`font-semibold ${theme.text}`}>{t.httpsForced}</p>
                                        <p className={`text-sm ${theme.textSecondary}`}>{t.httpsForcedDesc}</p>
                                    </div>
                                </label>

                                <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer ${theme.card}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.hsts_enabled}
                                        onChange={(e) => setFormData({ ...formData, hsts_enabled: e.target.checked })}
                                        className="w-5 h-5 text-blue-600"
                                    />
                                    <div className="flex-1">
                                        <p className={`font-semibold ${theme.text}`}>HSTS</p>
                                        <p className={`text-sm ${theme.textSecondary}`}>{t.hstsDesc}</p>
                                        <label className="inline-flex items-center gap-2 text-xs mt-1">
                                            <input
                                                type="checkbox"
                                                checked={formData.hsts_subdomains}
                                                onChange={(e) => setFormData({ ...formData, hsts_subdomains: e.target.checked })}
                                            />
                                            <span className={theme.textSecondary}>{t.includeSubDomains}</span>
                                        </label>
                                    </div>
                                </label>

                                <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer ${theme.card}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.http3_support}
                                        onChange={(e) => setFormData({ ...formData, http3_support: e.target.checked })}
                                        className="w-5 h-5 text-blue-600"
                                    />
                                    <div>
                                        <p className={`font-semibold ${theme.text}`}>{t.http3}</p>
                                        <p className={`text-sm ${theme.textSecondary}`}>{t.http3Desc}</p>
                                    </div>
                                </label>

                                <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer ${theme.card}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.brotli_enabled}
                                        onChange={(e) => setFormData({ ...formData, brotli_enabled: e.target.checked })}
                                        className="w-5 h-5 text-blue-600"
                                    />
                                    <div>
                                        <p className={`font-semibold ${theme.text}`}>{t.brotli}</p>
                                        <p className={`text-sm ${theme.textSecondary}`}>{t.brotliDesc}</p>
                                    </div>
                                </label>

                                <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer ${theme.card}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.security_headers_enabled}
                                        onChange={(e) => setFormData({ ...formData, security_headers_enabled: e.target.checked })}
                                        className="w-5 h-5 text-blue-600"
                                    />
                                    <div>
                                        <p className={`font-semibold ${theme.text}`}>{t.securityHeaders}</p>
                                        <p className={`text-sm ${theme.textSecondary}`}>X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection, Permissions-Policy</p>
                                    </div>
                                </label>
                                        </div>
                                    </div>
                                )}

                                {modalTab === 'security' && (
                                    <div className="space-y-5">
                                        {/* Security Level */}
                                        <div className={`p-4 rounded-lg border ${theme.card}`}>
                                            <div className="flex items-center justify-between mb-4">
                                                <p className={`font-semibold ${theme.text}`}>🔒 {t.securityLevel}</p>
                                                <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                                                    formData.security_level === 1 ? 'bg-green-500 text-white' :
                                                    formData.security_level === 2 ? 'bg-blue-500 text-white' :
                                                    formData.security_level === 3 ? 'bg-yellow-500 text-white' :
                                                    formData.security_level === 4 ? 'bg-orange-500 text-white' :
                                                    'bg-red-500 text-white'
                                                }`}>
                                                    {formData.security_level === 1 ? t.veryLow :
                                                     formData.security_level === 2 ? t.low :
                                                     formData.security_level === 3 ? t.medium :
                                                     formData.security_level === 4 ? t.high :
                                                     t.veryHigh}
                                                </span>
                                            </div>
                                            
                                            {/* Slider (5-step fixed bar for perfect alignment) */}
                                            {(() => {
                                                const thumbSizePx = 28;
                                                const halfThumbPx = thumbSizePx / 2;
                                                const level = formData.security_level || 1;

                                                const applySecurityLevel = (nextLevel) => {
                                                    const configs = [
                                                        { waf_enabled: false, waf_mode: 'DetectionOnly', block_exploits: false, waf_paranoia_level: 1 },
                                                        { waf_enabled: true, waf_mode: 'DetectionOnly', block_exploits: true, waf_paranoia_level: 2 },
                                                        { waf_enabled: true, waf_mode: 'DetectionOnly', block_exploits: true, waf_paranoia_level: 3 },
                                                        { waf_enabled: true, waf_mode: 'On', block_exploits: true, waf_paranoia_level: 3 },
                                                        { waf_enabled: true, waf_mode: 'On', block_exploits: true, waf_paranoia_level: 4 }
                                                    ];
                                                    setFormData({ ...formData, security_level: nextLevel, ...configs[nextLevel - 1] });
                                                };

                                                // Labels are centered in 5 equal columns, so align steps to 10/30/50/70/90%.
                                                const positions = [10, 30, 50, 70, 90];

                                                return (
                                                    <>
                                                        <div
                                                            className=""
                                                            style={{
                                                                paddingLeft: `${halfThumbPx}px`,
                                                                paddingRight: `${halfThumbPx}px`
                                                            }}
                                                        >
                                                            <div
                                                                className="relative h-3 rounded-lg cursor-pointer"
                                                                style={{
                                                                    background: `linear-gradient(to right, rgb(34, 197, 94), rgb(59, 130, 246), rgb(234, 179, 8), rgb(249, 115, 22), rgb(239, 68, 68))`
                                                                }}
                                                                onClick={(e) => {
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
                                                                    const ratio = rect.width > 0 ? x / rect.width : 0;
                                                                    // Snap to nearest of 5 centered steps.
                                                                    const nearest = Math.round(ratio * 5 + 0.5);
                                                                    applySecurityLevel(Math.min(5, Math.max(1, nearest)));
                                                                }}
                                                            >
                                                                {/* Step markers (clickable) */}
                                                                {positions.map((p, idx) => (
                                                                    <button
                                                                        key={p}
                                                                        type="button"
                                                                        onClick={(ev) => {
                                                                            ev.stopPropagation();
                                                                            applySecurityLevel(idx + 1);
                                                                        }}
                                                                        className="absolute top-1/2 -translate-y-1/2"
                                                                        style={{ left: `${p}%`, transform: 'translate(-50%, -50%)' }}
                                                                        aria-label={`${t.selectSecurityLevel} ${idx + 1}`}
                                                                    >
                                                                        <span
                                                                            className={`block w-2.5 h-2.5 rounded-full ${idx + 1 <= level ? 'bg-white/90' : 'bg-white/50'}`}
                                                                        />
                                                                    </button>
                                                                ))}

                                                                {/* Thumb */}
                                                                <div
                                                                    className="absolute top-1/2"
                                                                    style={{
                                                                        left: `${positions[level - 1]}%`,
                                                                        transform: 'translate(-50%, -50%)',
                                                                        width: `${thumbSizePx}px`,
                                                                        height: `${thumbSizePx}px`
                                                                    }}
                                                                >
                                                                    <div className="w-full h-full rounded-full bg-gray-500 shadow" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div
                                                            className="grid grid-cols-5 text-xs mt-3"
                                                            style={{
                                                                paddingLeft: `${halfThumbPx}px`,
                                                                paddingRight: `${halfThumbPx}px`
                                                            }}
                                                        >
                                                            <button type="button" className="text-center" onClick={() => applySecurityLevel(1)}>{t.veryLow}</button>
                                                            <button type="button" className="text-center" onClick={() => applySecurityLevel(2)}>{t.low}</button>
                                                            <button type="button" className="text-center" onClick={() => applySecurityLevel(3)}>{t.medium}</button>
                                                            <button type="button" className="text-center" onClick={() => applySecurityLevel(4)}>{t.high}</button>
                                                            <button type="button" className="text-center" onClick={() => applySecurityLevel(5)}>{t.veryHigh}</button>
                                                        </div>
                                                    </>
                                                );
                                            })()}

                                            {/* Description */}
                                            <div className={`mt-4 p-3 rounded-lg ${theme.card} border`}>
                                                {formData.security_level === 1 && (
                                                    <div>
                                                        <p className={`font-semibold ${theme.text} mb-1`}>{t.veryLowDesc}</p>
                                                        <p className={`text-sm ${theme.textSecondary}`}>{t.veryLowDetail}</p>
                                                        <ul className={`text-xs ${theme.textSecondary} mt-2 list-disc list-inside`}>
                                                            <li>{t.wafDisabled}</li>
                                                            <li>{t.vulnBlockNone}</li>
                                                            <li>{t.sensitivityLow}</li>
                                                        </ul>
                                                    </div>
                                                )}
                                                {formData.security_level === 2 && (
                                                    <div>
                                                        <p className={`font-semibold ${theme.text} mb-1`}>{t.lowDesc}</p>
                                                        <p className={`text-sm ${theme.textSecondary}`}>{t.lowDetail}</p>
                                                        <ul className={`text-xs ${theme.textSecondary} mt-2 list-disc list-inside`}>
                                                            <li>{t.wafDetection}</li>
                                                            <li>{t.vulnBlockActive}</li>
                                                            <li>{t.sensitivityMediumLow}</li>
                                                        </ul>
                                                    </div>
                                                )}
                                                {formData.security_level === 3 && (
                                                    <div>
                                                        <p className={`font-semibold ${theme.text} mb-1`}>{t.mediumDesc}</p>
                                                        <p className={`text-sm ${theme.textSecondary}`}>{t.mediumDetail}</p>
                                                        <ul className={`text-xs ${theme.textSecondary} mt-2 list-disc list-inside`}>
                                                            <li>{t.wafDetection}</li>
                                                            <li>{t.vulnBlockActive}</li>
                                                            <li>{t.sensitivityMedium}</li>
                                                        </ul>
                                                    </div>
                                                )}
                                                {formData.security_level === 4 && (
                                                    <div>
                                                        <p className={`font-semibold ${theme.text} mb-1`}>{t.highDesc}</p>
                                                        <p className={`text-sm ${theme.textSecondary}`}>{t.highDetail}</p>
                                                        <ul className={`text-xs ${theme.textSecondary} mt-2 list-disc list-inside`}>
                                                            <li>{t.wafBlocking}</li>
                                                            <li>{t.vulnBlockActive}</li>
                                                            <li>{t.sensitivityMedium}</li>
                                                        </ul>
                                                    </div>
                                                )}
                                                {formData.security_level === 5 && (
                                                    <div>
                                                        <p className={`font-semibold ${theme.text} mb-1`}>{t.veryHighDesc}</p>
                                                        <p className={`text-sm ${theme.textSecondary}`}>{t.veryHighDetail}</p>
                                                        <ul className={`text-xs ${theme.textSecondary} mt-2 list-disc list-inside`}>
                                                            <li>{t.wafBlocking}</li>
                                                            <li>{t.vulnBlockActive}</li>
                                                            <li>{t.sensitivityHigh}</li>
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                {/* WAF Enable/Disable */}
                                <div className={`rounded-lg border ${theme.card}`}>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, wafOptionsExpanded: !formData.wafOptionsExpanded })}
                                        className={`w-full flex items-center gap-3 p-4 ${theme.text} hover:${theme.cardHover} transition-colors`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.waf_enabled}
                                            onChange={(e) => setFormData({ ...formData, waf_enabled: e.target.checked })}
                                            className="w-5 h-5 text-blue-600"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="flex-1 text-left">
                                            <p className={`font-semibold ${theme.text}`}>{t.wafEnabled}</p>
                                            <p className={`text-sm ${theme.textSecondary}`}>{t.wafEnabledDesc}</p>
                                        </div>
                                        {formData.waf_enabled && (
                                            <svg className={`w-5 h-5 transition-transform ${formData.wafOptionsExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        )}
                                    </button>

                                    {/* WAF Options */}
                                    {formData.waf_enabled && formData.wafOptionsExpanded && (
                                        <div className="p-4 pt-0 space-y-3">
                                            {/* WAF Mode Selection */}
                                            <div className={`p-4 rounded-lg border ${theme.card}`}>
                                                <p className={`font-semibold mb-3 ${theme.text}`}>{t.wafMode}</p>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, waf_mode: 'DetectionOnly' })}
                                                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${formData.waf_mode === 'DetectionOnly'
                                                            ? 'bg-blue-600 text-white'
                                                            : `${theme.textSecondary} border ${theme.cardHover}`
                                                            }`}
                                                    >
                                                        {t.wafModeDetection}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, waf_mode: 'On' })}
                                                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${formData.waf_mode === 'On'
                                                            ? 'bg-blue-600 text-white'
                                                            : `${theme.textSecondary} border ${theme.cardHover}`
                                                            }`}
                                                    >
                                                        {t.wafModeBlocking}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Block Exploits */}
                                            <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer ${theme.card}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.block_exploits}
                                                    onChange={(e) => setFormData({ ...formData, block_exploits: e.target.checked })}
                                                    className="w-5 h-5 text-blue-600"
                                                />
                                                <div>
                                                    <p className={`font-semibold ${theme.text}`}>{t.blockExploits}</p>
                                                    <p className={`text-sm ${theme.textSecondary}`}>{t.blockExploitsDesc}</p>
                                                </div>
                                            </label>

                                            {/* WAF Paranoia Level */}
                                            <div className={`p-4 rounded-lg border ${theme.card}`}>
                                                <p className={`font-semibold mb-2 ${theme.text}`}>{t.wafParanoiaLevel}</p>
                                                <p className={`text-sm mb-3 ${theme.textSecondary}`}>{t.wafParanoiaDesc}</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {[1, 2, 3, 4].map(level => (
                                                        <button
                                                            key={level}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, waf_paranoia_level: level })}
                                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${formData.waf_paranoia_level === level
                                                                ? 'bg-blue-600 text-white'
                                                                : `${theme.textSecondary} border ${theme.cardHover}`
                                                                }`}
                                                        >
                                                            {t[`wafParanoia${level}`]}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* GeoIP Allow/Deny */}
                                <div className={`rounded-lg border ${theme.card}`}>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, geoipExpanded: !formData.geoipExpanded })}
                                        className={`w-full flex items-center justify-between p-4 ${theme.text} hover:${theme.cardHover} transition-colors`}
                                    >
                                        <span className="font-semibold">🌍 {t.geoipAccessControl}</span>
                                        <svg className={`w-5 h-5 transition-transform ${formData.geoipExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    
                                    {formData.geoipExpanded && (
                                        <div className="p-4 pt-0 space-y-4">
                                            {/* 허용 국가 */}
                                            <div className={`rounded-lg border ${theme.card}`}>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, geoipAllowExpanded: !formData.geoipAllowExpanded })}
                                                    className={`w-full flex items-center justify-between p-3 ${theme.text} hover:${theme.cardHover} transition-colors`}
                                                >
                                                    <span className="text-sm font-semibold">✅ {t.allowedCountries}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs ${theme.textSecondary}`}>
                                                            {allowedCountrySet.size}{t.selectedCount}
                                                        </span>
                                                        <svg className={`w-4 h-4 transition-transform ${formData.geoipAllowExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </button>
                                                {formData.geoipAllowExpanded && (
                                                    <div className="p-3 pt-0">
                                                        <div className={`border rounded-lg p-3 ${theme.card} max-h-48 overflow-y-auto`}>
                                                            <div className="flex flex-wrap gap-2">
                                                                {GEOIP_COUNTRY_OPTIONS.map(country => {
                                                                    const isSelected = allowedCountrySet.has(country.code);
                                                                    return (
                                                                        <label key={country.code} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-colors text-sm ${isSelected ? 'bg-blue-500 text-white' : `${theme.card} border hover:border-blue-400`}`}>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isSelected}
                                                                                onChange={(e) => {
                                                                                    const current = formData.geoip_allow_countries ? formData.geoip_allow_countries.split(',').map(c => c.trim()).filter(c => c) : [];
                                                                                    const updated = e.target.checked
                                                                                        ? [...current, country.code]
                                                                                        : current.filter(c => c !== country.code);
                                                                                    setFormData({ ...formData, geoip_allow_countries: updated.join(', ') });
                                                                                }}
                                                                                className="hidden"
                                                                            />
                                                                            <span>{country.flag} {country.name}</span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                        <p className={`text-xs mt-2 ${theme.textSecondary}`}>{t.allowDesc}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 차단 국가 */}
                                            <div className={`rounded-lg border ${theme.card}`}>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, geoipDenyExpanded: !formData.geoipDenyExpanded })}
                                                    className={`w-full flex items-center justify-between p-3 ${theme.text} hover:${theme.cardHover} transition-colors`}
                                                >
                                                    <span className="text-sm font-semibold">🚫 {t.deniedCountries}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs ${theme.textSecondary}`}>
                                                            {deniedCountrySet.size}{t.selectedCount}
                                                        </span>
                                                        <svg className={`w-4 h-4 transition-transform ${formData.geoipDenyExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </button>
                                                {formData.geoipDenyExpanded && (
                                                    <div className="p-3 pt-0">
                                                        <div className={`border rounded-lg p-3 ${theme.card} max-h-48 overflow-y-auto`}>
                                                            <div className="flex flex-wrap gap-2">
                                                                {GEOIP_COUNTRY_OPTIONS.map(country => {
                                                                    const isSelected = deniedCountrySet.has(country.code);
                                                                    return (
                                                                        <label key={country.code} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-colors text-sm ${isSelected ? 'bg-red-500 text-white' : `${theme.card} border hover:border-red-400`}`}>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isSelected}
                                                                                onChange={(e) => {
                                                                                    const current = formData.geoip_deny_countries ? formData.geoip_deny_countries.split(',').map(c => c.trim()).filter(c => c) : [];
                                                                                    const updated = e.target.checked
                                                                                        ? [...current, country.code]
                                                                                        : current.filter(c => c !== country.code);
                                                                                    setFormData({ ...formData, geoip_deny_countries: updated.join(', ') });
                                                                                }}
                                                                                className="hidden"
                                                                            />
                                                                            <span>{country.flag} {country.name}</span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                        <p className={`text-xs mt-2 ${theme.textSecondary}`}>{t.denyPriorityDesc}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className={`rounded-lg border ${theme.card}`}>
                                                <div className={`flex items-center justify-between p-3 border-b ${theme.divider}`}>
                                                    <div>
                                                        <p className={`text-sm font-semibold ${theme.text}`}>{t.geoipMapTitle}</p>
                                                        <p className={`text-xs ${theme.textSecondary}`}>{t.geoipMapSubtitle}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs">
                                                        <span className="flex items-center gap-1">
                                                            <span className="w-3 h-3 rounded-full bg-red-500" aria-hidden />
                                                            <span className={theme.textSecondary}>{t.geoipMapLegendBlocked}</span>
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <span className="w-3 h-3 rounded-full bg-green-500" aria-hidden />
                                                            <span className={theme.textSecondary}>{t.geoipMapLegendAllowed}</span>
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700" aria-hidden />
                                                            <span className={theme.textSecondary}>{t.geoipMapLegendNeutral}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="p-3">
                                                    <ComposableMap projectionConfig={{ scale: 135 }} width={760} height={360} className="w-full h-auto">
                                                        <Geographies geography={GEOIP_MAP_URL}>
                                                            {({ geographies }) =>
                                                                geographies.map((geo) => {
                                                                    const code = geo.properties?.ISO_A2;
                                                                    const isDenied = code && deniedCountrySet.has(code);
                                                                    const isAllowed = code && allowedCountrySet.has(code);
                                                                    const fill = isDenied
                                                                        ? '#ef4444'
                                                                        : isAllowed
                                                                            ? '#22c55e'
                                                                            : isDark
                                                                                ? '#0f172a'
                                                                                : '#e2e8f0';

                                                                    return (
                                                                        <Geography
                                                                            key={geo.rsmKey}
                                                                            geography={geo}
                                                                            fill={fill}
                                                                            stroke={isDark ? '#1f2937' : '#94a3b8'}
                                                                            strokeWidth={0.5}
                                                                            style={{
                                                                                default: { outline: 'none' },
                                                                                hover: {
                                                                                    outline: 'none',
                                                                                    fill: isDenied
                                                                                        ? '#b91c1c'
                                                                                        : isAllowed
                                                                                            ? '#16a34a'
                                                                                            : isDark
                                                                                                ? '#1f2937'
                                                                                                : '#cbd5e1'
                                                                                },
                                                                                pressed: { outline: 'none' }
                                                                            }}
                                                                        />
                                                                    );
                                                                })
                                                            }
                                                        </Geographies>
                                                    </ComposableMap>
                                                </div>
                                            </div>

                                            <div className={`text-xs ${theme.textSecondary} p-3 rounded ${theme.card} border`}>
                                                <p>💡 {t.geoipTip1}</p>
                                                <p>💡 {t.geoipTip2}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                </div>
                                </div>
                            )}

                            {modalTab === 'advanced' && (
                                <div className="space-y-5">
                                    <div>
                                        <label className={`block text-sm font-semibold mb-2 ${theme.text}`}>{t.customNginxConfig}</label>
                                        <textarea
                                            className={`w-full ${theme.input} border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 h-40 font-mono text-sm`}
                                            placeholder={t.nginxConfigPlaceholder}
                                        ></textarea>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer buttons */}
                        <div className={`p-6 border-t ${theme.divider} flex gap-3`}>
                            <button
                                onClick={handleSubmit}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors shadow-sm"
                            >
                                {t.save}
                            </button>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
                            >
                                {t.cancel}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
            </div>
        </div>
        </div>
        </ErrorBoundary>
);
}

export default function App() {
    const [user, setUser] = useState(null);
    const [isDark, setIsDark] = useState(() => safeLocalStorage.getItem('theme') === 'dark');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing token and validate it
        const token = safeLocalStorage.getItem('token');
        
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            // Validate token by fetching user info
            axios.get('/auth/me')
                .then(response => {
                    setUser(response.data.user || response.data);
                    setIsLoading(false);
                })
                .catch(() => {
                    // Token invalid, clear it
                    safeLocalStorage.removeItem('token');
                    delete axios.defaults.headers.common['Authorization'];
                    setIsLoading(false);
                });
        } else {
            setIsLoading(false);
        }
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) {
        return <Login onLogin={setUser} onBack={() => {}} />;
    }

    return <ProxyManager user={user} onLogout={() => {
        setUser(null);
        safeLocalStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
    }} onUserUpdate={setUser} />;
}
