import React, { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import { DataProvider, useData } from './context/DataContext';
import BackupOverlay from './components/BackupOverlay';

// Lazy-loaded pages — each page loads only when navigated to
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Accounts = lazy(() => import('./pages/Accounts'));
const Payments = lazy(() => import('./pages/Payments'));
const Receivables = lazy(() => import('./pages/Receivables'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));

// Loading fallback for lazy-loaded pages
const PageLoader = () => (
    <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        gap: '12px'
    }}>
        <div className="spinner" />
        <span>Yükleniyor...</span>
    </div>
);

// Wrapper component to access context
const BackupOverlayWrapper = () => {
    const { isBackupActive, cancelBackup, backupProgress } = useData();
    return (
        <BackupOverlay
            isActive={isBackupActive}
            onCancel={cancelBackup}
            progress={backupProgress}
        />
    );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { session, authLoading } = useData();

    if (authLoading) {
        return (
            <div className="fullscreen-loader">
                <div className="spinner" />
                <span>Yükleniyor...</span>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

// Public Route (Redirects to Dashboard if already logged in)
const PublicRoute = ({ children }) => {
    const { session, authLoading } = useData();

    if (authLoading) {
        return (
            <div className="fullscreen-loader">
                <div className="spinner" />
                <span>Yükleniyor...</span>
            </div>
        );
    }

    if (session) {
        return <Navigate to="/" replace />;
    }
    return children;
};


function App() {
    return (
        <DataProvider>
            <BackupOverlayWrapper />
            <HashRouter>
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <Dashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/payments"
                            element={
                                <ProtectedRoute>
                                    <Payments />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/accounts"
                            element={
                                <ProtectedRoute>
                                    <Accounts />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/settings"
                            element={
                                <ProtectedRoute>
                                    <Settings />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/receivables"
                            element={
                                <ProtectedRoute>
                                    <Receivables />
                                </ProtectedRoute>
                            }
                        />
                        <Route path="/login" element={
                            <PublicRoute>
                                <Login />
                            </PublicRoute>
                        } />
                    </Routes>
                </Suspense>
            </HashRouter>
        </DataProvider>
    );
}

export default App;
