import React, { useState } from 'react';
import axios from 'axios';
import { safeLocalStorage } from './utils';

function Login({ onLogin, onBack }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [showOtp, setShowOtp] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('/auth/login', {
                email,
                password,
                ...(showOtp ? { otp } : {}),
            });
            const { token, user } = response.data;
            const saved = safeLocalStorage.setItem('token', token);
            if (!saved) {
                setError('브라우저 저장소에 접근할 수 없습니다. 시크릿 모드를 해제하거나 쿠키를 활성화해주세요.');
                return;
            }
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            onLogin(user);
        } catch (err) {
            const apiError = err.response?.data?.error;
            if (apiError?.otp_required) {
                setShowOtp(true);
                setError('');
                return;
            }
            if (apiError?.otp_invalid) {
                setError('OTP가 올바르지 않습니다. 다시 입력해주세요.');
                return;
            }
            setError(apiError?.message || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
                    {showOtp ? '2차 인증' : 'NPMX Login'}
                </h2>
                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!showOtp ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors">
                                Login
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="text-center mb-4">
                                <p className="text-sm text-gray-600 mb-1">로그인: {email}</p>
                                <p className="text-xs text-gray-500">인증 앱의 6자리 코드를 입력하세요</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">OTP</label>
                                <input
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    placeholder="6자리"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                    autoFocus
                                />
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors">
                                확인
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowOtp(false);
                                    setOtp('');
                                    setError('');
                                }}
                                className="w-full border border-gray-300 text-gray-700 py-2 rounded hover:bg-gray-50 transition-colors"
                            >
                                취소
                            </button>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}

export default Login;
