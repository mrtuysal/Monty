import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaWallet, FaCreditCard, FaCog } from 'react-icons/fa';
import clsx from 'clsx';
import './Layout.css';

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
                </nav>

                <div className="settings-area">
                    <SidebarItem to="/settings" icon={<FaCog />} label="Ayarlar" />
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
