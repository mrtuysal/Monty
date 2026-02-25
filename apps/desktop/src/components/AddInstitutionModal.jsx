import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Known banks for autocomplete
const PREDEFINED_BANKS = [
    'Garanti BBVA',
    'Ziraat Bankası',
    'İş Bankası',
    'Yapı Kredi',
    'Akbank',
    'Vakıfbank',
    'Halkbank',
    'QNB Finansbank',
    'Denizbank',
    'TEB',
    'Enpara.com',
    'Kuveyt Türk',
    'Nakit'
];

export default function AddInstitutionModal({ isOpen, onClose, onSave, initialData = null, existingInstitutions = [] }) {
    const [name, setName] = useState('');
    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setName(initialData ? initialData : '');
            setSuggestions([]);
        }
    }, [isOpen, initialData]);

    const handleChange = (e) => {
        const val = e.target.value;
        setName(val);

        if (val && val.trim().length > 0) {
            const all = [...new Set([...PREDEFINED_BANKS, ...existingInstitutions])];
            const filtered = all.filter(bank =>
                bank.toLowerCase().includes(val.toLowerCase())
            );
            setSuggestions(filtered);
        } else {
            setSuggestions([]);
        }
    };

    const handleSelect = (val) => {
        setName(val);
        setSuggestions([]);
    };

    const handleSave = () => {
        if (!name.trim()) return alert('Lütfen bir isim giriniz.');
        onSave(name);
    };

    if (!isOpen) return null;

    const inputStyle = {
        width: '100%',
        padding: '12px',
        borderRadius: 'var(--radius-md)',
        background: '#1a1a1a',
        border: '1px solid var(--border)',
        boxSizing: 'border-box',
        color: '#fff',
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 0.2s',
        marginBottom: '15px',
        position: 'relative',
        zIndex: 10
    };

    return createPortal(
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(5px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isOpen ? 1 : 0,
            visibility: isOpen ? 'visible' : 'hidden',
            transition: 'all 0.2s'
        }} onClick={onClose}>
            <div style={{
                background: '#121212',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                width: '100%',
                maxWidth: '400px',
                padding: '30px',
                position: 'relative',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
                transition: 'all 0.2s'
            }} onClick={e => e.stopPropagation()}>

                <h2 style={{ margin: '0 0 25px 0', fontSize: '1.8rem' }} className="gradient-text">
                    {initialData ? 'Ana Hesabı Düzenle' : 'Yeni Ana Hesap'}
                </h2>

                <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px', fontWeight: '500' }}>
                        Banka / Kurum Adı
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={handleChange}
                        style={inputStyle}
                        placeholder="Örn: Garanti BBVA"
                        autoComplete="off"
                    />
                    {suggestions.length > 0 && (
                        <div style={{
                            position: 'absolute',
                            top: '70px',
                            left: 0,
                            right: 0,
                            background: '#252525',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            zIndex: 100,
                            maxHeight: '150px',
                            overflowY: 'auto',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                        }}>
                            {suggestions.map((bank, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleSelect(bank)}
                                    style={{
                                        padding: '10px 15px',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        color: '#eee',
                                        fontSize: '13px'
                                    }}
                                    onMouseEnter={e => e.target.style.background = '#333'}
                                    onMouseLeave={e => e.target.style.background = 'transparent'}
                                >
                                    {bank}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                    <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1, padding: '12px' }}>İptal</button>
                    <button onClick={handleSave} className="btn btn-primary" style={{ flex: 2, padding: '12px' }}>Kaydet</button>
                </div>
            </div>
        </div>,
        document.body
    );
}
