import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Layout from '../components/Layout';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { MdDragIndicator } from 'react-icons/md';
import { FaEllipsisV, FaEdit, FaTrash, FaPlus, FaList } from 'react-icons/fa';
import AddAccountModal from '../components/AddAccountModal';
import AddInstitutionModal from '../components/AddInstitutionModal';
import TransactionPopups from '../components/TransactionPopups';
import { ACCOUNT_TYPE_LABELS } from '../data/initialData';
import { useData } from '../context/DataContext';



export default function Accounts() {
    const { accounts, setAccounts, addAccount, updateAccount, deleteAccount } = useData();

    // Modal States
    const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [targetInstitution, setTargetInstitution] = useState(null);

    const [isInstitutionModalOpen, setIsInstitutionModalOpen] = useState(false);
    const [editingInstitutionOldName, setEditingInstitutionOldName] = useState(null);

    // Transaction Modal States
    const [transactionModalOpen, setTransactionModalOpen] = useState(false);
    const [transactionAccount, setTransactionAccount] = useState(null);
    const [transactionMode, setTransactionMode] = useState('add');

    const [menuOpenId, setMenuOpenId] = useState(null); // 'group-Name' or 'account-ID'

    // Click outside listener to close menus
    useEffect(() => {
        const handleClickOutside = () => setMenuOpenId(null);
        if (menuOpenId) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => document.removeEventListener('click', handleClickOutside);
    }, [menuOpenId]);

    const handleSaveAccount = (account) => {
        if (editingAccount) {
            updateAccount(account);
        } else {
            addAccount(account);
        }
        setIsAddAccountModalOpen(false);
        setEditingAccount(null);
        setTargetInstitution(null);
    };

    const handleSaveInstitution = (newInstitutionName) => {
        if (editingInstitutionOldName) {
            // Update existing institution name for all its accounts (sync each to Supabase)
            accounts.filter(a => a.institution === editingInstitutionOldName).forEach(a => {
                updateAccount({ ...a, institution: newInstitutionName });
            });
        } else {
            // Add new institution: Immediately open AddAccountModal to add the first sub-account
            setTargetInstitution(newInstitutionName);
            setEditingAccount(null);
            setIsAddAccountModalOpen(true);
        }
        setIsInstitutionModalOpen(false);
        setEditingInstitutionOldName(null);
    };

    const onDragEnd = (result) => {
        const { source, destination, type } = result;

        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        // Handle Group Reordering
        if (type === 'group') {
            const institutions = [...new Set(accounts.map(a => a.institution))];
            const [movedInstitution] = institutions.splice(source.index, 1);
            institutions.splice(destination.index, 0, movedInstitution);

            // Reconstruct accounts based on new institution order
            const newAccounts = [];
            institutions.forEach(inst => {
                newAccounts.push(...accounts.filter(a => a.institution === inst));
            });

            setAccounts(newAccounts);
            return;
        }

        // Handle Account Reordering (within same group)
        if (source.droppableId === destination.droppableId) {
            const groupInstitution = source.droppableId;
            const groupItems = accounts.filter(acc => acc.institution === groupInstitution);
            const otherItems = accounts.filter(acc => acc.institution !== groupInstitution);

            const [removed] = groupItems.splice(source.index, 1);
            groupItems.splice(destination.index, 0, removed);

            // Reconstruct: Maintain group order, but update the modified group
            const institutions = [...new Set(accounts.map(a => a.institution))];
            const newAccounts = [];

            institutions.forEach(inst => {
                if (inst === groupInstitution) {
                    newAccounts.push(...groupItems);
                } else {
                    newAccounts.push(...accounts.filter(a => a.institution === inst));
                }
            });

            setAccounts(newAccounts);
        }
    };

    // Grouping Logic
    const groupedAccounts = accounts.reduce((acc, account) => {
        const key = account.institution;
        if (!acc[key]) {
            acc[key] = {
                institution: key,
                type: account.type, // Assuming consistent type per institution for now
                accounts: [],
                totalBalance: {},
                totalAvailable: {}
            };
        }

        acc[key].accounts.push(account);

        // Sum totals per currency
        const curr = account.currency;
        acc[key].totalBalance[curr] = (acc[key].totalBalance[curr] || 0) + account.balance;
        acc[key].totalAvailable[curr] = (acc[key].totalAvailable[curr] || 0) + account.available;

        return acc;
    }, {});

    // Derive groups based on the order of appearance in 'accounts' to respect state reordering
    // Note: Object.values() does not guarantee order, but insertion order is usually preserved for string keys in modern JS.
    // To be safe, let's map over the unique institutions from the state.
    const institutionsOrder = [...new Set(accounts.map(a => a.institution))];
    const groups = institutionsOrder.map(inst => groupedAccounts[inst]);

    const formatCurrency = (amount, currency) => {
        const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₺';
        return `${symbol} ${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handleDeleteAccount = (id) => {
        if (window.confirm('Bu hesabı silmek istediğinize emin misiniz?')) {
            deleteAccount(id);
        }
        setMenuOpenId(null);
    };

    const handleDeleteGroup = (institution) => {
        if (window.confirm(`${institution} grubunu ve içindeki tüm hesapları silmek istediğinize emin misiniz?`)) {
            accounts.filter(a => a.institution === institution).forEach(a => deleteAccount(a.id));
        }
        setMenuOpenId(null);
    };

    const handleAddTransaction = (accountId, amount) => {
        const acc = accounts.find(a => a.id === accountId);
        if (!acc) return;

        const newTx = {
            id: Date.now().toString(),
            amount: amount,
            date: new Date().toISOString()
        };

        const newBalance = acc.balance + amount;
        const newAvailable = newBalance + (acc.kmhLimit || 0);

        updateAccount({
            ...acc,
            balance: newBalance,
            available: newAvailable,
            transactions: [...(acc.transactions || []), newTx]
        });
    };

    const handleEditTransaction = (accountId, txId, newAmount) => {
        const acc = accounts.find(a => a.id === accountId);
        if (!acc) return;

        const oldTx = (acc.transactions || []).find(t => t.id === txId);
        if (!oldTx) return;

        const diff = newAmount - oldTx.amount;
        const newBalance = acc.balance + diff;
        const newAvailable = newBalance + (acc.kmhLimit || 0);

        updateAccount({
            ...acc,
            balance: newBalance,
            available: newAvailable,
            transactions: acc.transactions.map(t =>
                t.id === txId ? { ...t, amount: newAmount } : t
            )
        });
    };

    const handleDeleteTransaction = (accountId, txId) => {
        const acc = accounts.find(a => a.id === accountId);
        if (!acc) return;

        const oldTx = (acc.transactions || []).find(t => t.id === txId);
        if (!oldTx) return;

        const newBalance = acc.balance - oldTx.amount;
        const newAvailable = newBalance + (acc.kmhLimit || 0);

        updateAccount({
            ...acc,
            balance: newBalance,
            available: newAvailable,
            transactions: acc.transactions.filter(t => t.id !== txId)
        });
    };



    const MenuButton = ({ id, onEdit, onDelete, isGroup, onAddSubAccount }) => (
        <div style={{ position: 'relative', marginLeft: '10px' }}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(menuOpenId === id ? null : id);
                }}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '5px',
                    display: 'flex',
                    alignItems: 'center'
                }}
            >
                <FaEllipsisV />
            </button>

            {menuOpenId === id && (
                <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    background: '#252525',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    zIndex: 1000,
                    width: '160px',
                    boxShadow: '0 5px 20px rgba(0,0,0,0.5)',
                    overflow: 'hidden'
                }}>
                    {/* Add Sub Account Option (Only for Groups) */}
                    {isGroup && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddSubAccount(); }}
                            style={{
                                width: '100%',
                                padding: '10px 15px',
                                textAlign: 'left',
                                background: 'transparent',
                                border: 'none',
                                color: '#4caf50',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '13px',
                                borderBottom: '1px solid rgba(255,255,255,0.05)'
                            }}
                            onMouseEnter={e => e.target.style.background = '#333'}
                            onMouseLeave={e => e.target.style.background = 'transparent'}
                        >
                            <FaPlus size={12} /> Alt Hesap Ekle
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        style={{
                            width: '100%',
                            padding: '10px 15px',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '13px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)'
                        }}
                        onMouseEnter={e => e.target.style.background = '#333'}
                        onMouseLeave={e => e.target.style.background = 'transparent'}
                    >
                        <FaEdit size={12} /> {isGroup ? 'Adı Düzenle' : 'Düzenle'}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        style={{
                            width: '100%',
                            padding: '10px 15px',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            color: '#ff453a',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '13px'
                        }}
                        onMouseEnter={e => e.target.style.background = '#333'}
                        onMouseLeave={e => e.target.style.background = 'transparent'}
                    >
                        <FaTrash size={12} /> {isGroup ? 'Grubu Sil' : 'Sil'}
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <Layout>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 className="gradient-text" style={{ fontSize: '2.5rem', margin: 0 }}>Hesaplar</h1>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        setEditingInstitutionOldName(null);
                        setIsInstitutionModalOpen(true);
                    }}
                >
                    + Ana Hesap Ekle
                </button>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="all-groups" type="group">
                    {(provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
                        >
                            {groups.map((group, index) => (
                                <Draggable key={group.institution} draggableId={group.institution} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className="glass-panel"
                                            style={{
                                                ...provided.draggableProps.style,
                                                borderRadius: 'var(--radius-lg)',
                                                // overflow: 'hidden', // REMOVED: Caused disappearing items during drag
                                                marginBottom: '0',
                                                // Check if transition exists before appending or defaulting
                                                transition: snapshot.isDragging
                                                    ? (provided.draggableProps.style.transition || 'none')
                                                    : (provided.draggableProps.style.transition ? `${provided.draggableProps.style.transition}, transform 0.2s, box-shadow 0.2s` : 'transform 0.2s, box-shadow 0.2s'),
                                                boxShadow: snapshot.isDragging ? '0 10px 30px rgba(0,0,0,0.5)' : 'none',
                                                zIndex: snapshot.isDragging ? 100 : 'auto'
                                            }}
                                        >
                                            {/* Group Header */}
                                            <div style={{
                                                padding: '20px 25px',
                                                background: 'linear-gradient(90deg, rgba(108, 99, 255, 0.2) 0%, rgba(108, 99, 255, 0.05) 100%)',
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                borderTopLeftRadius: 'var(--radius-lg)', // Added manually
                                                borderTopRightRadius: 'var(--radius-lg)' // Added manually
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    {/* Group Drag Handle */}
                                                    <div
                                                        {...provided.dragHandleProps}
                                                        style={{
                                                            color: 'var(--text-muted)',
                                                            cursor: 'grab',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            marginRight: '5px'
                                                        }}
                                                    >
                                                        <MdDragIndicator size={24} />
                                                    </div>

                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '10px',
                                                        background: 'rgba(255,255,255,0.1)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '20px'
                                                    }}>
                                                        {group.type === 'CASH' ? '💵' : '🏦'}
                                                    </div>
                                                    <div>
                                                        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{group.institution}</h2>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                                            {group.accounts.length} Hesap
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Group Totals & Menu */}
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                                                    <div style={{ textAlign: 'right' }}>
                                                        {Object.keys(group.totalBalance).map(curr => (
                                                            <div key={curr} style={{ marginBottom: '4px' }}>
                                                                <div style={{
                                                                    color: group.totalBalance[curr] >= 0 ? '#4caf50' : '#f44336',
                                                                    fontSize: '1.3rem',
                                                                    fontWeight: 'bold'
                                                                }}>
                                                                    {formatCurrency(group.totalBalance[curr], curr)}
                                                                </div>
                                                                {group.totalAvailable[curr] !== group.totalBalance[curr] && (
                                                                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                                                        Kullanılabilir: {formatCurrency(group.totalAvailable[curr], curr)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Group Actions Menu */}
                                                    <div style={{ paddingTop: '5px' }}>
                                                        <MenuButton
                                                            id={`group-${group.institution}`}
                                                            isGroup={true}
                                                            onEdit={() => {
                                                                setEditingInstitutionOldName(group.institution);
                                                                setIsInstitutionModalOpen(true);
                                                                setMenuOpenId(null);
                                                            }}
                                                            onDelete={() => handleDeleteGroup(group.institution)}
                                                            onAddSubAccount={() => {
                                                                setTargetInstitution(group.institution);
                                                                setEditingAccount(null);
                                                                setIsAddAccountModalOpen(true);
                                                                setMenuOpenId(null);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Drop Zone for Accounts */}
                                            <Droppable droppableId={group.institution} type="account">
                                                {(provided) => (
                                                    <div
                                                        {...provided.droppableProps}
                                                        ref={provided.innerRef}
                                                    >
                                                        {group.accounts.map((acc, index) => (
                                                            <Draggable key={acc.id} draggableId={acc.id} index={index}>
                                                                {(provided, snapshot) => {
                                                                    const child = (
                                                                        <div
                                                                            ref={provided.innerRef}
                                                                            {...provided.draggableProps}
                                                                            style={{
                                                                                // 1. Spread standard dnd styles first
                                                                                ...provided.draggableProps.style,

                                                                                // 2. Apply Custom Layout Styles
                                                                                padding: '10px 20px', // Reduced padding for compacter look
                                                                                boxSizing: 'border-box', // Prevent padding from causing overflow
                                                                                display: 'flex',
                                                                                justifyContent: 'space-between',
                                                                                alignItems: 'center',
                                                                                borderBottom: index !== group.accounts.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                                                                width: snapshot.isDragging ? provided.draggableProps.style.width : 'auto', // Use auto width when not dragging

                                                                                // 3. Visual Overrides for Dragging State
                                                                                background: snapshot.isDragging ? 'rgb(35, 35, 35)' : 'transparent',
                                                                                boxShadow: snapshot.isDragging ? '0 10px 25px rgba(0,0,0,0.6)' : 'none',
                                                                                borderRadius: snapshot.isDragging ? 'var(--radius-md)' : '0',
                                                                                zIndex: snapshot.isDragging ? 9999 : 'auto',
                                                                                opacity: 1,

                                                                                // Correctly handle transition
                                                                                transition: snapshot.isDragging
                                                                                    ? (provided.draggableProps.style.transition || 'none')
                                                                                    : (provided.draggableProps.style.transition ? `${provided.draggableProps.style.transition}, background 0.2s` : 'background 0.2s'),

                                                                                // Fix geometry when portalled
                                                                                ...(snapshot.isDragging ? {
                                                                                    left: provided.draggableProps.style.left,
                                                                                    top: provided.draggableProps.style.top,

                                                                                } : {})
                                                                            }}
                                                                        >
                                                                            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                                                                <div
                                                                                    {...provided.dragHandleProps}
                                                                                    style={{
                                                                                        color: 'var(--text-muted)',
                                                                                        cursor: 'grab',
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        padding: '5px',
                                                                                        marginRight: '15px'
                                                                                    }}
                                                                                >
                                                                                    <MdDragIndicator size={20} />
                                                                                </div>

                                                                                {/* Transaction Buttons */}
                                                                                <div style={{ display: 'flex', gap: '8px', marginRight: '15px' }}>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setTransactionAccount(acc);
                                                                                            setTransactionMode('add');
                                                                                            setTransactionModalOpen(true);
                                                                                        }}
                                                                                        style={{
                                                                                            width: '28px',
                                                                                            height: '28px',
                                                                                            borderRadius: '8px',
                                                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                                                            background: 'rgba(76, 175, 80, 0.1)',
                                                                                            color: '#4caf50',
                                                                                            cursor: 'pointer',
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            justifyContent: 'center',
                                                                                            transition: 'all 0.2s',
                                                                                        }}
                                                                                        title="İşlem Ekle"
                                                                                        onMouseEnter={e => e.target.style.background = 'rgba(76, 175, 80, 0.2)'}
                                                                                        onMouseLeave={e => e.target.style.background = 'rgba(76, 175, 80, 0.1)'}
                                                                                    >
                                                                                        <FaPlus size={10} />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setTransactionAccount(acc);
                                                                                            setTransactionMode('history');
                                                                                            setTransactionModalOpen(true);
                                                                                        }}
                                                                                        style={{
                                                                                            width: '28px',
                                                                                            height: '28px',
                                                                                            borderRadius: '8px',
                                                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                                                            background: 'rgba(255, 255, 255, 0.05)',
                                                                                            color: 'var(--text-muted)',
                                                                                            cursor: 'pointer',
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            justifyContent: 'center',
                                                                                            transition: 'all 0.2s',
                                                                                        }}
                                                                                        title="İşlem Geçmişi"
                                                                                        onMouseEnter={e => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                                                                                        onMouseLeave={e => e.target.style.background = 'rgba(255, 255, 255, 0.05)'}
                                                                                    >
                                                                                        <FaList size={10} />
                                                                                    </button>
                                                                                </div>

                                                                                <div>
                                                                                    <div style={{ color: '#eee', fontSize: '14px', fontWeight: '500' }}>{acc.name}</div>
                                                                                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                                                                        {ACCOUNT_TYPE_LABELS[acc.accountType] || (acc.type === 'CASH' ? 'Nakit Varlık' : 'Vadesiz Hesap')}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                                                <div style={{ textAlign: 'right' }}>
                                                                                    <div style={{
                                                                                        color: acc.balance >= 0 ? '#4caf50' : '#f44336',
                                                                                        fontSize: '14px',
                                                                                        fontWeight: '500'
                                                                                    }}>
                                                                                        {formatCurrency(acc.balance, acc.currency)}
                                                                                    </div>
                                                                                    {acc.available !== acc.balance && (
                                                                                        <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                                                                            Kullanılabilir: {formatCurrency(acc.available, acc.currency)}
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                {/* Account Actions Menu */}
                                                                                <MenuButton
                                                                                    id={`account-${acc.id}`}
                                                                                    isGroup={false}
                                                                                    onEdit={() => {
                                                                                        setEditingAccount(acc);
                                                                                        setIsAddAccountModalOpen(true);
                                                                                        setMenuOpenId(null);
                                                                                    }}
                                                                                    onDelete={() => handleDeleteAccount(acc.id)}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    );

                                                                    // Portal the dragged item to body to escape parent transforms
                                                                    if (snapshot.isDragging) {
                                                                        return createPortal(child, document.body);
                                                                    }
                                                                    return child;
                                                                }}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            <AddAccountModal
                isOpen={isAddAccountModalOpen}
                initialData={editingAccount}
                fixedInstitution={targetInstitution} // Pass target institution if adding/editing sub account
                onClose={() => {
                    setIsAddAccountModalOpen(false);
                    setEditingAccount(null);
                    setTargetInstitution(null);
                }}
                onSave={handleSaveAccount}
                existingInstitutions={[...new Set(accounts.map(a => a.institution))]}
            />

            <AddInstitutionModal
                isOpen={isInstitutionModalOpen}
                initialData={editingInstitutionOldName}
                onClose={() => {
                    setIsInstitutionModalOpen(false);
                    setEditingInstitutionOldName(null);
                }}
                onSave={handleSaveInstitution}
                existingInstitutions={[...new Set(accounts.map(a => a.institution))]}
            />

            {transactionAccount && (
                <TransactionPopups
                    isOpen={transactionModalOpen}
                    onClose={() => setTransactionModalOpen(false)}
                    account={accounts.find(a => a.id === transactionAccount.id) || transactionAccount}
                    mode={transactionMode}
                    onAddTransaction={handleAddTransaction}
                    onEditTransaction={handleEditTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                />
            )}
        </Layout>
    );
}
