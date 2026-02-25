import React, { useEffect, useState } from 'react';
import { FaTimes, FaCloudUploadAlt, FaSpinner, FaCheck } from 'react-icons/fa';

export default function BackupOverlay({ isActive, onCancel, progress = 0 }) {
    if (!isActive) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            {/* Close Button */}
            <button
                onClick={onCancel}
                style={{
                    position: 'absolute',
                    top: '30px',
                    right: '30px',
                    background: 'none',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '18px',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                    e.target.style.borderColor = '#f44336';
                    e.target.style.color = '#f44336';
                }}
                onMouseLeave={e => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                    e.target.style.color = '#fff';
                }}
            >
                <FaTimes />
            </button>

            {/* Animation Container */}
            <div style={{
                width: '120px',
                height: '120px',
                position: 'relative',
                marginBottom: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {/* Pulse Ring */}
                <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    border: '4px solid #00bcd4',
                    borderRadius: '50%',
                    animation: 'pulse 1.5s infinite',
                    opacity: 0.5
                }} />

                {/* Rotating Spinner */}
                <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    borderTop: '4px solid #fff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />

                <FaCloudUploadAlt size={40} style={{ animation: 'float 2s ease-in-out infinite' }} />
            </div>

            <h2 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Yedekleniyor...</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Verileriniz güvenli bir şekilde kaydediliyor.</p>

            {/* Simulated Progress Bar */}
            <div style={{
                width: '300px',
                height: '6px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '3px',
                overflow: 'hidden'
            }}>
                <div style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: '#00bcd4',
                    transition: 'width 0.2s linear'
                }} />
            </div>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(0.95); opacity: 0.8; }
                    50% { transform: scale(1.1); opacity: 0.4; }
                    100% { transform: scale(0.95); opacity: 0.8; }
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
