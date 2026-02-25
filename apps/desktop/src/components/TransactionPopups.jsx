import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaPlus, FaMinus, FaTrash, FaPen, FaList, FaHistory } from 'react-icons/fa';
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
    const { formatMoneyInput, parseMoneyInput } = useData();
    const [amount, setAmount] = useState('');
    const [isNegative, setIsNegative] = useState(false);
    const inputRef = useRef(null);

    // Editing State for History Mode
    const [editingTxId, setEditingTxId] = useState(null);
    const [editAmount, setEditAmount] = useState('');

    useEffect(() => {
        if (isOpen && mode === 'add' && inputRef.current) {
            inputRef.current.focus();
            setAmount('');
            setIsNegative(false);
        }
        if (!isOpen) {
            setEditingTxId(null);
        }
    }, [isOpen, mode]);

    const handleAmountChange = (e) => {
        let val = e.target.value;
        // Check for minus sign
        if (val.includes('-')) {
            setIsNegative(true);
            val = val.replace('-', '');
        }

        // Use global formatter which handles thousands dots and single promo comma
        const formatted = formatMoneyInput(val);
        setAmount(formatted);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!amount) return;

        let numAmount = parseMoneyInput(amount);
        if (isNaN(numAmount) || numAmount === 0) return;

        if (isNegative) numAmount = -numAmount;

        onAddTransaction(account.id, numAmount);
        setAmount('');
        setIsNegative(false);
        onClose();
    };

    const handleEditSave = (tx) => {
        let numAmount = parseFloat(editAmount.replace(',', '.'));
        if (isNaN(numAmount)) return;

        // Preserve sign of editAmount or allow user to type minus? 
        // Let's assume user types absolute value in edit input and we keep sign? 
        // Or user re-enters everything. Let's allow user to type minus in edit input too.
        if (editAmount.includes('-')) numAmount = -Math.abs(numAmount); // Force negative if typed

        onEditTransaction(account.id, tx.id, numAmount);
        setEditingTxId(null);
    };

    if (!isOpen) return null;

    // Filter transactions for this account? No, parent passes account object with transactions
    const transactions = (account.transactions || []).sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastTransaction = transactions[0];

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
                        <form onSubmit={handleSubmit}>
                            <div style={{ position: 'relative', marginBottom: '8px' }}>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={isNegative ? '-' + amount : amount}
                                    onChange={handleAmountChange}
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
                            {/* Live Balance Preview */}
                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '15px',
                                borderRadius: '12px',
                                marginBottom: '20px',
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
                                        (Eski: {formatMoney(account.balance)} ₺)
                                    </div>
                                )}
                            </div>

                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '16px' }}>
                                Enter'a basarak kaydedin. Eksi (-) yazarak gider girebilirsiniz.
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    fontSize: '1rem',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    marginBottom: '20px'
                                }}
                            >
                                Kaydet
                            </button>
                        </form>

                        {/* Last Transaction Info */}
                        {lastTransaction && (
                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px',
                                padding: '12px',
                                marginBottom: '20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Son İşlem</span>
                                <span style={{ color: '#fff', fontWeight: '500' }}>
                                    {formatDate(lastTransaction.date, true)}
                                </span>
                            </div>
                        )}

                        {/* Recent Transactions Sliding List */}
                        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Son 5 İşlem
                            </h3>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                maxHeight: '200px',
                                overflowY: 'auto'
                            }}>
                                {transactions.slice(0, 5).map((tx, index) => (
                                    <div key={tx.id} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '10px 0',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        animation: `slideDown 0.3s ease-out forwards`,
                                        animationDelay: `${index * 0.05}s`,
                                        opacity: 0,
                                        transform: 'translateY(-10px)'
                                    }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <div style={{
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                background: tx.amount >= 0 ? '#4caf50' : '#f44336'
                                            }} />
                                            <span style={{ color: '#aaa', fontSize: '0.85rem' }}>{formatDate(tx.date, true)}</span>
                                        </div>
                                        <div style={{
                                            color: tx.amount >= 0 ? '#4caf50' : '#f44336',
                                            fontWeight: '600'
                                        }}>
                                            {tx.amount > 0 ? '+' : ''}{formatMoney(tx.amount)} ₺
                                        </div>
                                    </div>
                                ))}
                                {transactions.length === 0 && (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                                        Henüz işlem yok
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Inline Style for Animation */}
                        <style>{`
                            @keyframes slideDown {
                                from { opacity: 0; transform: translateY(-10px); }
                                to { opacity: 1; transform: translateY(0); }
                            }
                        `}</style>
                    </>
                )}

                {/* HISTORY MODE CONTENT */}
                {mode === 'history' && (
                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                        {transactions.length === 0 ? (
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
                                    {transactions.map(tx => (
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
