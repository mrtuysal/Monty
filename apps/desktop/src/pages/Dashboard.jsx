import React, { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { useData } from '../context/DataContext';
import {
    FaWallet, FaMoneyBillWave, FaArrowRight, FaCreditCard,
    FaFileInvoiceDollar, FaEllipsisH, FaChevronLeft, FaChevronRight,
    FaHandshake, FaCalendarWeek, FaCheckCircle, FaRegCircle, FaSyncAlt
} from 'react-icons/fa';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getNextRecurringPayment, parseRecurringConfig } from '../lib/recurringPaymentService';

export default function Dashboard() {
    const { accounts, payments, receivables, dataLoading, convertToTRY, updatePayment, addPayment } = useData();
    const navigate = useNavigate();
    const [selectedCategory, setSelectedCategory] = useState(null); // 'CREDIT_CARD', 'BILL', 'OTHER'
    const [weekOffset, setWeekOffset] = useState(0); // 0 = Bu Hafta, -1 = Önceki Hafta, 1 = Sonraki Hafta

    // Date State
    const [selectedDate, setSelectedDate] = useState({
        month: new Date().getMonth(),
        year: new Date().getFullYear()
    });

    const MONTHS = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];

    const changeMonth = (direction) => {
        setSelectedDate(prev => {
            let newMonth = prev.month + direction;
            let newYear = prev.year;

            if (newMonth > 11) {
                newMonth = 0;
                newYear++;
            } else if (newMonth < 0) {
                newMonth = 11;
                newYear--;
            }
            return { month: newMonth, year: newYear };
        });
    };

    // Calculate Total Assets by Currency
    const totalAssets = useMemo(() => {
        const totals = {};
        accounts.forEach(acc => {
            totals[acc.currency] = (totals[acc.currency] || 0) + acc.balance;
        });
        return totals;
    }, [accounts]);

    // Calculate Consolidated TRY Value via TCMB Rates
    const consolidatedTRYAssets = useMemo(() => {
        return accounts.reduce((sum, acc) => {
            const val = convertToTRY ? convertToTRY(acc.balance, acc.currency) : acc.balance;
            return sum + (val || 0);
        }, 0);
    }, [accounts, convertToTRY]);

    // Receivables Summary
    const receivableStats = useMemo(() => {
        const totalReceivable = receivables
            .filter(r => r.type === 'RECEIVABLE' && r.status !== 'DONE')
            .reduce((s, r) => s + (r.amount || 0), 0);
        const totalDebt = receivables
            .filter(r => r.type === 'DEBT' && r.status !== 'DONE')
            .reduce((s, r) => s + (r.amount || 0), 0);
        return { totalReceivable, totalDebt, net: totalReceivable - totalDebt };
    }, [receivables]);

    // Payment Calculations
    // Using selectedDate state instead of hardcoded filtering

    const paymentStats = useMemo(() => {
        const relevantPayments = payments.filter(p => {
            const date = new Date(p.dueDate);
            return date.getMonth() === selectedDate.month &&
                date.getFullYear() === selectedDate.year; // Removed p.status === 'PENDING'
        });

        const stats = {
            total: 0,
            paid: 0,
            pending: 0,
            CREDIT_CARD: 0,
            BILL: 0,
            OTHER: 0,
            list: relevantPayments
        };

        relevantPayments.forEach(p => {
            // Total Liability (sum regardless of status)
            stats.total += p.amount;

            // Paid vs Pending breakdown
            if (p.status === 'PAID') {
                stats.paid += p.amount;
            } else {
                stats.pending += p.amount;
            }

            // Category Breakdown (Total per category)
            if (stats[p.type] !== undefined) {
                stats[p.type] += p.amount;
            }
        });

        return stats;
    }, [payments, selectedDate]);

    const formatCurrency = (amount, currency = 'TRY') => {
        const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₺';
        return `${symbol} ${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getCategoryIcon = (type) => {
        switch (type) {
            case 'CREDIT_CARD': return <FaCreditCard />;
            case 'BILL': return <FaFileInvoiceDollar />;
            default: return <FaEllipsisH />;
        }
    };

    const getCategoryLabel = (type) => {
        switch (type) {
            case 'CREDIT_CARD': return 'Kredi Kartları';
            case 'BILL': return 'Faturalar';
            default: return 'Diğer';
        }
    };

    // Weekly Payments Calculation
    const weekRange = useMemo(() => {
        const now = new Date();
        const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (weekOffset * 7));
        
        // Monday is day 1 (0 is Sunday)
        const day = targetDate.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        
        const monday = new Date(targetDate);
        monday.setDate(targetDate.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        return { monday, sunday, isCurrentWeek: weekOffset === 0 };
    }, [weekOffset]);

    const weeklyPayments = useMemo(() => {
        const { monday, sunday } = weekRange;
        return (payments || []).filter(p => {
            if (!p.dueDate) return false;
            const parts = p.dueDate.split('-');
            if (parts.length < 3) return false;
            const dueDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            return dueDate >= monday && dueDate <= sunday;
        }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }, [payments, weekRange]);

    const weeklyStats = useMemo(() => {
        let total = 0;
        let paid = 0;
        let pending = 0;
        let paidCount = 0;
        let pendingCount = 0;

        weeklyPayments.forEach(p => {
            const amt = parseFloat(p.amount) || 0;
            const toPay = parseFloat(p.paymentAmount) || amt;
            total += amt;
            if (p.status === 'PAID') {
                paid += amt;
                paidCount++;
            } else {
                pending += toPay;
                pendingCount++;
            }
        });

        return { total, paid, pending, paidCount, pendingCount, count: weeklyPayments.length };
    }, [weeklyPayments]);

    const handleToggleWeeklyPayment = (e, payment) => {
        e.stopPropagation();
        const isCurrentlyPaid = payment.status === 'PAID';
        const newStatus = isCurrentlyPaid ? 'PENDING' : 'PAID';
        const updatedPayment = { ...payment, status: newStatus };
        
        if (updatePayment) {
            updatePayment(updatedPayment);
        }

        // Ödendi yapıldığında tekrarlayan ödemenin sonraki dönemini otomatik oluştur
        if (newStatus === 'PAID' && payment.isRecurring && addPayment) {
            const nextPayment = getNextRecurringPayment(payment, payments);
            if (nextPayment) {
                addPayment(nextPayment);
            }
        }
    };

    const getRelativeDayLabel = (dateStr) => {
        if (!dateStr) return '';
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const parts = dateStr.split('-');
        const target = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        target.setHours(0, 0, 0, 0);

        const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
        const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        const dayName = dayNames[target.getDay()];

        if (diffDays === 0) return `Bugün (${dayName})`;
        if (diffDays === 1) return `Yarın (${dayName})`;
        if (diffDays === -1) return `Dün (${dayName})`;
        if (diffDays > 1 && diffDays <= 6) return `${diffDays} gün sonra (${dayName})`;
        if (diffDays < -1) return `${Math.abs(diffDays)} gün önce (${dayName})`;
        return `${dayName}, ${target.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}`;
    };

    return (
        <Layout>

            <h1 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '30px', margin: 0, paddingBottom: '20px' }}>Genel Bakış</h1>

            {dataLoading && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '12px', padding: '40px 0', color: 'var(--text-muted)'
                }}>
                    <div style={{
                        width: '24px', height: '24px', border: '3px solid var(--border)',
                        borderTopColor: 'var(--primary)', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                    }} />
                    <span>Veriler yükleniyor...</span>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Row 1: Total Assets */}
                <div
                    className="glass-panel"
                    style={{
                        padding: '25px',
                        borderRadius: 'var(--radius-lg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        background: 'linear-gradient(90deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.02) 100%)',
                        borderLeft: '4px solid #4caf50'
                    }}
                    onClick={() => navigate('/accounts')}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                        <div style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '12px',
                            background: 'rgba(76, 175, 80, 0.2)',
                            color: '#4caf50',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px'
                        }}>
                            <FaWallet />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#eee' }}>Varlıklar Toplamı</h2>
                            <p style={{ margin: '5px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                {accounts.length} Hesap
                            </p>
                        </div>
                    </div>

                    <div style={{ textAlign: 'right', minWidth: '200px' }}>
                        {Object.entries(totalAssets).map(([curr, amount]) => (
                            <div key={curr} style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', lineHeight: 1.2 }}>
                                {formatCurrency(amount, curr)}
                            </div>
                        ))}
                        {Object.keys(totalAssets).some(c => c !== 'TRY') && (
                            <div style={{ fontSize: '0.85rem', color: '#4caf50', marginTop: '4px', fontWeight: '500' }}>
                                ≈ ₺ {consolidatedTRYAssets.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (TCMB)
                            </div>
                        )}
                    </div>

                    <div style={{ color: 'var(--text-muted)', marginLeft: '15px' }}>
                        <FaArrowRight size={20} />
                    </div>
                </div>

                {/* Row 2: Receivables / Debts Summary */}
                <div
                    className="glass-panel"
                    style={{
                        padding: '25px',
                        borderRadius: 'var(--radius-lg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        background: 'linear-gradient(90deg, rgba(108, 99, 255, 0.1) 0%, rgba(108, 99, 255, 0.02) 100%)',
                        borderLeft: '4px solid #6c63ff'
                    }}
                    onClick={() => navigate('/receivables')}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                        <div style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '12px',
                            background: 'rgba(108, 99, 255, 0.2)',
                            color: '#6c63ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px'
                        }}>
                            <FaHandshake />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#eee' }}>Alacak / Borç</h2>
                            <p style={{ margin: '5px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                {receivables.filter(r => r.status !== 'DONE').length} aktif kayıt
                            </p>
                        </div>
                    </div>

                    <div style={{ textAlign: 'right', minWidth: '200px' }}>
                        <div style={{ display: 'flex', gap: '20px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '3px' }}>Alacak</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#4caf50' }}>
                                    {formatCurrency(receivableStats.totalReceivable, 'TRY')}
                                </div>
                            </div>
                            <div style={{ color: 'var(--border)', fontSize: '20px' }}>|</div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '3px' }}>Borç</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f44336' }}>
                                    {formatCurrency(receivableStats.totalDebt, 'TRY')}
                                </div>
                            </div>
                            <div style={{ color: 'var(--border)', fontSize: '20px' }}>|</div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '3px' }}>Net</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: receivableStats.net >= 0 ? '#4caf50' : '#f44336' }}>
                                    {receivableStats.net >= 0 ? '+' : ''}{formatCurrency(Math.abs(receivableStats.net), 'TRY')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ color: 'var(--text-muted)', marginLeft: '15px' }}>
                        <FaArrowRight size={20} />
                    </div>
                </div>

                {/* Row 3: Total Payments (Click goes to Payments page) */}
                <div
                    className="glass-panel"
                    style={{
                        padding: '25px',
                        borderRadius: 'var(--radius-lg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        background: 'linear-gradient(90deg, rgba(244, 67, 54, 0.1) 0%, rgba(244, 67, 54, 0.02) 100%)',
                        borderLeft: '4px solid #f44336'
                    }}
                    onClick={() => navigate('/payments')}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                        <div style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '12px',
                            background: 'rgba(244, 67, 54, 0.2)',
                            color: '#f44336',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px'
                        }}>
                            <FaMoneyBillWave />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#eee' }}>Ödemeler Toplamı</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px' }}>
                                <select
                                    value={selectedDate.month}
                                    onChange={(e) => setSelectedDate(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-select"
                                >
                                    {MONTHS.map((m, i) => (
                                        <option key={i} value={i} style={{ background: '#333' }}>{m}</option>
                                    ))}
                                </select>

                                <select
                                    value={selectedDate.year}
                                    onChange={(e) => setSelectedDate(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-select"
                                >
                                    {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 3 + i).map(y => (
                                        <option key={y} value={y} style={{ background: '#333' }}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style={{ textAlign: 'right', minWidth: '200px' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>
                            {formatCurrency(paymentStats.total, 'TRY')}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            <span style={{ color: '#4caf50' }}>Ödenen: {formatCurrency(paymentStats.paid)}</span>
                            <span style={{ margin: '0 5px' }}>|</span>
                            <span style={{ color: '#f44336' }}>Kalan: {formatCurrency(paymentStats.pending)}</span>
                        </div>
                    </div>

                    <div style={{ color: 'var(--text-muted)', marginLeft: '15px' }}>
                        <FaArrowRight size={20} />
                    </div>
                </div>

                {/* Haftalık Ödeme Listesi */}
                <div className="glass-panel" style={{
                    borderRadius: 'var(--radius-lg)',
                    padding: '22px 25px',
                    border: '1px solid var(--border)',
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(20, 20, 20, 0.6) 100%)'
                }}>
                    {/* Header & Week Controls */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '18px',
                        flexWrap: 'wrap',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '10px',
                                background: 'rgba(var(--primary-rgb, 108, 99, 255), 0.15)',
                                color: 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px'
                            }}>
                                <FaCalendarWeek />
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', fontWeight: '700' }}>
                                        Haftalık Ödeme Listesi
                                    </h2>
                                    {weekOffset === 0 ? (
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            background: 'rgba(76, 175, 80, 0.2)',
                                            color: '#4caf50'
                                        }}>
                                            Bu Hafta
                                        </span>
                                    ) : (
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            color: 'var(--text-muted)'
                                        }}>
                                            {weekOffset > 0 ? `+${weekOffset} Hafta Sonra` : `${Math.abs(weekOffset)} Hafta Önce`}
                                        </span>
                                    )}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '3px' }}>
                                    {weekRange.monday.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} – {weekRange.sunday.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                            </div>
                        </div>

                        {/* Navigation & Action Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                                onClick={() => setWeekOffset(prev => prev - 1)}
                                title="Önceki Hafta"
                            >
                                <FaChevronLeft size={10} /> Önceki
                            </button>
                            {weekOffset !== 0 && (
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                                    onClick={() => setWeekOffset(0)}
                                >
                                    Bugün
                                </button>
                            )}
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                                onClick={() => setWeekOffset(prev => prev + 1)}
                                title="Sonraki Hafta"
                            >
                                Sonraki <FaChevronRight size={10} />
                            </button>
                            <button
                                className="btn btn-primary"
                                style={{ padding: '6px 14px', fontSize: '12px', marginLeft: '6px' }}
                                onClick={() => navigate('/payments')}
                            >
                                Tüm Ödemeler →
                            </button>
                        </div>
                    </div>

                    {/* Weekly Mini Summary Bar */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '12px',
                        marginBottom: '18px'
                    }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            borderLeft: '3px solid var(--primary)'
                        }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Haftalık Toplam</span>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', marginTop: '3px' }}>
                                {formatCurrency(weeklyStats.total)}
                            </div>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{weeklyStats.count} ödeme planlandı</span>
                        </div>

                        <div style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            borderLeft: '3px solid var(--success, #10b981)'
                        }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ödenen</span>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--success, #10b981)', marginTop: '3px' }}>
                                {formatCurrency(weeklyStats.paid)}
                            </div>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{weeklyStats.paidCount} tamamlandı</span>
                        </div>

                        <div style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            borderLeft: '3px solid var(--warning, #f59e0b)'
                        }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kalan Ödenecek</span>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--warning, #f59e0b)', marginTop: '3px' }}>
                                {formatCurrency(weeklyStats.pending)}
                            </div>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{weeklyStats.pendingCount} bekliyor</span>
                        </div>
                    </div>

                    {/* Weekly Payments Table / List */}
                    {weeklyPayments.length === 0 ? (
                        <div style={{
                            padding: '36px 20px',
                            textAlign: 'center',
                            background: 'rgba(255, 255, 255, 0.015)',
                            borderRadius: '10px',
                            border: '1px dashed rgba(255, 255, 255, 0.1)'
                        }}>
                            <div style={{ fontSize: '30px', marginBottom: '8px' }}>🎉</div>
                            <div style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>
                                Bu hafta için planlanmış bir ödemeniz bulunmuyor.
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                                Başka haftaları incelemek için yukarıdaki butonları kullanabilir veya yeni ödeme ekleyebilirsiniz.
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {weeklyPayments.map(p => {
                                const isPaid = p.status === 'PAID';
                                const isOverdue = !isPaid && new Date(p.dueDate) < new Date();
                                return (
                                    <div
                                        key={p.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '12px 16px',
                                            background: isPaid ? 'rgba(76, 175, 80, 0.04)' : isOverdue ? 'rgba(255, 69, 58, 0.07)' : 'rgba(255, 255, 255, 0.03)',
                                            borderRadius: '10px',
                                            border: isPaid ? '1px solid rgba(76, 175, 80, 0.2)' : isOverdue ? '1px solid rgba(255, 69, 58, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                                            transition: 'all 0.15s',
                                            gap: '15px'
                                        }}
                                    >
                                        {/* Status Toggle Button */}
                                        <button
                                            onClick={(e) => handleToggleWeeklyPayment(e, p)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '2px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                color: isPaid ? '#4caf50' : isOverdue ? '#ff453a' : 'var(--text-muted)',
                                                fontSize: '20px',
                                                transition: 'transform 0.15s'
                                            }}
                                            title={isPaid ? 'Ödenmedi olarak işaretle' : 'Ödendi olarak işaretle'}
                                        >
                                            {isPaid ? <FaCheckCircle /> : <FaRegCircle />}
                                        </button>

                                        {/* Category Icon & Info */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '8px',
                                                background: 'rgba(255, 255, 255, 0.06)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'var(--text-muted)',
                                                fontSize: '15px',
                                                flexShrink: 0
                                            }}>
                                                {getCategoryIcon(p.type)}
                                            </div>
                                            <div style={{ overflow: 'hidden' }}>
                                                <div style={{
                                                    color: isPaid ? 'var(--text-muted)' : '#fff',
                                                    fontWeight: '600',
                                                    fontSize: '13.5px',
                                                    textDecoration: isPaid ? 'line-through' : 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    <span>{p.institution}</span>
                                                    {p.isRecurring && (() => {
                                                        const parsed = parseRecurringConfig(p.recurringFrequency);
                                                        return (
                                                            <span
                                                                title={parsed.type === 'COUNT' ? `Toplam ${parsed.totalCount} tekrarın ${parsed.currentIndex}. döngüsü` : 'Süresiz tekrarlayan ödeme'}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '3px',
                                                                    padding: '1px 5px',
                                                                    borderRadius: '4px',
                                                                    fontSize: '10px',
                                                                    fontWeight: '600',
                                                                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                                                                    color: 'var(--primary)',
                                                                    border: '1px solid rgba(56, 189, 248, 0.3)',
                                                                    textDecoration: 'none'
                                                                }}
                                                            >
                                                                <FaSyncAlt style={{ fontSize: '9px' }} />
                                                                {parsed.label}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {p.description || getCategoryLabel(p.type)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Due Date & Relative Day */}
                                        <div style={{ textAlign: 'right', minWidth: '130px' }}>
                                            <div style={{
                                                fontSize: '12.5px',
                                                fontWeight: '600',
                                                color: isPaid ? 'var(--text-muted)' : isOverdue ? '#ff453a' : '#fff'
                                            }}>
                                                {getRelativeDayLabel(p.dueDate)}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                {new Date(p.dueDate).toLocaleDateString('tr-TR')}
                                            </div>
                                        </div>

                                        {/* Amount */}
                                        <div style={{ textAlign: 'right', minWidth: '120px' }}>
                                            <div style={{
                                                fontSize: '14.5px',
                                                fontWeight: 'bold',
                                                color: isPaid ? 'var(--text-muted)' : '#fff',
                                                textDecoration: isPaid ? 'line-through' : 'none'
                                            }}>
                                                {formatCurrency(p.amount)}
                                            </div>
                                            {p.paymentAmount && p.paymentAmount !== p.amount && (
                                                <div style={{ fontSize: '11px', color: 'var(--primary)' }}>
                                                    Ödenecek: {formatCurrency(p.paymentAmount)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Row 3: Payment Breakdown Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                    {['CREDIT_CARD', 'BILL', 'OTHER'].map(type => (
                        <div
                            key={type}
                            className="glass-panel"
                            style={{
                                padding: '20px',
                                borderRadius: 'var(--radius-lg)',
                                cursor: 'pointer',
                                background: selectedCategory === type ? 'rgba(108, 99, 255, 0.15)' : 'rgba(30, 30, 30, 0.6)',
                                border: selectedCategory === type ? '1px solid #6c63ff' : '1px solid rgba(255,255,255,0.05)',
                                transition: 'all 0.2s'
                            }}
                            onClick={() => setSelectedCategory(selectedCategory === type ? null : type)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                <div style={{ color: selectedCategory === type ? '#6c63ff' : 'var(--text-muted)' }}>
                                    {getCategoryIcon(type)}
                                </div>
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                    {getCategoryLabel(type)}
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>
                                    {formatCurrency(paymentStats[type], 'TRY')}
                                </div>
                                {/* Show breakdown per category? Maybe overkill, keep it simple for now */}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Row 4: Category Detail Table (Sliding Down) */}
                {selectedCategory && (
                    <div style={{
                        animation: 'slideDown 0.3s ease-out',
                        marginTop: '10px'
                    }}>
                        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                            <div style={{
                                padding: '15px 20px',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'rgba(255,255,255,0.02)'
                            }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {getCategoryIcon(selectedCategory)}
                                    {getCategoryLabel(selectedCategory)} Detayları
                                </h3>
                                <button
                                    onClick={() => setSelectedCategory(null)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                >
                                    &times; Kapat
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                {/* Chart Section */}
                                <div style={{ flex: '1 1 300px', height: '300px', position: 'relative', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                                    {paymentStats.list.filter(p => p.type === selectedCategory).length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={paymentStats.list.filter(p => p.type === selectedCategory).map(p => ({
                                                        name: p.description,
                                                        value: p.amount
                                                    }))}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {paymentStats.list.filter(p => p.type === selectedCategory).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'][index % 6]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value) => formatCurrency(value)}
                                                    contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333', color: '#fff', borderRadius: '8px' }}
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                                            Veri yok
                                        </div>
                                    )}
                                </div>

                                {/* Table Section */}
                                <div style={{ flex: '2 1 400px', overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(0,0,0,0.2)', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'left' }}>
                                                <th style={{ padding: '12px 20px' }}>AÇIKLAMA</th>
                                                <th style={{ padding: '12px 20px' }}>KURUM</th>
                                                <th style={{ padding: '12px 20px' }}>SON ÖDEME</th>
                                                <th style={{ padding: '12px 20px', textAlign: 'right' }}>TUTAR</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paymentStats.list
                                                .filter(p => p.type === selectedCategory)
                                                .map(payment => (
                                                    <tr key={payment.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                        <td style={{ padding: '12px 20px', color: '#fff' }}>{payment.description}</td>
                                                        <td style={{ padding: '12px 20px', color: 'var(--text-muted)' }}>{payment.institution}</td>
                                                        <td style={{ padding: '12px 20px', color: '#f44336' }}>
                                                            {new Date(payment.dueDate).toLocaleDateString('tr-TR')}
                                                        </td>
                                                        <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 'bold' }}>
                                                            {formatCurrency(payment.amount)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            {paymentStats.list.filter(p => p.type === selectedCategory).length === 0 && (
                                                <tr>
                                                    <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                        Bu kategoride bekleyen ödeme yok.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Keyframes for animation */}
                <style>{`
                    @keyframes slideDown {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>

            </div>
        </Layout>
    );
}
