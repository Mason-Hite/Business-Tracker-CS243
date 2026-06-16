import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../utils/api';

export default function Dashboard() {
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);
  const [revenueCount, setRevenueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [expRes, revRes] = await Promise.all([
        authFetch('/expenses'),
        authFetch('/revenue')
      ]);

      const expenses = await expRes.json();
      const revenues = await revRes.json();

      const safeExpenses = Array.isArray(expenses) ? expenses : [];
      const safeRevenues = Array.isArray(revenues) ? revenues : [];

      const expTotal = safeExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      const revTotal = safeRevenues.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

      setTotalExpenses(expTotal);
      setTotalRevenue(revTotal);
      setExpenseCount(safeExpenses.length);
      setRevenueCount(safeRevenues.length);

    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
      setError('Failed to load data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load only
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto refresh — disabled for now to stop the loop
  // Uncomment the block below when stable
  /*
  useEffect(() => {
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);
  */

  const profit = totalRevenue - totalExpenses;

  return (
    <div className="p-10 max-w-6xl mx-auto">
      <div className="mb-12">
        <h1 className="text-5xl font-bold text-gray-900">Welcome back 👋</h1>
        <p className="text-gray-600 mt-3 text-xl">Your business at a glance</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-2xl mb-8">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100">
          <div className="uppercase tracking-widest text-emerald-600 text-sm font-semibold">Total Revenue</div>
          <div className="text-5xl font-bold mt-6">
            {loading ? '—' : `$${totalRevenue.toFixed(2)}`}
          </div>
          <div className="mt-6 text-gray-500">{revenueCount} entries</div>
        </div>

        <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100">
          <div className="uppercase tracking-widest text-red-600 text-sm font-semibold">Total Expenses</div>
          <div className="text-5xl font-bold mt-6">
            {loading ? '—' : `$${totalExpenses.toFixed(2)}`}
          </div>
          <div className="mt-6 text-gray-500">{expenseCount} entries</div>
        </div>

        <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100">
          <div className="uppercase tracking-widest text-emerald-600 text-sm font-semibold">Net Profit</div>
          <div className={`text-5xl font-bold mt-6 ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {loading ? '—' : `$${profit.toFixed(2)}`}
          </div>
          <div className="mt-6 text-gray-500">Revenue - Expenses</div>
        </div>

        <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100">
          <div className="uppercase tracking-widest text-gray-600 text-sm font-semibold">Total Entries</div>
          <div className="text-5xl font-bold mt-6">
            {loading ? '—' : expenseCount + revenueCount}
          </div>
        </div>
      </div>
    </div>
  );
}