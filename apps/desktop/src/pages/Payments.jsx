import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Layout from '../components/Layout';
import FileUploadModal from '../components/FileUploadModal';
import AddPaymentModal from '../components/AddPaymentModal';
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
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-indexed

    // Click outside and Scroll listener to close menus
    useEffect(() => {
        const handleCloseMenu = () => setMenuOpenId(null);
        if (menuOpenId) {
            document.addEventListener('click', handleCloseMenu);
            // true flag catches scroll events in capture phase
            window.addEventListener('scroll', handleCloseMenu, true); 
        }
        return () => {
            document.removeEventListener('click', handleCloseMenu);
            window.removeEventListener('scroll', handleCloseMenu, true);
        };
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

    // Count payments per month for the selected year
    const monthStats = useMemo(() => {
        const counts = {};
        (allPayments || []).forEach(p => {
            if (!p.dueDate) return;
            const d = new Date(p.dueDate);
            if (d.getFullYear() === selectedYear) {
                const m = d.getMonth();
                counts[m] = (counts[m] || 0) + 1;
            }
        });
        return counts;
    }, [allPayments, selectedYear]);

    // Calculate Totals & Category Subtotals
    const totals = useMemo(() => {
        const now = new Date();
        const initial = {
            amount: 0,
            minPayment: 0,
            paymentAmount: 0,
            balance: 0,
            paidAmount: 0,
            pendingAmount: 0,
            overdueAmount: 0,
            paidCount: 0,
            pendingCount: 0,
            overdueCount: 0,
            byType: {
                CREDIT_CARD: { label: 'Kredi Kartları', amount: 0, minPayment: 0, paymentAmount: 0, balance: 0, count: 0 },
                BILL: { label: 'Faturalar', amount: 0, minPayment: 0, paymentAmount: 0, balance: 0, count: 0 },
                OTHER: { label: 'Diğer Ödemeler', amount: 0, minPayment: 0, paymentAmount: 0, balance: 0, count: 0 }
            }
        };

        return filteredPayments.reduce((acc, p) => {
            const amt = parseFloat(p.amount) || 0;
            const min = parseFloat(p.minPayment) || 0;
            const toPay = parseFloat(p.paymentAmount) || 0;
            const bal = (p.balance !== undefined && p.balance !== null && p.balance !== '' && !isNaN(parseFloat(p.balance)))
                ? parseFloat(p.balance)
                : Math.max(0, amt - toPay);
            const isPaid = p.status === 'PAID';
            const isOverdue = !isPaid && new Date(p.dueDate) < now;

            acc.amount += amt;
            acc.minPayment += min;
            acc.paymentAmount += toPay;
            acc.balance += bal;

            if (isPaid) {
                acc.paidAmount += amt;
                acc.paidCount += 1;
            } else if (isOverdue) {
                acc.overdueAmount += amt;
                acc.overdueCount += 1;
            } else {
                acc.pendingAmount += amt;
                acc.pendingCount += 1;
            }

            const rawType = (p.type || 'OTHER').toUpperCase();
            const typeKey = (rawType in acc.byType) ? rawType : 'OTHER';
            acc.byType[typeKey].amount += amt;
            acc.byType[typeKey].minPayment += min;
            acc.byType[typeKey].paymentAmount += toPay;
            acc.byType[typeKey].balance += bal;
            acc.byType[typeKey].count += 1;

            return acc;
        }, initial);
    }, [filteredPayments]);

    const formatCurrencyTRY = (val) =>
        `₺ ${(val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

    const addPeriod = (dateStr, freq) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (freq === 'WEEKLY') d.setDate(d.getDate() + 7);
        else if (freq === 'QUARTERLY') d.setMonth(d.getMonth() + 3);
        else if (freq === 'YEARLY') d.setFullYear(d.getFullYear() + 1);
        else d.setMonth(d.getMonth() + 1); // Default MONTHLY
        return d.toISOString().split('T')[0];
    };

    const handleToggleStatus = (payment) => {
        const isCurrentlyPaid = payment.status === 'PAID';
        const newStatus = isCurrentlyPaid ? 'PENDING' : 'PAID';
        
        const updatedPayment = { ...payment, status: newStatus };
        updatePayment(updatedPayment);

        // Toggling to PAID and is recurring -> spawn next payment
        if (newStatus === 'PAID' && payment.isRecurring) {
            const nextDueDate = addPeriod(payment.dueDate, payment.recurringFrequency);
            
            // Check if next payment already exists to prevent duplicate creation
            const alreadyExists = allPayments.some(p => 
                p.institution === payment.institution && 
                p.type === payment.type &&
                p.dueDate === nextDueDate
            );

            if (!alreadyExists) {
                const nextPayment = { ...payment };
                delete nextPayment.id;
                nextPayment.status = 'PENDING';
                nextPayment.dueDate = nextDueDate;
                
                if (payment.statementDate) {
                    nextPayment.statementDate = addPeriod(payment.statementDate, payment.recurringFrequency);
                }

                if (payment.type === 'CREDIT_CARD') {
                    nextPayment.amount = 0;
                    nextPayment.minPayment = 0;
                    nextPayment.paymentAmount = 0;
                    nextPayment.balance = 0;
                } else {
                    nextPayment.paymentAmount = nextPayment.amount;
                    nextPayment.balance = 0;
                }

                addPayment(nextPayment);
            }
        }
        
        setMenuOpenId(null);
    };

    const handleSavePayment = (payment) => {
        if (editingPayment) {
            updatePayment(payment);
        } else {
            // Add new
            addPayment(payment);
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
                {MONTHS.map((month, index) => {
                    const count = monthStats[index] || 0;
                    const isSelected = selectedMonth === index;
                    return (
                        <button
                            key={month}
                            onClick={() => setSelectedMonth(index)}
                            style={{
                                background: isSelected ? 'var(--primary)' : 'transparent',
                                color: isSelected ? '#fff' : 'var(--text-muted)',
                                border: isSelected ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
                                borderRadius: '8px',
                                padding: '8px 4px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '13px',
                                transition: 'all 0.2s',
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                position: 'relative'
                            }}
                        >
                            <span>{month}</span>
                            {count > 0 && (
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    padding: '1px 6px',
                                    borderRadius: '10px',
                                    background: isSelected ? 'rgba(255,255,255,0.3)' : 'var(--primary)',
                                    color: '#fff',
                                    lineHeight: '1.3'
                                }}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Toplamlar ve Durum Özeti */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
            }}>
                <div className="glass-panel" style={{ padding: '14px 18px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bu Ay Toplam Tutar</span>
                    <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '4px' }}>
                        {formatCurrencyTRY(totals.amount)}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{filteredPayments.length} ödeme kaydı</span>
                </div>

                <div className="glass-panel" style={{ padding: '14px 18px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--success, #10b981)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ödenen Toplam</span>
                    <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: 'var(--success, #10b981)', marginTop: '4px' }}>
                        {formatCurrencyTRY(totals.paidAmount)}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{totals.paidCount} ödendi</span>
                </div>

                <div className="glass-panel" style={{ padding: '14px 18px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--warning, #f59e0b)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bekleyen Ödenecek</span>
                    <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: 'var(--warning, #f59e0b)', marginTop: '4px' }}>
                        {formatCurrencyTRY(totals.pendingAmount)}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{totals.pendingCount} bekliyor</span>
                </div>

                <div className="glass-panel" style={{ padding: '14px 18px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--error, #ff453a)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Geciken Tutar</span>
                    <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: 'var(--error, #ff453a)', marginTop: '4px' }}>
                        {formatCurrencyTRY(totals.overdueAmount)}
                    </div>
                    <span style={{ fontSize: '12px', color: totals.overdueCount > 0 ? 'var(--error, #ff453a)' : 'var(--text-muted)' }}>
                        {totals.overdueCount > 0 ? `${totals.overdueCount} gecikmiş!` : 'Geciken yok 🎉'}
                    </span>
                </div>
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
                                        <React.Fragment key={item.id}>
                                            <tr style={{
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                borderTop: isGroupStart ? '2px solid rgba(255, 255, 255, 0.15)' : 'none',
                                                backgroundColor: isOverdue ? 'rgba(255, 0, 0, 0.3)' : 'transparent'
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

                                                        let color = '#ffcc00';
                                                        let text = 'BEKLİYOR';

                                                        if (isPaid) {
                                                            color = '#32d74b';
                                                            text = 'ÖDENDİ';
                                                        } else if (isOverdue) {
                                                            color = '#ff453a';
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

                                            {/* Kategori Alt Toplamı */}
                                            {(() => {
                                                const currentType = (item.type || 'OTHER').toUpperCase();
                                                const nextType = filteredPayments[index + 1] ? (filteredPayments[index + 1].type || 'OTHER').toUpperCase() : null;
                                                const isLastOfType = index === filteredPayments.length - 1 || nextType !== currentType;
                                                const sub = totals.byType[currentType] || totals.byType['OTHER'];

                                                if (isLastOfType) {
                                                    return (
                                                        <tr key={`subtotal-${currentType}-${index}`} style={{
                                                            background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.03) 100%)',
                                                            borderBottom: '2px solid rgba(255, 255, 255, 0.18)',
                                                            borderTop: '1px dashed rgba(255, 255, 255, 0.2)'
                                                        }}>
                                                            <td colSpan="4" style={{ padding: '11px 14px', color: '#fff', fontSize: '13px', fontWeight: '700' }}>
                                                                <span style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    background: 'rgba(255,255,255,0.08)',
                                                                    padding: '3px 8px',
                                                                    borderRadius: '6px'
                                                                }}>
                                                                    ↳ {sub.label} Alt Toplamı ({sub.count} adet)
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '11px 10px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: '800', fontSize: '13.5px', color: '#fff' }}>
                                                                {formatCurrencyTRY(sub.amount)}
                                                            </td>
                                                            <td style={{ padding: '11px 10px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                                                                {formatCurrencyTRY(sub.minPayment)}
                                                            </td>
                                                            <td style={{ padding: '11px 10px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '13.5px', color: 'var(--primary)', fontWeight: '700' }}>
                                                                {formatCurrencyTRY(sub.paymentAmount)}
                                                            </td>
                                                            <td style={{ padding: '11px 10px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '13.5px', color: 'var(--error, #ff453a)', fontWeight: '700' }}>
                                                                {formatCurrencyTRY(sub.balance)}
                                                            </td>
                                                            <td colSpan="2" style={{ padding: '11px 10px' }} />
                                                        </tr>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                        <tfoot>
                            <tr style={{
                                borderTop: '2px solid var(--primary)',
                                borderBottom: '2px solid var(--primary)',
                                background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.04) 100%)',
                                fontWeight: 'bold'
                            }}>
                                <td colSpan="4" style={{ padding: '15px 14px', fontSize: '13.5px', color: 'var(--text-main)', letterSpacing: '0.5px' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: '800' }}>
                                        📊 DÖNEM GENEL TOPLAMI ({filteredPayments.length} Ödeme)
                                    </span>
                                </td>
                                <td style={{ padding: '15px 10px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '14.5px', color: '#fff', fontWeight: '800' }}>
                                    {formatCurrencyTRY(totals.amount)}
                                </td>
                                <td style={{ padding: '15px 10px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '13.5px', color: 'var(--text-muted)' }}>
                                    {formatCurrencyTRY(totals.minPayment)}
                                </td>
                                <td style={{ padding: '15px 10px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '14.5px', color: 'var(--primary)', fontWeight: '800' }}>
                                    {formatCurrencyTRY(totals.paymentAmount)}
                                </td>
                                <td style={{ padding: '15px 10px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '14.5px', color: 'var(--error, #ff453a)', fontWeight: '800' }}>
                                    {formatCurrencyTRY(totals.balance)}
                                </td>
                                <td style={{ padding: '15px 10px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: totals.overdueCount > 0 ? 'var(--error, #ff453a)' : 'var(--success, #10b981)' }}>
                                    {totals.paidCount}/{filteredPayments.length} Ödendi
                                </td>
                                <td style={{ padding: '15px 10px' }} />
                            </tr>
                        </tfoot>
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

// Component End
