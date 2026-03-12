import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Layout from '../components/Layout';
import FileUploadModal from '../components/FileUploadModal';
import { FaChevronLeft, FaChevronRight, FaEllipsisV, FaFileUpload } from 'react-icons/fa';

import { useData } from '../context/DataContext';

const MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export default function Payments() {
    const { payments, setPayments, addPayment, updatePayment, deletePayment, formatMoneyInput, parseMoneyInput } = useData();
    // Rename 'payments' from context to 'allPayments' to keep local logic working with minimal changes, or just use payments directly
    const allPayments = payments;

    // const [allPayments, setAllPayments] = useState(INITIAL_PAYMENTS); // REMOVED LOCAL STATE
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState(null);
    const [menuOpenId, setMenuOpenId] = useState(null); // Track which row's menu is open
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 }); // Portal menu position
    const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);

    // Date State
    const [selectedYear, setSelectedYear] = useState(2026);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-indexed

    // Click outside listener to close menus
    useEffect(() => {
        const handleClickOutside = () => setMenuOpenId(null);
        if (menuOpenId) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => document.removeEventListener('click', handleClickOutside);
    }, [menuOpenId]);

    // Filter & Group Payments
    const filteredPayments = useMemo(() => {
        const payments = allPayments
            .filter(payment => {
                // Filter by Due Date
                const date = new Date(payment.dueDate);
                return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
            });

        // Group Logic: CREDIT_CARD > BILL > OTHER
        const typeOrder = { 'CREDIT_CARD': 1, 'BILL': 2, 'OTHER': 3 };

        return payments.sort((a, b) => {
            // Primary Sort: Type
            const typeA = typeOrder[a.type] || 3;
            const typeB = typeOrder[b.type] || 3;
            if (typeA !== typeB) return typeA - typeB;

            // Secondary Sort: Date (Earliest first)
            return new Date(a.dueDate) - new Date(b.dueDate);
        });
    }, [allPayments, selectedYear, selectedMonth]);

    const changeYear = (direction) => {
        setSelectedYear(prev => prev + direction);
    };

    // Actions
    const handleEdit = (payment) => {
        setEditingPayment(payment);
        setIsModalOpen(true);
        setMenuOpenId(null);
    };

    const handleDeleteClick = (id) => { // Renamed to avoid conflicts if any
        if (window.confirm('Bu ödemeyi silmek istediğinize emin misiniz?')) {
            deletePayment(id);
        }
        setMenuOpenId(null);
    };

    const handleToggleStatus = (payment) => {
        const updatedPayment = { ...payment, status: payment.status === 'PAID' ? 'PENDING' : 'PAID' };
        updatePayment(updatedPayment);
        setMenuOpenId(null);
    };

    const handleSavePayment = (payment) => {
        if (editingPayment) {
            updatePayment(payment);
        } else {
            // Add new
            addPayment(payment);

            // Generate Next Recurring Payment if applicable
            if (payment.isRecurring) {
                const nextPayment = { ...payment };
                nextPayment.id = Date.now().toString() + '_next'; // Unique ID suffix
                nextPayment.status = 'PENDING';

                // Date Calculation Helper
                const addPeriod = (dateStr, freq) => {
                    if (!dateStr) return '';
                    const d = new Date(dateStr);
                    if (freq === 'WEEKLY') d.setDate(d.getDate() + 7);
                    else if (freq === 'QUARTERLY') d.setMonth(d.getMonth() + 3);
                    else if (freq === 'YEARLY') d.setFullYear(d.getFullYear() + 1);
                    else d.setMonth(d.getMonth() + 1); // Default MONTHLY
                    return d.toISOString().split('T')[0];
                };

                nextPayment.dueDate = addPeriod(payment.dueDate, payment.recurringFrequency);
                if (payment.statementDate) {
                    nextPayment.statementDate = addPeriod(payment.statementDate, payment.recurringFrequency);
                }

                // Reset amounts for Credit Cards based on user requirement
                if (payment.type === 'CREDIT_CARD') {
                    nextPayment.amount = 0;
                    nextPayment.minPayment = 0;
                    nextPayment.paymentAmount = 0;
                    nextPayment.balance = 0;
                } else {
                    // For Bills, keep the amount but reset payment status
                    // Ensure paymentAmount matches amount (default assumption for fixed bills)
                    nextPayment.paymentAmount = nextPayment.amount;
                    nextPayment.balance = 0;
                }

                // Add the next recurring payment as well
                addPayment(nextPayment);
            }
        }
        setIsModalOpen(false);
        setEditingPayment(null);

    };

    return (
        <Layout>


            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontSize: '2.5rem', margin: '0 0 10px 0' }}>Ödemeler</h1>

                    {/* Year Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: 'var(--text-muted)' }}>
                        <button className="btn btn-secondary" style={{ padding: '5px 10px' }} onClick={() => changeYear(-1)}><FaChevronLeft /></button>
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>{selectedYear}</span>
                        <button className="btn btn-secondary" style={{ padding: '5px 10px' }} onClick={() => changeYear(1)}><FaChevronRight /></button>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setIsFileUploadOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <FaFileUpload /> Dosya ile Ekle
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setEditingPayment(null);
                            setIsModalOpen(true);
                        }}
                    >
                        + Yeni Ödeme
                    </button>
                </div>
            </div>

            {/* Month Tabs */}
            <div className="glass-panel" style={{
                borderRadius: 'var(--radius-lg)',
                marginBottom: '20px',
                padding: '6px',
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)',
                gap: '6px',
                alignItems: 'center'
            }}>
                {MONTHS.map((month, index) => (
                    <button
                        key={month}
                        onClick={() => setSelectedMonth(index)}
                        style={{
                            background: selectedMonth === index ? 'var(--primary)' : 'transparent',
                            color: selectedMonth === index ? '#fff' : 'var(--text-muted)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 0',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '13px',
                            transition: 'all 0.2s',
                            width: '100%',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}
                    >
                        {month}
                    </button>
                ))}
            </div>

            {/* Payment List */}
            <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', minHeight: '400px', paddingBottom: '100px' }}>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '10px' }}>Kurum</th>
                                <th style={{ padding: '10px' }}>Açıklama</th>
                                <th style={{ padding: '10px' }}>Hesap Kesim</th>
                                <th style={{ padding: '10px' }}>Son Ödeme</th>
                                {/* Aligned Right */}
                                <th style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>Tutar</th>
                                <th style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>Min. Tutar</th>
                                <th style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>Ödenecek</th>
                                <th style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>Bakiye</th>

                                <th style={{ padding: '10px', textAlign: 'center' }}>Durum</th>
                                <th style={{ padding: '10px', textAlign: 'center' }}>İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan="10" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Bu ay için kayıtlı ödeme bulunmuyor.
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((item, index) => {
                                    // Check if group changed
                                    const isGroupStart = index > 0 && filteredPayments[index - 1].type !== item.type;
                                    // Check if Overdue
                                    const isOverdue = item.status !== 'PAID' && new Date(item.dueDate) < new Date();

                                    return (
                                        <tr key={item.id} style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                            borderTop: isGroupStart ? '2px solid rgba(255, 255, 255, 0.15)' : 'none', // Distinct separator
                                            backgroundColor: isOverdue ? 'rgba(255, 0, 0, 0.3)' : 'transparent' // Red with 30% opacity
                                        }}>
                                            <td style={{ padding: '10px', fontWeight: '500', color: '#fff' }}>{item.institution}</td>
                                            <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{item.description}</td>
                                            <td style={{ padding: '10px', color: 'var(--text-muted)' }}>
                                                {item.statementDate ? new Date(item.statementDate).toLocaleDateString('tr-TR') : '-'}
                                            </td>
                                            <td style={{ padding: '10px', color: '#fff' }}>{new Date(item.dueDate).toLocaleDateString('tr-TR')}</td>

                                            {/* Aligned Right */}
                                            <td style={{ padding: '10px', fontWeight: 'bold', textAlign: 'right', whiteSpace: 'nowrap' }}>₺ {(item.amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td style={{ padding: '10px', color: 'var(--text-muted)', textAlign: 'right', whiteSpace: 'nowrap' }}>₺ {(item.minPayment || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td style={{ padding: '10px', color: 'var(--primary)', textAlign: 'right', whiteSpace: 'nowrap' }}>₺ {(item.paymentAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td style={{ padding: '10px', color: 'var(--error)', textAlign: 'right', whiteSpace: 'nowrap' }}>₺ {(item.balance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>

                                            <td style={{ padding: '10px' }}>
                                                {(() => {
                                                    const isPaid = item.status === 'PAID';
                                                    const isOverdue = !isPaid && new Date(item.dueDate) < new Date();

                                                    let color = '#ffcc00'; // Default: Pending (Yellow)
                                                    let text = 'BEKLİYOR';

                                                    if (isPaid) {
                                                        color = '#32d74b'; // Paid (Green)
                                                        text = 'ÖDENDİ';
                                                    } else if (isOverdue) {
                                                        color = '#ff453a'; // Overdue (Red)
                                                        text = 'GECİKTİ';
                                                    }

                                                    return (
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <div title={text} style={{
                                                                width: '12px',
                                                                height: '12px',
                                                                borderRadius: '50%',
                                                                backgroundColor: color,
                                                                boxShadow: `0 0 8px ${color}`,
                                                                cursor: 'help'
                                                            }} />
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (menuOpenId === item.id) {
                                                            setMenuOpenId(null);
                                                        } else {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            // Position to the left of the button, align top
                                                            setMenuPos({
                                                                top: rect.top,
                                                                left: rect.right - 175
                                                            });
                                                            setMenuOpenId(item.id);
                                                        }
                                                    }}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                        padding: '5px',
                                                        fontSize: '14px'
                                                    }}
                                                >
                                                    <FaEllipsisV />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Portal Dropdown Menu - Renders outside table to avoid clipping */}
            {menuOpenId && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: `${menuPos.top}px`,
                        left: `${menuPos.left}px`,
                        background: '#1a1a1a',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.7)',
                        zIndex: 99998,
                        minWidth: '170px',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {(() => {
                        const item = filteredPayments.find(p => p.id === menuOpenId);
                        if (!item) return null;
                        const menuBtnStyle = {
                            padding: '12px 15px',
                            background: 'transparent',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%'
                        };
                        return (
                            <>
                                <button
                                    onClick={() => handleEdit(item)}
                                    style={{ ...menuBtnStyle, color: '#fff', borderBottom: '1px solid #333' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#333'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    ✏️ Düzenle
                                </button>
                                <button
                                    onClick={() => handleToggleStatus(item)}
                                    style={{ ...menuBtnStyle, color: item.status === 'PAID' ? '#ff453a' : '#32d74b', borderBottom: '1px solid #333' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#333'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    {item.status === 'PAID' ? '❌ Ödenmedi Yap' : '✅ Ödendi İşaretle'}
                                </button>
                                <button
                                    onClick={() => handleDeleteClick(item.id)}
                                    style={{ ...menuBtnStyle, color: '#ff453a' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#333'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    🗑️ Sil
                                </button>
                            </>
                        );
                    })()}
                </div>,
                document.body
            )}

            <AddPaymentModal
                isOpen={isModalOpen}
                initialData={editingPayment}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingPayment(null);
                }}
                onSave={handleSavePayment}
            />

            <FileUploadModal
                isOpen={isFileUploadOpen}
                onClose={() => setIsFileUploadOpen(false)}
                onSavePayments={(extractedPayments) => {
                    extractedPayments.forEach(payment => {
                        addPayment(payment);
                    });
                }}
                formatMoneyInput={formatMoneyInput}
                parseMoneyInput={parseMoneyInput}
            />
        </Layout>
    );
}

// Money Formatters
// Removed local formatMoney and parseMoney helpers in favor of context functions

// Add/Edit Payment Modal
function AddPaymentModal({ isOpen, onClose, onSave, initialData }) {
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
        recurringFrequency: 'MONTHLY'
    });
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        if (initialData) {
            setPaymentType(initialData.type || 'CREDIT_CARD');
            setFormData({
                institution: initialData.institution,
                description: initialData.description,
                amount: initialData.amount ? initialData.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '',
                minPayment: initialData.minPayment ? initialData.minPayment.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '',
                paymentAmount: initialData.paymentAmount ? initialData.paymentAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '',
                statementDate: initialData.statementDate,
                dueDate: initialData.dueDate,
                isRecurring: initialData.isRecurring || false,
                recurringFrequency: initialData.recurringFrequency || 'MONTHLY'
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
                recurringFrequency: 'MONTHLY'
            });
        }
        setFormErrors({});
    }, [initialData, isOpen]);

    // Handle Payment Type Change specifically to toggle recurring defaults
    const handlePaymentTypeChange = (e) => {
        const type = e.target.value;
        setPaymentType(type);
        // If switching to Credit Card, default recurring to True
        // If switching to others, leave it or set to false (user preference, but let's default false for others to be safe or keep previous)
        // Requirement: "kredi kartında düzenli ödeme default olarak seçili gelsin"
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

        // Validation Logic
        let institutionLabel = 'Kurum Adı';
        if (paymentType === 'CREDIT_CARD') institutionLabel = 'Kart / Banka Adı';
        if (paymentType === 'OTHER') institutionLabel = 'Ödeme Yeri';

        if (!formData.institution || formData.institution.trim() === '') {
            errors.institution = 'Bu alan zorunludur.';
        }

        if (!formData.dueDate) {
            errors.dueDate = 'Son ödeme tarihi seçiniz.';
        }

        // Amount Check: Required for non-credit cards
        if (paymentType !== 'CREDIT_CARD' && !formData.amount) {
            errors.amount = 'Tutar giriniz.';
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

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
            recurringFrequency: formData.recurringFrequency
        };

        onSave(payment);
    };

    if (!isOpen) return null;

    // inputStyle is now a function accepting the field name to apply red border on error
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

                    {/* Recurring Frequency Dropdown (Conditional) */}
                    {formData.isRecurring && (
                        <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                            <label style={labelStyle}>Ödeme Periyodu</label>
                            <select
                                name="recurringFrequency"
                                value={formData.recurringFrequency}
                                onChange={handleChange}
                                style={selectStyle('recurringFrequency')}
                            >
                                <option value="WEEKLY">Haftalık</option>
                                <option value="MONTHLY">Aylık (Varsayılan)</option>
                                <option value="QUARTERLY">3 Aylık</option>
                                <option value="YEARLY">Yıllık</option>
                            </select>
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
