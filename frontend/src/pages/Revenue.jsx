import React, { useState, useEffect } from 'react';

const Revenue = () => {
    const [revenues, setRevenues] = useState([]);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        client_name: '',
        amount: '',
        description: ''
    });
    const [filterClient, setFilterClient] = useState('All');
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchRevenues = async (clientFilter = filterClient) => {
        try {
            const url = clientFilter && clientFilter !== 'All'
                ? `http://localhost:5000/api/revenue?client_name=${encodeURIComponent(clientFilter)}`
                : 'http://localhost:5000/api/revenue';
            const res = await fetch(url);
            const data = await res.json();
            setRevenues(data);
        } catch (err) {
            console.error('Failed to fetch revenues:', err);
        }
    };

    useEffect(() => {
        fetchRevenues();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.client_name || !formData.amount || parseFloat(formData.amount) <= 0) {
            setErrorMessage('Client name and valid amount are required');
            return;
        }
        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const res = await fetch('http://localhost:5000/api/revenue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    amount: parseFloat(formData.amount)
                })
            });
            const result = await res.json();

            if (result.message) {
                setSuccessMessage('Revenue added successfully!');
                setFormData({
                    date: new Date().toISOString().split('T')[0],
                    client_name: '',
                    amount: '',
                    description: ''
                });
                await fetchRevenues();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(result.error || 'Failed to add revenue');
            }
        } catch (err) {
            setErrorMessage('Network error. Is the backend running?');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this revenue entry?')) return;
        try {
            await fetch(`http://localhost:5000/api/revenue/${id}`, { method: 'DELETE' });
            await fetchRevenues();
            setSuccessMessage('Revenue deleted');
            setTimeout(() => setSuccessMessage(''), 2000);
        } catch (err) {
            setErrorMessage('Failed to delete');
        }
    };

    const handleFilterChange = (e) => {
        const newFilter = e.target.value || 'All';
        setFilterClient(newFilter);
        fetchRevenues(newFilter);
    };

    const totalRevenue = revenues.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

    return (
        <div className="p-8">
            <div className="max-w-3xl mx-auto">
                {/* Header with Total - matching Expenses style */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900">Revenue</h1>
                        <p className="text-gray-600">Track business income</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-semibold text-emerald-600">
                            ${totalRevenue.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">{revenues.length} entries</div>
                    </div>
                </div>

                {/* Add Revenue Form */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Add New Revenue</h2>

                    {successMessage && (
                        <div className="mb-4 p-4 rounded-2xl text-sm bg-green-50 text-green-700 border border-green-200">
                            {successMessage}
                        </div>
                    )}
                    {errorMessage && (
                        <div className="mb-4 p-4 rounded-2xl text-sm bg-red-50 text-red-700 border border-red-200">
                            {errorMessage}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:outline-none focus:border-gray-400"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Client / Source</label>
                                <input
                                    type="text"
                                    name="client_name"
                                    value={formData.client_name}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Smith Residence"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:outline-none focus:border-gray-400"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                name="amount"
                                value={formData.amount}
                                onChange={handleInputChange}
                                placeholder="0.00"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:outline-none focus:border-gray-400"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optional)</label>
                            <input
                                type="text"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="e.g. Payment for backyard landscaping project"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:outline-none focus:border-gray-400"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 px-6 py-3 bg-gray-900 text-white rounded-2xl font-medium hover:bg-black disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Adding...' : '+ Add Revenue'}
                        </button>
                    </form>
                </div>

                {/* Revenue List */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">Recent Revenue</h2>
                        <input
                            type="text"
                            placeholder="Filter by client..."
                            value={filterClient === 'All' ? '' : filterClient}
                            onChange={handleFilterChange}
                            className="px-4 py-2 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-gray-400 w-64"
                        />
                    </div>

                    <div className="max-h-[420px] overflow-y-auto pr-2 space-y-3">
                        {revenues.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No revenue entries yet. Add your first one above!
                            </div>
                        ) : (
                            revenues.map((rev) => (
                                <div key={rev.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="text-sm text-gray-500 w-24">
                                            {new Date(rev.date).toLocaleDateString()}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">{rev.client_name}</div>
                                            {rev.description && (
                                                <div className="text-sm text-gray-500">{rev.description}</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-lg font-semibold text-emerald-600">
                                            ${parseFloat(rev.amount).toFixed(2)}
                                        </div>
                                        <button
                                            onClick={() => handleDelete(rev.id)}
                                            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Revenue;