import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaWallet, FaCreditCard, FaCog, FaHandshake } from 'react-icons/fa';
import clsx from 'clsx';
import pkg from '../../package.json';
import './Layout.css';

const APP_VERSION = pkg?.version || '2.2.0';

const SidebarItem = ({ to, icon, label }) => (
    <NavLink
        to={to}
        className={({ isActive }) => clsx('sidebar-item', isActive && 'active')}
    >
        {icon}
        <span>{label}</span>
    </NavLink>
);

export default function Layout({ children }) {
    const [version, setVersion] = useState(APP_VERSION);

    useEffect(() => {
        if (window.electronAPI?.getAppVersion) {
            window.electronAPI.getAppVersion().then((v) => {
                if (v) setVersion(v);
            }).catch(() => {});
        }
    }, []);

    return (
        <div className="app-container">
            {/* Fixed drag region for frameless window */}
            <div className="title-bar-drag" />

            {/* Sidebar */}
            <aside className="sidebar glass-panel">
                <div className="logo-area">
                    <div className="logo-circle">M</div>
                    <h2>Monty</h2>
                </div>

                <nav className="nav-menu">
                    <SidebarItem to="/" icon={<FaHome />} label="Genel Bakış" />
                    <SidebarItem to="/payments" icon={<FaCreditCard />} label="Ödemeler" />
                    <SidebarItem to="/accounts" icon={<FaWallet />} label="Hesaplar" />
                    <SidebarItem to="/receivables" icon={<FaHandshake />} label="Alacak / Borç" />
                </nav>

                <div className="settings-area">
                    <SidebarItem to="/settings" icon={<FaCog />} label="Ayarlar" />
                    <div className="sidebar-version-badge" title={`Monty Desktop v${version}`}>
                        <span className="version-dot" />
                        <span>v{version}</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
