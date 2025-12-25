import React from 'react';
import { 
    Lock, 
    Plus, 
    Shield, 
    Trash2, 
    Clock 
} from 'lucide-react';

const SSLCertificates = ({
    theme,
    t,
    sslCertificates,
    setShowAddCertModal,
    handleDeleteCertificate
}) => {
    return (
        <div className={`${theme.card} rounded-xl border shadow-sm overflow-hidden`}>
            <div className={`p-6 ${theme.divider} border-b flex items-center justify-between`}>
                <h2 className={`text-xl font-semibold flex items-center gap-2 ${theme.text}`}>
                    <Lock className="w-5 h-5 text-blue-600" />
                    {t.sslCertificates}
                </h2>
                <button
                    onClick={() => setShowAddCertModal(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    {t.addCertificate}
                </button>
            </div>

            <div className="p-6 space-y-4">
                {sslCertificates.map(cert => (
                    <div key={cert.id} className={`${theme.card} rounded-lg p-5 border shadow-sm`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <Shield className="w-6 h-6 text-blue-600" />
                                <div>
                                    <h3 className={`font-semibold text-lg ${theme.text}`}>{cert.nice_name}</h3>
                                    <p className={`text-sm ${theme.textSecondary}`}>{cert.provider}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {new Date(cert.expires_on) > new Date() ? (
                                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                                        {t.valid}
                                    </span>
                                ) : (
                                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
                                        {t.expired}
                                    </span>
                                )}
                                <button
                                    onClick={() => handleDeleteCertificate(cert.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Certificate"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className={`flex items-center gap-2 text-sm ${theme.textSecondary}`}>
                            <Clock className="w-4 h-4" />
                            <span>{t.expiresOn} {new Date(cert.expires_on).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SSLCertificates;
