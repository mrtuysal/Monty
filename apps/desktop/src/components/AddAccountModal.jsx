import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../context/DataContext';

// Money formatters are now provided by DataContext (formatMoneyInput, parseMoneyInput)

// Known banks for autocomplete suggestions
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

export default function AddAccountModal({ isOpen, onClose, onSave, existingInstitutions = [], initialData = null, fixedInstitution = null }) {
    const { formatMoneyInput, parseMoneyInput } = useData();
    const [formData, setFormData] = useState({
        institution: '',
        name: '',
        accountType: 'VADESIZ',
        currency: 'TRY',
        balance: '',
        kmh: ''
    });

    const [suggestions, setSuggestions] = useState([]);

    // Merge predefined banks with user's existing institutions for suggestions
    const allBanks = React.useMemo(() => {
        const unique = new Set([...PREDEFINED_BANKS, ...existingInstitutions]);
        return Array.from(unique).sort();
    }, [existingInstitutions]);

    useEffect(() => {
        if (isOpen) {
            // Edit Mode: Populate fields
            if (initialData) {
                setFormData({
                    institution: fixedInstitution || initialData.institution,
                    name: initialData.name,
                    accountType: initialData.accountType || 'VADESIZ',
                    currency: initialData.currency,
                    balance: initialData.balance ? initialData.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '',
                    kmh: initialData.kmhLimit ? initialData.kmhLimit.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : ''
                });
            } else {
                // Add Mode: Reset fields (but keep fixed institution if provided)
                setFormData({
                    institution: fixedInstitution || '',
                    name: '',
                    accountType: 'VADESIZ',
                    currency: 'TRY',
                    balance: '',
                    kmh: ''
                });
            }
            setSuggestions([]);
        }
    }, [isOpen, initialData]);

    const handleChange = (e) => {
        let { name, value } = e.target;

        // Apply formatting for money fields
        if (['balance', 'kmh'].includes(name)) {
            value = formatMoneyInput(value);
        }

        setFormData(prev => ({ ...prev, [name]: value }));

        // Handle Bank Suggestions
        if (name === 'institution') {
            if (value.trim().length > 0) {
                const filtered = allBanks.filter(bank =>
                    bank.toLowerCase().includes(value.toLowerCase())
                );
                setSuggestions(filtered);
            } else {
                setSuggestions([]);
            }
        }
    };

    const handleSelectBank = (bankName) => {
        setFormData(prev => ({ ...prev, institution: bankName }));
        setSuggestions([]);
    };

    const handleSave = () => {
        // Validation
        if (!formData.institution) return alert('Lütfen Banka/Kurum giriniz.');
        if (!formData.name) return alert('Lütfen Hesap Adı giriniz.');
        if (!formData.balance) return alert('Lütfen Bakiye giriniz.');

        const balanceVal = parseMoneyInput(formData.balance);
        const kmhVal = parseMoneyInput(formData.kmh);

        // Logic: 
        // Bakiye (Balance) = Mevcut para (User's actual money)
        // Kullanılabilir (Available) = Bakiye + KMH Limit

        const newAccount = {
            id: initialData ? initialData.id : Date.now().toString(),
            institution: formData.institution,
            name: formData.name,
            accountType: formData.accountType,
            type: formData.institution.toLowerCase().includes('nakit') ? 'CASH' : 'BANK', // Keep legacy type for icon logic if needed
            currency: formData.currency,
            balance: balanceVal,
            available: balanceVal + kmhVal,
            kmhLimit: kmhVal
        };

        onSave(newAccount);
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

    const labelStyle = {
        display: 'block',
        color: 'var(--text-muted)',
        fontSize: '12px',
        marginBottom: '6px',
        fontWeight: '500'
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
                maxWidth: '500px',
                padding: '30px',
                position: 'relative',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
                transition: 'all 0.2s'
            }} onClick={e => e.stopPropagation()}>

                <h2 style={{ margin: '0 0 25px 0', fontSize: '1.8rem' }} className="gradient-text">
                    {initialData ? 'Hesabı Düzenle' : 'Yeni Hesap Ekle'}
                </h2>

                {/* Banka / Kurum Input with Autocomplete */}
                <div style={{ position: 'relative' }}>
                    <label style={labelStyle}>Banka / Kurum</label>
                    <input
                        type="text"
                        name="institution"
                        value={formData.institution}
                        onChange={handleChange}
                        style={{ ...inputStyle, opacity: fixedInstitution ? 0.6 : 1, cursor: fixedInstitution ? 'not-allowed' : 'text' }}
                        disabled={!!fixedInstitution}
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
                            zIndex: 10,
                            maxHeight: '150px',
                            overflowY: 'auto',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                        }}>
                            {suggestions.map((bank, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleSelectBank(bank)}
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

                <label style={labelStyle}>Hesap Adı</label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    style={inputStyle}
                    placeholder="Örn: Vadesiz TL, Kredi Kartı..."
                />

                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Hesap Türü</label>
                        <select
                            name="accountType"
                            value={formData.accountType}
                            onChange={handleChange}
                            style={{ ...inputStyle, cursor: 'pointer' }}
                        >
                            <option value="VADESIZ">Vadesiz Hesap</option>
                            <option value="VADELI">Vadeli Hesap</option>
                            <option value="YATIRIM">Yatırım Hesabı</option>
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Döviz Cinsi</label>
                        <select
                            name="currency"
                            value={formData.currency}
                            onChange={handleChange}
                            style={{ ...inputStyle, cursor: 'pointer' }}
                        >
                            <option value="TRY">TRY (₺)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="XAU">ALTIN (gr)</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Mevcut Bakiye</label>
                        <input
                            type="text"
                            name="balance"
                            value={formData.balance}
                            onChange={handleChange}
                            style={inputStyle}
                            placeholder="0,00"
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={labelStyle}>KMH Limiti (Opsiyonel)</label>
                        <input
                            type="text"
                            name="kmh"
                            value={formData.kmh}
                            onChange={handleChange}
                            style={inputStyle}
                            placeholder="0,00"
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '12px' }}
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn btn-primary"
                        style={{ flex: 2, padding: '12px' }}
                    >
                        Kaydet
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
