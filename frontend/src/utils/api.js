// src/utils/api.js
const BASE_URL = 'http://localhost:5000/api';

export const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem('token');

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${url.startsWith('/') ? url : '/' + url}`, config);

    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Session expired');
    }

    return response;
};