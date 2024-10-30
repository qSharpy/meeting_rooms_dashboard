import React from 'react';
import RoomDashboard from './components/RoomDashboard';
import CoordinateMapper from './components/CoordinateMapper';
import RoomDisplay from './components/RoomDisplay';

function App() {
  const [currentView, setCurrentView] = React.useState('dashboard');
  const [displayRoomId, setDisplayRoomId] = React.useState(null);

  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      // Check if it's a display route
      if (hash.startsWith('display/')) {
        setDisplayRoomId(hash.split('/')[1]);
        setCurrentView('display');
      } else {
        setCurrentView(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Handle initial hash

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <a
                href="#dashboard"
                className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium ${
                  currentView === 'dashboard' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Dashboard
              </a>
              <a
                href="#mapper"
                className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium ${
                  currentView === 'mapper' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Coordinate Mapper
              </a>
              <a
                href="#display/0.01"
                className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium ${
                  currentView === 'display' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Display Simulator
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'dashboard' && <RoomDashboard />}
        {currentView === 'mapper' && <CoordinateMapper />}
        {currentView === 'display' && displayRoomId && <RoomDisplay roomId={displayRoomId} />}
      </main>
    </div>
  );
}

export default App;