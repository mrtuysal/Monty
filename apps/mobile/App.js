import React, { useEffect } from 'react';
import { DataProvider } from './src/context/DataContext';
import AppNavigator from './src/navigation/AppNavigator';
import { checkForUpdates } from './src/services/UpdateService';

export default function App() {
  useEffect(() => {
    // Check for updates silently on startup
    const timer = setTimeout(() => {
      checkForUpdates(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <DataProvider>
      <AppNavigator />
    </DataProvider>
  );
}
