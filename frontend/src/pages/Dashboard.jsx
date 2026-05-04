import React from 'react';

export default function Dashboard() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900">Welcome back 👋</h1>
        <p className="text-gray-600 mt-2 text-lg">Your business overview will appear here.</p>
      </div>

      {/* Empty Stats Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-3xl p-8 border border-dashed border-gray-300 text-center">
            <div className="text-gray-400 text-sm mb-2">STAT {i}</div>
            <div className="text-3xl font-semibold text-gray-300">—</div>
          </div>
        ))}
      </div>

      <div className="text-center text-gray-400 text-sm mt-12">
        Add your real data and this dashboard will come to life.
      </div>
    </div>
  );
}