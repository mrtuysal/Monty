import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaPlus, FaMinus, FaTrash, FaPen, FaList, FaHistory, FaLink, FaUnlink, FaSearch } from 'react-icons/fa';
import { useData } from '../context/DataContext';

// Helper for formatting time (HH:MM or DD/MM/YYYY)
const formatDate = (dateString, full = false) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (full) return date.toLocaleDateString('tr-TR') + ' ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); // Just time for recent logs
};

const formatMoney = (amount) => {
    return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function TransactionPopups({
    account,
    isOpen,
    onClose,
    mode = 'add', // 'add' or 'history'
    onAddTransaction,
    onDeleteTransaction,
    onEditTransaction
}) {
    const { formatMoneyInput, parseMoneyInput, payments, updatePayment } = useData();
    const [amount, setAmount] = useState('');
    const [isNegative, setIsNegative] = useState(false);
    const inputRef = useRef(null);

    // Inline delete confirmation (replaces window.confirm to avoid focus loss)
    const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

    // Session tracking: IDs of transactions that existed BEFORE popup opened
    const [sessionStartIds, setSessionStartIds] = useState(new Set());

    // Editing State for History Mode
    const [editingTxId, setEditingTxId] = useState(null);
    const [editAmount, setEditAmount] = useState('');

    // Payment linking
    const [linkedPaymentId, setLinkedPaymentId] = useState(null);
    const [showLinkPanel, setShowLinkPanel] = useState(false);
    const [paymentSearch, setPaymentSearch] = useState('');

    useEffect(() => {
        if (isOpen && mode === 'add') {
            const currentIds = new Set((account.transactions || []).map(t => t.id));
            setSessionStartIds(currentIds);
            setAmount('');
            setIsNegative(false);
            setConfirmingDeleteId(null);
            setLinkedPaymentId(null);
            setShowLinkPanel(false);
            setPaymentSearch('');
            setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 50);
        }
        if (!isOpen) {
            setEditingTxId(null);
            setConfirmingDeleteId(null);
        }
    }, [isOpen, mode]);

    const handleAmountChange = (e) => {
        let val = e.target.value;
        if (val.includes('-')) {
            setIsNegative(true);
            val = val.replace('-', '');
        }
        const formatted = formatMoneyInput(val);
        setAmount(formatted);
    };

    const handleAddEntry = (e) => {
        if (e) e.preventDefault();
        if (!amount) return;

        let numAmount = parseMoneyInput(amount);
        if (isNaN(numAmount) || numAmount === 0) return;

        if (isNegative) numAmount = -numAmount;

        onAddTransaction(account.id, numAmount);

        // If a payment is linked, mark it as PAID
        if (linkedPaymentId) {
            const payment = payments.find(p => p.id === linkedPaymentId);
            if (payment) {
                updatePayment({ ...payment, status: 'PAID', paymentAmount: Math.abs(numAmount) });
            }
            setLinkedPaymentId(null);
            setShowLinkPanel(false);
            setPaymentSearch('');
        }

        setAmount('');
        setIsNegative(false);
        setConfirmingDeleteId(null);
        setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 50);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddEntry();
        }
    };

    const handleDeleteConfirmed = (txId) => {
        onDeleteTransaction(account.id, txId);
        setConfirmingDeleteId(null);
        setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 50);
    };

    const handleEditSave = (tx) => {
        let numAmount = parseFloat(editAmount.replace(',', '.'));
        if (isNaN(numAmount)) return;
        if (editAmount.includes('-')) numAmount = -Math.abs(numAmount);
        onEditTransaction(account.id, tx.id, numAmount);
        setEditingTxId(null);
    };

    if (!isOpen) return null;

    // All transactions sorted newest first
    const allTransactions = (account.transactions || []).sort((a, b) => new Date(b.date) - new Date(a.date));

    // Split: session (added this popup open) vs pre-existing (existed before popup opened)
    const sessionTxs = allTransactions.filter(tx => !sessionStartIds.has(tx.id));
    const prevTxs = allTransactions.filter(tx => sessionStartIds.has(tx.id)).slice(0, 5);

    return createPortal(
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }} onClick={onClose}>
            <div style={{
                background: '#1e1e1e',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '420px',
                padding: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '85vh'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>
                            {mode === 'add' ? 'Hızlı İşlem Ekle' : 'İşlem Geçmişi'}
                        </h2>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
                            {account.name}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}
                    >
                        &times;
                    </button>
                </div>

                {/* ADD MODE CONTENT */}
                {mode === 'add' && (
                    <>
                        <div>
                            <div style={{ position: 'relative', marginBottom: '8px' }}>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={isNegative ? '-' + amount : amount}
                                    onChange={handleAmountChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="0,00"
                                    style={{
                                        width: '100%',
                                        background: isNegative ? 'rgba(244, 67, 54, 0.1)' : 'rgba(76, 175, 80, 0.1)',
                                        border: `2px solid ${isNegative ? '#f44336' : '#4caf50'}`,
                                        borderRadius: '12px',
                                        padding: '20px',
                                        fontSize: '2rem',
                                        color: '#fff',
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                {isNegative && <div style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: '#f44336', fontSize: '0.9rem' }}>Gider</div>}
                                {!isNegative && amount && <div style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: '#4caf50', fontSize: '0.9rem' }}>Gelir</div>}
                            </div>

                            {/* Live Balance Preview */}
                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '15px',
                                borderRadius: '12px',
                                marginBottom: '12px',
                                textAlign: 'center',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '5px' }}>
                                    Yeni Bakiye
                                </div>
                                <div style={{
                                    fontSize: '1.8rem',
                                    fontWeight: 'bold',
                                    color: (amount ? (account.balance + (isNegative ? -parseMoneyInput(amount) : parseMoneyInput(amount))) : account.balance) >= 0 ? '#4caf50' : '#f44336'
                                }}>
                                    {formatMoney(amount ? (account.balance + (isNegative ? -parseMoneyInput(amount) : parseMoneyInput(amount))) : account.balance)} ₺
                                </div>
                                {amount && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                                        (Mevcut: {formatMoney(account.balance)} ₺)
                                    </div>
                                )}
                            </div>

                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '12px' }}>
                                Enter veya Ekle ile kaydet, sonraki rakamı gir. Eksi (-) ile gider girebilirsiniz.
                            </div>

                            {/* ── Payment Link Panel ── */}
                            <div style={{ marginBottom: '12px' }}>
                                {/* Toggle button */}
                                {!showLinkPanel && !linkedPaymentId && (
                                    <button
                                        onClick={() => setShowLinkPanel(true)}
                                        style={{
                                            width: '100%',
                                            background: 'rgba(108,99,255,0.08)',
                                            border: '1px dashed rgba(108,99,255,0.35)',
                                            borderRadius: '8px',
                                            color: 'rgba(108,99,255,0.8)',
                                            padding: '8px',
                                            cursor: 'pointer',
                                            fontSize: '0.82rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.15)'; e.currentTarget.style.borderColor = 'rgba(108,99,255,0.6)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(108,99,255,0.35)'; }}
                                    >
                                        <FaLink size={11} /> Ödemeye Bağla (İsteğe Bağlı)
                                    </button>
                                )}

                                {/* Selected payment badge */}
                                {linkedPaymentId && (() => {
                                    const p = payments.find(x => x.id === linkedPaymentId);
                                    return p ? (
                                        <div style={{
                                            background: 'rgba(76,175,80,0.12)',
                                            border: '1px solid rgba(76,175,80,0.4)',
                                            borderRadius: '8px',
                                            padding: '10px 12px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FaLink size={12} color="#4caf50" />
                                                <div>
                                                    <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: '600' }}>{p.institution}</div>
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{p.description} · {p.amount > 0 ? `₺${formatMoney(p.amount)}` : ''}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ background: '#4caf50', color: '#fff', borderRadius: '4px', padding: '2px 7px', fontSize: '0.72rem', fontWeight: '700' }}>Bağlı ✓</span>
                                                <button
                                                    onClick={() => { setLinkedPaymentId(null); setShowLinkPanel(false); setTimeout(() => inputRef.current?.focus(), 50); }}
                                                    title="Bağlantıyı Kaldır"
                                                    style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', padding: '2px' }}
                                                ><FaUnlink size={12} /></button>
                                            </div>
                                        </div>
                                    ) : null;
                                })()}

                                {/* Search panel */}
                                {showLinkPanel && !linkedPaymentId && (() => {
                                    const pendingPayments = payments.filter(p =>
                                        p.status?.toUpperCase() !== 'PAID' &&
                                        (paymentSearch === '' ||
                                         p.institution?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                                         p.description?.toLowerCase().includes(paymentSearch.toLowerCase()))
                                    ).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

                                    return (
                                        <div style={{
                                            background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(108,99,255,0.3)',
                                            borderRadius: '10px',
                                            padding: '12px',
                                            animation: 'slideDown 0.2s ease-out forwards'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bekleyen Ödemeler</span>
                                                <button onClick={() => { setShowLinkPanel(false); setTimeout(() => inputRef.current?.focus(), 50); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>×</button>
                                            </div>

                                            {/* Search input */}
                                            <div style={{ position: 'relative', marginBottom: '8px' }}>
                                                <FaSearch size={11} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                <input
                                                    type="text"
                                                    value={paymentSearch}
                                                    onChange={e => setPaymentSearch(e.target.value)}
                                                    placeholder="Kurum veya açıklama ara..."
                                                    autoFocus
                                                    style={{
                                                        width: '100%',
                                                        paddingLeft: '30px',
                                                        padding: '7px 7px 7px 30px',
                                                        background: '#1a1a1a',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: '6px',
                                                        color: '#fff',
                                                        fontSize: '0.82rem',
                                                        outline: 'none',
                                                        boxSizing: 'border-box'
                                                    }}
                                                />
                                            </div>

                                            {/* Payment list */}
                                            <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                {pendingPayments.length === 0 && (
                                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px', fontSize: '0.8rem' }}>
                                                        Bekleyen ödeme bulunamadı
                                                    </div>
                                                )}
                                                {pendingPayments.map(p => {
                                                    const isOverdue = new Date(p.dueDate) < new Date();
                                                    return (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => { setLinkedPaymentId(p.id); setShowLinkPanel(false); setTimeout(() => inputRef.current?.focus(), 50); }}
                                                            style={{
                                                                width: '100%',
                                                                background: 'rgba(255,255,255,0.04)',
                                                                border: '1px solid transparent',
                                                                borderRadius: '6px',
                                                                padding: '8px 10px',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                textAlign: 'left',
                                                                transition: 'all 0.15s'
                                                            }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.15)'; e.currentTarget.style.borderColor = 'rgba(108,99,255,0.4)'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'transparent'; }}
                                                        >
                                                            <div>
                                                                <div style={{ color: '#fff', fontSize: '0.82rem', fontWeight: '600' }}>{p.institution}</div>
                                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginTop: '1px' }}>
                                                                    {p.description} · Son: {new Date(p.dueDate).toLocaleDateString('tr-TR')}
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                                                                <div style={{ color: '#fff', fontWeight: '700', fontSize: '0.82rem' }}>₺{formatMoney(p.amount)}</div>
                                                                {isOverdue && <div style={{ color: '#f44336', fontSize: '0.68rem', fontWeight: '600' }}>GECİKTİ</div>}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                            {/* ── End Payment Link Panel ── */}

                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                <button
                                    onClick={handleAddEntry}
                                    className="btn btn-primary"
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        fontSize: '1rem',
                                        borderRadius: '8px',
                                        fontWeight: '600',
                                    }}
                                >
                                    ➕ Ekle
                                </button>
                                <button
                                    onClick={onClose}
                                    className="btn btn-secondary"
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        fontSize: '1rem',
                                        borderRadius: '8px',
                                        fontWeight: '600',
                                    }}
                                >
                                    ✓ Kaydet ve Kapat
                                </button>
                            </div>
                        </div>

                        {/* Transaction List — current session + last 5 previous */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

                            {/* Session entries (all new ones added since popup opened) */}
                            {sessionTxs.length > 0 && (
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Bu Oturum ({sessionTxs.length})</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '180px', overflowY: 'auto' }}>
                                        {sessionTxs.map((tx, index) => (
                                            <div key={tx.id} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '7px 10px',
                                                borderRadius: '8px',
                                                background: confirmingDeleteId === tx.id ? 'rgba(244,67,54,0.1)' : 'rgba(255,255,255,0.04)',
                                                border: confirmingDeleteId === tx.id ? '1px solid rgba(244,67,54,0.4)' : '1px solid transparent',
                                                transition: 'background 0.15s',
                                                animation: index === 0 ? 'slideDown 0.25s ease-out forwards' : 'none'
                                            }}>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: tx.amount >= 0 ? '#4caf50' : '#f44336', flexShrink: 0 }} />
                                                    <span style={{ color: '#aaa', fontSize: '0.8rem' }}>{formatDate(tx.date, true)}</span>
                                                </div>

                                                {confirmingDeleteId === tx.id ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{ color: '#aaa', fontSize: '0.78rem' }}>Silinsin mi?</span>
                                                        <button
                                                            onClick={() => handleDeleteConfirmed(tx.id)}
                                                            style={{ background: '#f44336', border: 'none', color: '#fff', borderRadius: '4px', padding: '2px 8px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '600' }}
                                                        >Evet</button>
                                                        <button
                                                            onClick={() => { setConfirmingDeleteId(null); setTimeout(() => inputRef.current?.focus(), 50); }}
                                                            style={{ background: '#333', border: 'none', color: '#fff', borderRadius: '4px', padding: '2px 8px', fontSize: '0.78rem', cursor: 'pointer' }}
                                                        >Hayır</button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ color: tx.amount >= 0 ? '#4caf50' : '#f44336', fontWeight: '600', fontSize: '0.9rem' }}>
                                                            {tx.amount > 0 ? '+' : ''}{formatMoney(tx.amount)} ₺
                                                        </span>
                                                        <button
                                                            onClick={() => setConfirmingDeleteId(tx.id)}
                                                            title="Sil"
                                                            style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', padding: '2px 4px', opacity: 0.6, transition: 'opacity 0.15s' }}
                                                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                            onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                                                        >
                                                            <FaTrash size={11} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Previous transactions (up to 5, existed before popup opened) */}
                            {prevTxs.length > 0 && (
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                        Önceki ({prevTxs.length})
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '130px', overflowY: 'auto' }}>
                                        {prevTxs.map(tx => (
                                            <div key={tx.id} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '7px 10px',
                                                borderRadius: '8px',
                                                opacity: 0.65
                                            }}>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: tx.amount >= 0 ? '#4caf50' : '#f44336', flexShrink: 0 }} />
                                                    <span style={{ color: '#aaa', fontSize: '0.8rem' }}>{formatDate(tx.date, true)}</span>
                                                </div>
                                                <span style={{ color: tx.amount >= 0 ? '#4caf50' : '#f44336', fontWeight: '600', fontSize: '0.9rem' }}>
                                                    {tx.amount > 0 ? '+' : ''}{formatMoney(tx.amount)} ₺
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {sessionTxs.length === 0 && prevTxs.length === 0 && (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '0.9rem' }}>
                                    Henüz işlem yok
                                </div>
                            )}
                        </div>

                        {/* Inline Style for Animation */}
                        <style>{`
                            @keyframes slideDown {
                                from { opacity: 0; transform: translateY(-8px); }
                                to { opacity: 1; transform: translateY(0); }
                            }
                        `}</style>
                    </>
                )}

                {/* HISTORY MODE CONTENT */}
                {mode === 'history' && (
                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                        {allTransactions.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                                İşlem geçmişi bulunamadı.
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '10px 5px', color: 'var(--text-muted)', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>TARİH</th>
                                        <th style={{ textAlign: 'right', padding: '10px 5px', color: 'var(--text-muted)', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>TUTAR</th>
                                        <th style={{ width: '60px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allTransactions.map(tx => (
                                        <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '12px 5px', color: '#eee', fontSize: '0.9rem' }}>
                                                {formatDate(tx.date, true)}
                                            </td>
                                            <td style={{ padding: '12px 5px', textAlign: 'right' }}>
                                                {editingTxId === tx.id ? (
                                                    <input

                                                        type="text"
                                                        value={editAmount}
                                                        onChange={(e) => setEditAmount(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleEditSave(tx);
                                                            if (e.key === 'Escape') setEditingTxId(null);
                                                        }}
                                                        autoFocus
                                                        style={{
                                                            background: '#333',
                                                            border: '1px solid #555',
                                                            color: '#fff',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            width: '80px',
                                                            textAlign: 'right'
                                                        }}
                                                    />
                                                ) : (
                                                    <span style={{
                                                        color: tx.amount >= 0 ? '#4caf50' : '#f44336',
                                                        fontWeight: '500'
                                                    }}>
                                                        {tx.amount > 0 ? '+' : ''}{formatMoney(tx.amount)}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 5px', textAlign: 'right' }}>
                                                {editingTxId === tx.id ? (
                                                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                                                        <button
                                                            onClick={() => handleEditSave(tx)}
                                                            className="btn-primary"
                                                            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                                        >
                                                            K
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingTxId(null)}
                                                            className="btn-secondary"
                                                            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                                        >
                                                            İ
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', opacity: 0.5 }} className="row-actions">
                                                        <button
                                                            onClick={() => {
                                                                setEditingTxId(tx.id);
                                                                setEditAmount(tx.amount.toString().replace('.', ','));
                                                            }}
                                                            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                                                        >
                                                            <FaPen size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm('Bu işlemi silmek istediğinize emin misiniz?')) onDeleteTransaction(account.id, tx.id);
                                                            }}
                                                            style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer' }}
                                                        >
                                                            <FaTrash size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
