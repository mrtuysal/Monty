import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../context/DataContext';
import { parseRecurringConfig, encodeRecurringConfig } from '../lib/recurringPaymentService';

export default function AddPaymentModal({ isOpen, onClose, onSave, initialData }) {
    const { formatMoneyInput, parseMoneyInput } = useData();
    const [paymentType, setPaymentType] = useState('CREDIT_CARD');
    const [formData, setFormData] = useState({
        institution: '',
        description: '',
        amount: '',
        minPayment: '',
        paymentAmount: '',
        statementDate: '',
        dueDate: '',
        isRecurring: false,
        recurringFrequency: 'MONTHLY',
        recurringType: 'INFINITE', // 'INFINITE' | 'COUNT'
        recurringTotalCount: 12,
        recurringCurrentIndex: 1
    });
    const [formErrors, setFormErrors] = useState({});

    const formatDateForInput = (d) => {
        if (!d) return '';
        if (typeof d === 'string') {
            const match = d.match(/^\d{4}-\d{2}-\d{2}/);
            if (match) return match[0];
        }
        const dateObj = new Date(d);
        if (!isNaN(dateObj.getTime())) {
            return dateObj.toISOString().split('T')[0];
        }
        return '';
    };

    useEffect(() => {
        if (!isOpen) return; // Prevent unnecessary state updates when closed

        if (initialData) {
            setPaymentType(initialData.type || 'CREDIT_CARD');
            const parsedRecurring = parseRecurringConfig(initialData.recurringFrequency);
            setFormData({
                institution: initialData.institution || '',
                description: initialData.description || '',
                amount: initialData.amount ? initialData.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '',
                minPayment: initialData.minPayment ? initialData.minPayment.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '',
                paymentAmount: initialData.paymentAmount ? initialData.paymentAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '',
                statementDate: formatDateForInput(initialData.statementDate),
                dueDate: formatDateForInput(initialData.dueDate),
                isRecurring: initialData.isRecurring || false,
                recurringFrequency: parsedRecurring.frequency || 'MONTHLY',
                recurringType: parsedRecurring.type || 'INFINITE',
                recurringTotalCount: parsedRecurring.totalCount || 12,
                recurringCurrentIndex: parsedRecurring.currentIndex || 1
            });
        } else {
            setPaymentType('CREDIT_CARD');
            setFormData({
                institution: '',
                description: '',
                amount: '',
                minPayment: '',
                paymentAmount: '',
                statementDate: '',
                dueDate: '',
                isRecurring: true,
                recurringFrequency: 'MONTHLY',
                recurringType: 'INFINITE',
                recurringTotalCount: 12,
                recurringCurrentIndex: 1
            });
        }
        setFormErrors({});
    }, [initialData, isOpen]);

    // Handle Payment Type Change specifically to toggle recurring defaults
    const handlePaymentTypeChange = (e) => {
        const type = e.target.value;
        setPaymentType(type);
        setFormData(prev => ({
            ...prev,
            isRecurring: type === 'CREDIT_CARD'
        }));
    };

    const handleChange = (e) => {
        let { name, value, type, checked } = e.target;
        let val = type === 'checkbox' ? checked : value;

        // Apply formatting for money fields
        if (['amount', 'minPayment', 'paymentAmount'].includes(name)) {
            val = formatMoneyInput(val);
        }

        setFormData(prev => {
            const newState = { ...prev, [name]: val };

            // Auto-fill Payment Amount = Amount when Amount changes
            // This ensures for Bills/Other the "payable" defaults to the full amount
            if (name === 'amount') {
                newState.paymentAmount = val;
            }
            return newState;
        });

        // Clear error for this field on change
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSave = () => {
        const errors = {};

        if (!formData.institution || formData.institution.trim() === '') {
            errors.institution = 'Bu alan zorunludur.';
        }

        if (!formData.dueDate) {
            errors.dueDate = 'Son ödeme tarihi seçiniz.';
        }

        if (paymentType !== 'CREDIT_CARD' && !formData.amount) {
            errors.amount = 'Tutar giriniz.';
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        const finalFrequency = encodeRecurringConfig({
            frequency: formData.recurringFrequency,
            type: formData.recurringType,
            totalCount: formData.recurringTotalCount,
            currentIndex: formData.recurringCurrentIndex || 1
        });

        const payment = {
            id: initialData ? initialData.id : Date.now().toString(),
            type: paymentType,
            institution: formData.institution,
            description: formData.description || formData.institution,
            statementDate: formData.statementDate,
            dueDate: formData.dueDate,
            amount: parseMoneyInput(formData.amount),
            minPayment: parseMoneyInput(formData.minPayment),
            paymentAmount: parseMoneyInput(formData.paymentAmount) || parseMoneyInput(formData.amount),
            balance: parseMoneyInput(formData.amount) - (parseMoneyInput(formData.paymentAmount) || parseMoneyInput(formData.amount)),
            status: initialData ? initialData.status : 'PENDING',
            isRecurring: formData.isRecurring,
            recurringFrequency: finalFrequency
        };

        onSave(payment);
    };

    if (!isOpen) return null;

    const inputStyle = (fieldName) => ({
        width: '100%',
        padding: '12px',
        borderRadius: 'var(--radius-md)',
        background: '#1a1a1a',
        border: `1px solid ${formErrors[fieldName] ? '#ff453a' : 'var(--border)'}`,
        color: '#fff',
        fontSize: '14px',
        outline: 'none',
        boxSizing: 'border-box',
        boxShadow: formErrors[fieldName] ? '0 0 0 2px rgba(255,69,58,0.25)' : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s'
    });

    const labelStyle = {
        display: 'block',
        color: 'var(--text-muted)',
        marginBottom: '8px',
        fontSize: '13px',
        fontWeight: '500'
    };

    const errorMsgStyle = {
        color: '#ff453a',
        fontSize: '11px',
        marginTop: '5px',
        display: 'block'
    };

    const selectStyle = (fieldName) => ({
        ...inputStyle(fieldName),
        cursor: 'pointer',
        appearance: 'none',
        WebkitAppearance: 'none',
        background: `#1a1a1a url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E") no-repeat right 15px center`,
        backgroundSize: '12px'
    });

    return createPortal(
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 99999,
            backdropFilter: 'blur(8px)'
        }}>
            <div className="glass-panel" style={{
                width: '600px',
                padding: '40px',
                borderRadius: 'var(--radius-lg)',
                background: '#0a0a0a',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-glow)',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#fff' }}>
                        {initialData ? 'Ödemeyi Düzenle' : 'Yeni Ödeme Ekle'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', padding: '0' }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Top Row: Type & Recurring */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'end' }}>
                        <div>
                            <label style={labelStyle}>Ödeme Türü</label>
                            <select
                                value={paymentType}
                                onChange={handlePaymentTypeChange}
                                style={selectStyle('paymentType')}
                            >
                                <option value="CREDIT_CARD" style={{ background: '#111', color: '#fff' }}>💳 Kredi Kartı</option>
                                <option value="BILL" style={{ background: '#111', color: '#fff' }}>📄 Fatura</option>
                                <option value="OTHER" style={{ background: '#111', color: '#fff' }}>✏️ Diğer</option>
                            </select>
                        </div>

                        {/* Recurring Checkbox */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '45px', background: '#151515', padding: '0 15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <input
                                type="checkbox"
                                id="isRecurring"
                                name="isRecurring"
                                checked={formData.isRecurring}
                                onChange={handleChange}
                                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                            />
                            <label htmlFor="isRecurring" style={{ color: '#fff', fontSize: '13px', cursor: 'pointer', margin: 0, userSelect: 'none' }}>
                                Düzenli Ödeme
                            </label>
                        </div>
                    </div>

                    {/* Recurring Options */}
                    {formData.isRecurring && (
                        <div style={{
                            animation: 'fadeIn 0.3s ease-in-out',
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px'
                        }}>
                            {/* Frequency Dropdown */}
                            <div>
                                <label style={labelStyle}>Ödeme Periyodu</label>
                                <select
                                    name="recurringFrequency"
                                    value={formData.recurringFrequency}
                                    onChange={handleChange}
                                    style={selectStyle('recurringFrequency')}
                                >
                                    <option value="MONTHLY">Aylık (Varsayılan)</option>
                                    <option value="WEEKLY">Haftalık</option>
                                    <option value="QUARTERLY">3 Aylık</option>
                                    <option value="YEARLY">Yıllık</option>
                                </select>
                            </div>

                            {/* Repetition Limit: Infinite vs Fixed Count */}
                            <div>
                                <label style={labelStyle}>Tekrar Sayısı / Süresi</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, recurringType: 'INFINITE' }))}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: 'var(--radius-md)',
                                            border: formData.recurringType === 'INFINITE' ? '2px solid var(--primary)' : '1px solid var(--border)',
                                            background: formData.recurringType === 'INFINITE' ? 'rgba(var(--primary-rgb, 108, 99, 255), 0.18)' : '#151515',
                                            color: formData.recurringType === 'INFINITE' ? '#fff' : 'var(--text-muted)',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <span>♾️ Sonsuz / Süresiz</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, recurringType: 'COUNT' }))}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: 'var(--radius-md)',
                                            border: formData.recurringType === 'COUNT' ? '2px solid var(--primary)' : '1px solid var(--border)',
                                            background: formData.recurringType === 'COUNT' ? 'rgba(var(--primary-rgb, 108, 99, 255), 0.18)' : '#151515',
                                            color: formData.recurringType === 'COUNT' ? '#fff' : 'var(--text-muted)',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <span>🔢 Belirli Sayıda Tekrar</span>
                                    </button>
                                </div>
                            </div>

                            {/* Fixed Count Sub-panel */}
                            {formData.recurringType === 'COUNT' && (
                                <div style={{
                                    marginTop: '4px',
                                    padding: '14px',
                                    background: 'rgba(0, 0, 0, 0.35)',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)'
                                }}>
                                    <label style={{ ...labelStyle, fontSize: '12px', marginBottom: '8px' }}>
                                        Kaç Kez Tekrarlanacak? (Taksit / Dönem Sayısı)
                                    </label>

                                    {/* Quick Presets */}
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                        {[3, 6, 9, 12, 24].map(num => (
                                            <button
                                                key={num}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, recurringTotalCount: num }))}
                                                style={{
                                                    flex: 1,
                                                    padding: '6px 0',
                                                    borderRadius: '6px',
                                                    border: Number(formData.recurringTotalCount) === num ? '1px solid var(--primary)' : '1px solid var(--border)',
                                                    background: Number(formData.recurringTotalCount) === num ? 'var(--primary)' : 'transparent',
                                                    color: '#fff',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {num} Ay
                                            </button>
                                        ))}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input
                                            type="number"
                                            min="2"
                                            max="120"
                                            name="recurringTotalCount"
                                            value={formData.recurringTotalCount || ''}
                                            onChange={handleChange}
                                            placeholder="Örn: 12"
                                            style={{ ...inputStyle('recurringTotalCount'), width: '110px', padding: '8px 12px' }}
                                        />
                                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                            tekrar sonra durdurulur.
                                            {formData.recurringCurrentIndex > 1 && ` (Şu an: ${formData.recurringCurrentIndex}. tekrar)`}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={labelStyle}>Açıklama</label>
                            <input
                                type="text"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Örn: Şubat Ekstresi"
                                style={inputStyle('description')}
                            />
                        </div>
                        <div>
                            <label style={{ ...labelStyle, color: formErrors.institution ? '#ff453a' : 'var(--text-muted)' }}>
                                {paymentType === 'CREDIT_CARD' ? 'Kart / Banka Adı' : paymentType === 'BILL' ? 'Kurum Adı' : 'Ödeme Yeri'}
                            </label>
                            <input
                                type="text"
                                name="institution"
                                value={formData.institution}
                                onChange={handleChange}
                                placeholder="Örn: Garanti Bonus"
                                style={inputStyle('institution')}
                            />
                            {formErrors.institution && <span style={errorMsgStyle}>⚠ {formErrors.institution}</span>}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {paymentType === 'CREDIT_CARD' && (
                            <div>
                                <label style={labelStyle}>Hesap Kesim Tarihi</label>
                                <input
                                    type="date"
                                    name="statementDate"
                                    value={formData.statementDate}
                                    onChange={handleChange}
                                    style={{ ...inputStyle('statementDate'), colorScheme: 'dark' }}
                                />
                            </div>
                        )}
                        <div style={paymentType !== 'CREDIT_CARD' ? { gridColumn: 'span 2' } : {}}>
                            <label style={{ ...labelStyle, color: formErrors.dueDate ? '#ff453a' : 'var(--text-muted)' }}>Son Ödeme Tarihi</label>
                            <input
                                type="date"
                                name="dueDate"
                                value={formData.dueDate}
                                onChange={handleChange}
                                style={{ ...inputStyle('dueDate'), colorScheme: 'dark' }}
                            />
                            {formErrors.dueDate && <span style={errorMsgStyle}>⚠ {formErrors.dueDate}</span>}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={{ ...labelStyle, color: formErrors.amount ? '#ff453a' : 'var(--text-muted)' }}>
                                {paymentType === 'CREDIT_CARD' ? 'Dönem Borcu (TL)' : 'Tutar (TL)'}
                            </label>
                            <input
                                type="text"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                placeholder={paymentType === 'CREDIT_CARD' ? "0,00 (Ekstre bekleniyor)" : "0,00"}
                                style={inputStyle('amount')}
                            />
                            {formErrors.amount && <span style={errorMsgStyle}>⚠ {formErrors.amount}</span>}
                        </div>

                        <div>
                            <label style={labelStyle}>Ödenecek Tutar (TL)</label>
                            <input
                                type="text"
                                name="paymentAmount"
                                value={formData.paymentAmount}
                                onChange={handleChange}
                                placeholder="0,00"
                                style={inputStyle('paymentAmount')}
                            />
                        </div>

                        {paymentType === 'CREDIT_CARD' && (
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>Asgari Ödeme Tutarı (TL)</label>
                                <input
                                    type="text"
                                    name="minPayment"
                                    value={formData.minPayment}
                                    onChange={handleChange}
                                    placeholder="0,00"
                                    style={inputStyle('minPayment')}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '35px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                    <button className="btn btn-secondary" onClick={onClose} style={{ padding: '12px 25px' }}>İptal</button>
                    <button className="btn btn-primary" onClick={handleSave} style={{ padding: '12px 30px' }}>Kaydet</button>
                </div>
            </div>
        </div>,
        document.body
    );
}
