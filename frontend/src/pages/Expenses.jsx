import { useState, useEffect } from 'react';
import { authFetch } from '../utils/api';

export default function Expenses() {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        category: '',
        amount: '',
        description: ''
    });
    const [expenses, setExpenses] = useState([]);
    const [filterCategory, setFilterCategory] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const categories = ['Equipment', 'Fuel', 'Labor', 'Materials', 'Marketing', 'Office', 'Vehicle', 'Other'];

    const fetchExpenses = async (category = '') => {
        try {
            const url = category
                ? `/expenses?category=${category}`
                : '/expenses';

            const response = await authFetch(url);
            const data = await response.json();
            setExpenses(data);
        } catch (error) {
            console.error('Error fetching expenses:', error);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await authFetch('/expenses', {
                method: 'POST',
                body: JSON.stringify({
                    date: formData.date,
                    category: formData.category,
                    amount: parseFloat(formData.amount),
                    description: formData.description
                }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Expense added successfully!' });
                setFormData({
                    date: new Date().toISOString().split('T')[0],
                    category: '',
                    amount: '',
                    description: ''
                });
                fetchExpenses(filterCategory);
            } else {
                const error = await response.json();
                setMessage({ type: 'error', text: error.error || 'Failed to add expense' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Network error' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this expense?')) return;

        try {
            const response = await authFetch(`/expenses/${id}`, { method: 'DELETE' });
            if (response.ok) {
                fetchExpenses(filterCategory);
            } else {
                alert('Failed to delete expense');
            }
        } catch (error) {
            alert('Network error while deleting');
        }
    };

    const handleFilterChange = (category) => {
        setFilterCategory(category);
        fetchExpenses(category);
    };

    return (
        <div className="p-8">
            <div className="max-w-3xl mx-auto">
                {/* Header with Total */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900">Expenses</h1>
                        <p className="text-gray-600">Track all business spending</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-semibold text-red-600">
                            ${totalExpenses.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">{expenses.length} entries</div>
                    </div>
                </div>

                {/* Add Expense Form */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Add New Expense</h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:outline-none focus:border-gray-400"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:outline-none focus:border-gray-400"
                                    required
                                >
                                    <option value="">Select category</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount ($)</label>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                step="0.01"
                                placeholder="0.00"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:outline-none focus:border-gray-400"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                            <input
                                type="text"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="What was this for?"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:outline-none focus:border-gray-400"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 px-6 py-3 bg-gray-900 text-white rounded-2xl font-medium hover:bg-black disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Adding...' : 'Add Expense'}
                        </button>
                    </form>

                    {message.text && (
                        <div className={`mt-4 p-4 rounded-2xl text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}
                </div>

                {/* Expenses List */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">Recent Expenses</h2>

                        <select
                            value={filterCategory}
                            onChange={(e) => handleFilterChange(e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-gray-400"
                        >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto pr-2 space-y-3">
                        {expenses.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No expenses yet. Add your first one above!
                            </div>
                        ) : (
                            expenses.map((expense) => (
                                <div key={expense.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="text-sm text-gray-500 w-24">
                                            {new Date(expense.date).toLocaleDateString()}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">{expense.category}</div>
                                            {expense.description && (
                                                <div className="text-sm text-gray-500">{expense.description}</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-lg font-semibold text-gray-900">
                                            ${parseFloat(expense.amount).toFixed(2)}
                                        </div>

                                        <button
                                            onClick={() => handleDelete(expense.id)}
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
}