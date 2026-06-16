import React, { useState } from 'react';

export default function Login({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

        try {
            const res = await fetch(`${apiUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Something went wrong');
                setLoading(false);
                return;
            }

            if (isLogin && data.token) {
                onLogin(data.token);
            } else {
                setIsLogin(true);
                setError('Account created! Please log in.');
            }
        } catch (err) {
            setError('Connection error. Is the backend running?');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow">
                <div className="text-center mb-8">
                    <div className="text-4xl mb-2">🌿</div>
                    <h1 className="text-3xl font-bold">LandTrack</h1>
                </div>

                <h2 className="text-2xl font-semibold mb-6 text-center">
                    {isLogin ? 'Sign In' : 'Create Account'}
                </h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border border-gray-300 rounded-2xl px-4 py-3"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded-2xl px-4 py-3"
                        required
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white py-3 rounded-2xl font-medium transition-colors"
                    >
                        {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                <div className="text-center mt-6 text-sm text-gray-600">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                        }}
                        className="text-emerald-600 font-medium hover:underline"
                    >
                        {isLogin ? 'Create one' : 'Sign in instead'}
                    </button>
                </div>
            </div>
        </div>
    );
}