import React from 'react';
import { 
    Globe, 
    Plus, 
    CheckCircle, 
    XCircle, 
    ExternalLink, 
    Lock, 
    Edit, 
    Trash2 
} from 'lucide-react';

const ProxyHosts = ({ 
    theme, 
    t, 
    proxyHosts, 
    isLoading, 
    handleCreateHost, 
    handleEditHost, 
    handleDeleteHost 
}) => {
    return (
        <div className={`${theme.card} rounded-xl border shadow-sm overflow-hidden`}>
            <div className={`p-6 ${theme.divider} border-b flex items-center justify-between`}>
                <h2 className={`text-xl font-semibold flex items-center gap-2 ${theme.text}`}>
                    <Globe className="w-5 h-5 text-blue-600" />
                    {t.proxyHosts}
                </h2>
                <button
                    onClick={handleCreateHost}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    {t.addHost}
                </button>
            </div>

            <div className="overflow-x-auto">
                {isLoading ? (
                    <div className="flex justify-center items-center p-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className={theme.tableHeader}>
                            <tr>
                                <th className={`px-6 py-4 text-left text-sm font-semibold ${theme.text}`}>{t.status}</th>
                                <th className={`px-6 py-4 text-left text-sm font-semibold ${theme.text}`}>{t.domain}</th>
                                <th className={`px-6 py-4 text-left text-sm font-semibold ${theme.text}`}>{t.forwardAddress}</th>
                                <th className={`px-6 py-4 text-left text-sm font-semibold ${theme.text}`}>{t.ssl}</th>
                                <th className={`px-6 py-4 text-left text-sm font-semibold ${theme.text}`}>{t.http3}</th>
                                <th className={`px-6 py-4 text-left text-sm font-semibold ${theme.text}`}>{t.actions}</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${theme.divider}`}>
                            {proxyHosts.map(host => (
                                <tr key={host.id} className={`transition-colors ${theme.cardHover}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {host.enabled ? (
                                                <>
                                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="w-5 h-5 text-red-500" />
                                                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {host.domain_names.map(d => (
                                            <div key={d} className="flex items-center gap-2">
                                                <span className={`font-semibold ${theme.text}`}>{d}</span>
                                                <a href={`http://${d}`} target="_blank" rel="noreferrer">
                                                    <ExternalLink className={`w-4 h-4 ${theme.textSecondary} hover:text-blue-600 cursor-pointer`} />
                                                </a>
                                            </div>
                                        ))}
                                    </td>
                                    <td className={`px-6 py-4 font-mono text-sm ${theme.textSecondary}`}>
                                        {host.forward_scheme}://{host.forward_host}:{host.forward_port}
                                    </td>
                                    <td className="px-6 py-4">
                                        {host.certificate_id > 0 ? (
                                            <div className="flex items-center gap-2">
                                                <Lock className="w-4 h-4 text-green-500" />
                                                <span className="text-green-600 text-sm font-semibold">{t.enabled}</span>
                                            </div>
                                        ) : (
                                            <span className={`text-sm ${theme.textSecondary}`}>{t.disabled}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {host.http3_support ? (
                                            <span className="text-green-600 text-sm font-semibold">{t.supported}</span>
                                        ) : (
                                            <span className={`text-sm ${theme.textSecondary}`}>{t.unsupported}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEditHost(host)}
                                                className={`p-2 rounded-lg transition-colors ${theme.cardHover}`}
                                            >
                                                <Edit className="w-4 h-4 text-blue-600" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteHost(host.id)}
                                                className={`p-2 rounded-lg transition-colors ${theme.cardHover}`}
                                            >
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ProxyHosts;
