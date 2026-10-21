import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaWallet, FaCreditCard, FaCog, FaHandshake, FaSyncAlt, FaEllipsisV } from 'react-icons/fa';
import clsx from 'clsx';
import pkg from '../../package.json';
import montyLogo from '../assets/logo.png';
import { useData } from '../context/DataContext';
import './Layout.css';

const APP_VERSION = pkg?.version || '2.4.0';

const SidebarItem = ({ to, icon, label, badge, count }) => (
    <NavLink
        to={to}
        className={({ isActive }) => clsx('sidebar-item', isActive && 'active')}
    >
        <span className="sidebar-item-icon">{icon}</span>
        <span className="sidebar-item-label">{label}</span>
        {badge && <span className="sidebar-item-badge">{badge}</span>}
        {count !== undefined && count > 0 && <span className="sidebar-item-count">{count}</span>}
    </NavLink>
);

export default function Layout({ children }) {
    const { session, userProfile } = useData();
    const [version, setVersion] = useState(APP_VERSION);
    const [syncTime, setSyncTime] = useState('Şimdi');
    const [isSyncing, setIsSyncing] = useState(false);

    const displayName = userProfile?.fullName || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Kullanıcı';
    const displayInitials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'M';

    useEffect(() => {
        if (window.electronAPI?.getAppVersion) {
            window.electronAPI.getAppVersion().then((v) => {
                if (v) setVersion(v);
            }).catch(() => {});
        }
    }, []);

    const handleSync = () => {
        setIsSyncing(true);
        setTimeout(() => {
            setIsSyncing(false);
            setSyncTime('Şimdi');
        }, 800);
    };

    return (
        <div className="app-container">
            {/* Fixed drag region for frameless window */}
            <div className="title-bar-drag" />

            {/* Stitch Sidebar Navigation */}
            <aside className="sidebar">
                <div className="sidebar-top">
                    {/* Header / Logo */}
                    <div className="sidebar-brand">
                        <div className="brand-left">
                            <div className="logo-img-wrapper">
                                <img src={montyLogo} alt="Monty Logo" className="logo-img" />
                            </div>
                            <div className="brand-info">
                                <span className="brand-name">Monty</span>
                                <div className="brand-status">
                                    <span className="status-pulse-dot" />
                                    <span className="brand-plan">Kişisel Finans</span>
                                </div>
                            </div>
                        </div>
                        <span className="version-pill">v{version}</span>
                    </div>

                    {/* Navigation Menu */}
                    <nav className="nav-menu">
                        <SidebarItem to="/" icon={<FaHome />} label="Genel Bakış" />
                        <SidebarItem to="/payments" icon={<FaCreditCard />} label="Faturalar & Ödemeler" />
                        <SidebarItem to="/accounts" icon={<FaWallet />} label="Hesaplar & Varlıklar" />
                        <SidebarItem to="/receivables" icon={<FaHandshake />} label="Borç & Alacak" />
                        <SidebarItem to="/settings" icon={<FaCog />} label="Ayarlar" />
                    </nav>
                </div>

                {/* Bottom Sidebar Section */}
                <div className="sidebar-bottom">
                    {/* Cloud Sync Mini Widget */}
                    <div className="sync-widget">
                        <div className="sync-widget-header">
                            <span className="sync-title">Bulut Senkronizasyonu</span>
                            <span className="sync-active-count">Aktif</span>
                        </div>
                        <div className="sync-widget-footer">
                            <span className="sync-timestamp">
                                <FaSyncAlt className={clsx('sync-icon', isSyncing && 'spinning')} />
                                Son: {syncTime}
                            </span>
                            <button
                                className="sync-refresh-btn"
                                onClick={handleSync}
                                disabled={isSyncing}
                            >
                                {isSyncing ? '...' : 'Eşitle'}
                            </button>
                        </div>
                    </div>

                    {/* User Profile Card */}
                    <div className="user-profile-card">
                        <div className="profile-left">
                            <div className="profile-avatar">{displayInitials}</div>
                            <div className="profile-info">
                                <span className="profile-name">{displayName}</span>
                                <span className="profile-tier">Kişisel Hesap</span>
                            </div>
                        </div>
                        <FaEllipsisV className="profile-menu-icon" />
                    </div>
                </div>
            </aside>

            {/* Main Content Viewport */}
            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
