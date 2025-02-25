// src/components/dashboard/DashboardHeader.tsx

export function DashboardHeader() {
  return (
    <header className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div>
            <h1 className="text-xl font-semibold">Park Management System</h1>
          </div>
          <nav className="flex items-center space-x-4">
            {/* You can add other dashboard-specific actions here if needed */}
          </nav>
        </div>
      </div>
    </header>
  );
}
