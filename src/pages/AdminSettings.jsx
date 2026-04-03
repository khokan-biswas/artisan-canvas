import React from 'react';

const AdminSettings = () => {
  return (
    <div className="min-h-screen bg-[#FDFBF7] px-4 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-charcoal">Admin Settings</h1>
          <p className="mt-2 text-sm text-gray-500">Manage admin preferences and configuration from one place.</p>
        </div>

        <div className="grid gap-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-charcoal">Settings Overview</h2>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
              This section can be extended to include app-wide admin settings, default values, user management controls, or configuration toggles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
