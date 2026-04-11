import React from 'react';
import { DataProvider } from './src/context/DataContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <DataProvider>
      <AppNavigator />
    </DataProvider>
  );
}
