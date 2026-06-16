import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);
  const [revenueCount, setRevenueCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const expRes = await fetch('http://localhost:5000/api/expenses');
      const expenses = await expRes.json();
      const expTotal = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

      const revRes = await fetch('http://localhost:5000/api/revenue');
      const revenues = await revRes.json();
      const revTotal = revenues.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

      setTotalExpenses(expTotal);
      setTotalRevenue(revTotal);
      setExpenseCount(expenses.length);
      setRevenueCount(revenues.length);

    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(fetchStats, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchStats();
  }, []);

  const profit = totalRevenue - totalExpenses;

  return (
    <div className="p-10 max-w-6xl mx-auto">
      <div className="mb-12">
        <h1 className="text-5xl font-bold text-gray-900">Welcome back 👋</h1>
        <p className="text-gray-600 mt-3 text-xl">Your business at a glance</p>
      </div>

      {/* Main Stats Grid - Much larger and centered */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">

        {/* Revenue Card */}
        <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <div className="uppercase tracking-widest text-emerald-600 text-sm font-semibold">Total Revenue</div>
              <div className="text-5xl font-bold mt-6">
                {loading ? '—' : `$${totalRevenue.toFixed(2)}`}
              </div>
            </div>
            <div className="text-5xl"></div>
          </div>
          <div className="mt-6 text-gray-500">{revenueCount} revenue entries</div>
        </div>

        {/* Expenses Card */}
        <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <div className="uppercase tracking-widest text-red-600 text-sm font-semibold">Total Expenses</div>
              <div className="text-5xl font-bold mt-6">
                {loading ? '—' : `$${totalExpenses.toFixed(2)}`}
              </div>
            </div>
            <div className="text-5xl"></div>
          </div>
          <div className="mt-6 text-gray-500">{expenseCount} expense entries</div>
        </div>

        {/* Profit Card */}
        <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 hover:shadow-md transition-shadow col-span-1 md:col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start">
            <div>
              <div className="uppercase tracking-widest text-emerald-600 text-sm font-semibold">Net Profit</div>
              <div className={`text-5xl font-bold mt-6 ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {loading ? '—' : `$${profit.toFixed(2)}`}
              </div>
            </div>
            <div className="text-5xl"></div>
          </div>
          <div className="mt-6 text-gray-500">Revenue minus Expenses</div>
        </div>

        {/* Total Entries */}
        <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <div className="uppercase tracking-widest text-gray-600 text-sm font-semibold">Total Entries</div>
              <div className="text-5xl font-bold mt-6">
                {loading ? '—' : expenseCount + revenueCount}
              </div>
            </div>
            <div className="text-5xl"></div>
          </div>
          <div className="mt-6 text-gray-500">All transactions</div>
        </div>
      </div>

      {/* Call to action */}
      <div className="text-center">
        <p className="text-gray-500 text-lg">
          Add expenses and revenue using the sidebar to see your numbers update live here.
        </p>
      </div>
    </div>
  );
}