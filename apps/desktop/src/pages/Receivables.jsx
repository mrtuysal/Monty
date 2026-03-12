import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FaHandshake, FaPlus, FaTrash, FaPen, FaCheck, FaUndo, FaEllipsisV } from 'react-icons/fa';
import { useData } from '../context/DataContext';
import Layout from '../components/Layout';

const fmt = (n) => (n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '—';

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
function RecordModal({ item, onSave, onClose }) {
    const { formatMoneyInput, parseMoneyInput } = useData();
    const isEdit = !!item?.id;

    const [form, setForm] = useState({
        type:        item?.type        || 'RECEIVABLE',
        person:      item?.person      || '',
        description: item?.description || '',
        amount:      item?.amount      ? formatMoneyInput(String(item.amount)) : '',
        date:        item?.date        || new Date().toISOString().split('T')[0],
        notes:       item?.notes       || '',
    });
    const [errors, setErrors] = useState({});

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    const save = () => {
        const e = {};
        if (!form.person.trim()) e.person = 'Kişi adı zorunlu';
        if (!form.amount)        e.amount = 'Tutar zorunlu';
        setErrors(e);
        if (Object.keys(e).length) return;
        onSave({
            ...(item?.id ? { id: item.id } : {}),
            type:        form.type,
            person:      form.person.trim(),
            description: form.description.trim(),
            amount:      parseMoneyInput(form.amount),
            date:        form.date || new Date().toISOString().split('T')[0],
            notes:       form.notes.trim(),
            status:      item?.status || 'PENDING',
        });
        onClose();
    };

    const inp = (k) => ({
        width: '100%',
        padding: '12px',
        borderRadius: 'var(--radius-md)',
        background: '#1a1a1a',
        border: `1px solid ${errors[k] ? '#ff453a' : 'var(--border)'}`,
        color: '#fff',
        fontSize: '14px',
        outline: 'none',
        boxSizing: 'border-box',
        boxShadow: errors[k] ? '0 0 0 2px rgba(255,69,58,0.25)' : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s'
    });

    const labelStyle = {
        display: 'block',
        color: 'var(--text-muted)',
        marginBottom: '8px',
        fontSize: '13px',
        fontWeight: '500'
    };

    return createPortal(
        <div
            onClick={(e) => e.target === e.currentTarget && onClose()}
            style={{
                position: 'fixed', inset: 0,
                backgroundColor: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(8px)',
                zIndex: 99999,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
        >
            <div className="glass-panel" style={{
                width: '520px',
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
                        {isEdit ? 'Kaydı Düzenle' : 'Yeni Kayıt'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', padding: '0' }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Type Toggle */}
                    <div>
                        <label style={labelStyle}>Kayıt Türü</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {[
                                { key: 'RECEIVABLE', label: '📥 Alacak', color: '#4caf50' },
                                { key: 'DEBT',       label: '📤 Borç',   color: '#f44336' }
                            ].map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => setForm(f => ({ ...f, type: t.key }))}
                                    style={{
                                        flex: 1, padding: '12px',
                                        borderRadius: 'var(--radius-md)',
                                        border: `1px solid ${form.type === t.key ? t.color : 'var(--border)'}`,
                                        cursor: 'pointer', fontWeight: '700', fontSize: '14px',
                                        background: form.type === t.key
                                            ? `${t.color}22`
                                            : 'transparent',
                                        color: form.type === t.key ? '#fff' : 'var(--text-muted)',
                                        transition: 'all 0.2s'
                                    }}
                                >{t.label}</button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={labelStyle}>
                                {form.type === 'RECEIVABLE' ? 'Borçlu Kişi / Kurum' : 'Alacaklı Kişi / Kurum'}
                            </label>
                            <input
                                value={form.person}
                                onChange={set('person')}
                                placeholder="Ad Soyad"
                                style={inp('person')}
                            />
                            {errors.person && <span style={{ color: '#ff453a', fontSize: '11px', marginTop: '5px', display: 'block' }}>⚠ {errors.person}</span>}
                        </div>
                        <div>
                            <label style={labelStyle}>Açıklama (isteğe bağlı)</label>
                            <input
                                value={form.description}
                                onChange={set('description')}
                                placeholder="Konu / Açıklama"
                                style={inp('description')}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={labelStyle}>Tutar (₺)</label>
                            <input
                                value={form.amount}
                                onChange={(e) => setForm(f => ({ ...f, amount: formatMoneyInput(e.target.value) }))}
                                placeholder="0,00"
                                style={inp('amount')}
                            />
                            {errors.amount && <span style={{ color: '#ff453a', fontSize: '11px', marginTop: '5px', display: 'block' }}>⚠ {errors.amount}</span>}
                        </div>
                        <div>
                            <label style={labelStyle}>Tarih</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={set('date')}
                                style={{ ...inp('date'), colorScheme: 'dark' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Notlar (isteğe bağlı)</label>
                        <textarea
                            value={form.notes}
                            onChange={set('notes')}
                            rows={2}
                            placeholder="İsteğe bağlı notlar..."
                            style={{ ...inp('notes'), resize: 'vertical', fontFamily: 'inherit' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '35px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                    <button className="btn btn-secondary" onClick={onClose} style={{ padding: '12px 25px' }}>İptal</button>
                    <button className="btn btn-primary" onClick={save} style={{ padding: '12px 30px' }}>
                        {isEdit ? '✓ Güncelle' : '✓ Kaydet'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Receivables() {
    const { receivables, addReceivable, updateReceivable, deleteReceivable } = useData();
    const [tabType, setTabType]     = useState('ALL');
    const [tabStatus, setTabStatus] = useState('PENDING');
    const [modal, setModal]         = useState(false);
    const [editing, setEditing]     = useState(null);
    const [menuOpenId, setMenuOpenId] = useState(null);

    const totalReceivable = useMemo(() =>
        receivables.filter(r => r.type === 'RECEIVABLE' && r.status !== 'DONE')
            .reduce((s, r) => s + (r.amount || 0), 0), [receivables]);

    const totalDebt = useMemo(() =>
        receivables.filter(r => r.type === 'DEBT' && r.status !== 'DONE')
            .reduce((s, r) => s + (r.amount || 0), 0), [receivables]);

    const net = totalReceivable - totalDebt;

    const list = useMemo(() =>
        receivables
            .filter(r => tabType === 'ALL' || r.type === tabType)
            .filter(r => tabStatus === 'ALL' || r.status === tabStatus)
            .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
        [receivables, tabType, tabStatus]);

    const handleSave = (data) => {
        if (data.id) updateReceivable(data);
        else addReceivable(data);
    };

    const openAdd  = ()     => { setEditing(null);  setModal(true); };
    const openEdit = (item) => { setEditing(item);  setModal(true); setMenuOpenId(null); };
    const close    = ()     => { setModal(false);   setEditing(null); };

    const toggleDone = (item) => {
        updateReceivable({ ...item, status: item.status === 'DONE' ? 'PENDING' : 'DONE' });
        setMenuOpenId(null);
    };

    const handleDelete = (id) => {
        if (window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) {
            deleteReceivable(id);
        }
        setMenuOpenId(null);
    };

    // Summary card data
    const summaryCards = [
        { label: '📥 Toplam Alacak', value: totalReceivable, color: '#4caf50', hint: 'ödenmemiş alacaklar' },
        { label: '📤 Toplam Borç',   value: totalDebt,       color: '#f44336', hint: 'ödenmemiş borçlar' },
        {
            label: net >= 0 ? '⚖ Net Alacak' : '⚖ Net Borç',
            value: Math.abs(net),
            color: net >= 0 ? '#4caf50' : '#f44336',
            hint: 'alacak − borç farkı'
        }
    ];

    return (
        <Layout>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 className="gradient-text" style={{ fontSize: '2.5rem', margin: 0 }}>Alacak / Borç</h1>
                <button className="btn btn-primary" onClick={openAdd}>
                    + Yeni Kayıt
                </button>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
                {summaryCards.map((c, i) => (
                    <div key={i} className="glass-panel" style={{
                        padding: '20px 25px',
                        borderRadius: 'var(--radius-lg)',
                        borderLeft: `4px solid ${c.color}`,
                        background: `linear-gradient(90deg, ${c.color}18 0%, ${c.color}05 100%)`
                    }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>{c.label}</div>
                        <div style={{ color: c.color, fontSize: '1.6rem', fontWeight: '800' }}>₺{fmt(c.value)}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>{c.hint}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="glass-panel" style={{
                borderRadius: 'var(--radius-lg)',
                padding: '6px',
                marginBottom: '15px',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {[
                        { key: 'ALL',        label: 'Tümü' },
                        { key: 'RECEIVABLE', label: '📥 Alacak' },
                        { key: 'DEBT',       label: '📤 Borç' },
                    ].map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTabType(t.key)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                background: tabType === t.key ? 'var(--primary)' : 'transparent',
                                color: tabType === t.key ? '#fff' : 'var(--text-muted)',
                                fontWeight: '600',
                                fontSize: '13px',
                                transition: 'all 0.2s'
                            }}
                        >{t.label}</button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {[
                        { key: 'PENDING', label: 'Bekleyenler' },
                        { key: 'DONE',    label: 'Ödenenler' },
                        { key: 'ALL',     label: 'Hepsi' },
                    ].map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTabStatus(t.key)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                background: tabStatus === t.key ? 'var(--primary)' : 'transparent',
                                color: tabStatus === t.key ? '#fff' : 'var(--text-muted)',
                                fontWeight: '600',
                                fontSize: '13px',
                                transition: 'all 0.2s'
                            }}
                        >{t.label}</button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', minHeight: '300px', paddingBottom: '60px' }}>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '12px 15px' }}>Tür</th>
                                <th style={{ padding: '12px 15px' }}>Kişi / Kurum</th>
                                <th style={{ padding: '12px 15px' }}>Açıklama</th>
                                <th style={{ padding: '12px 15px' }}>Tarih</th>
                                <th style={{ padding: '12px 15px', textAlign: 'right' }}>Tutar</th>
                                <th style={{ padding: '12px 15px', textAlign: 'center' }}>Durum</th>
                                <th style={{ padding: '12px 15px', textAlign: 'center' }}>İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                            <FaHandshake size={36} style={{ opacity: 0.2 }} />
                                            <div>Kayıt bulunamadı</div>
                                            <div style={{ fontSize: '12px', opacity: 0.6 }}>Yukarıdan yeni kayıt ekleyin</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : list.map(item => {
                                const done = item.status === 'DONE';
                                const isReceivable = item.type === 'RECEIVABLE';
                                const typeColor = isReceivable ? '#4caf50' : '#f44336';

                                return (
                                    <tr key={item.id} style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        opacity: done ? 0.5 : 1,
                                        transition: 'background 0.15s'
                                    }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        {/* Tür */}
                                        <td style={{ padding: '12px 15px' }}>
                                            <span style={{
                                                fontSize: '11px', fontWeight: '700',
                                                padding: '3px 9px', borderRadius: '5px',
                                                background: `${typeColor}20`,
                                                color: typeColor,
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {isReceivable ? '📥 Alacak' : '📤 Borç'}
                                            </span>
                                        </td>

                                        {/* Kişi */}
                                        <td style={{ padding: '12px 15px', fontWeight: '600', color: '#fff' }}>
                                            {item.person}
                                        </td>

                                        {/* Açıklama */}
                                        <td style={{ padding: '12px 15px', color: 'var(--text-muted)' }}>
                                            {item.description || '—'}
                                            {item.notes && (
                                                <span style={{ marginLeft: '8px', fontSize: '11px', opacity: 0.6 }}>
                                                    💬 {item.notes}
                                                </span>
                                            )}
                                        </td>

                                        {/* Tarih */}
                                        <td style={{ padding: '12px 15px', color: 'var(--text-muted)' }}>
                                            {fmtDate(item.date)}
                                        </td>

                                        {/* Tutar */}
                                        <td style={{
                                            padding: '12px 15px', textAlign: 'right',
                                            fontWeight: 'bold', whiteSpace: 'nowrap',
                                            color: done ? 'var(--text-muted)' : typeColor,
                                            textDecoration: done ? 'line-through' : 'none'
                                        }}>
                                            {isReceivable ? '+' : '-'}₺{fmt(item.amount)}
                                        </td>

                                        {/* Durum */}
                                        <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                                            {done ? (
                                                <span style={{
                                                    fontSize: '11px', fontWeight: '700',
                                                    padding: '3px 9px', borderRadius: '5px',
                                                    background: 'rgba(76,175,80,0.15)', color: '#4caf50'
                                                }}>✓ Kapandı</span>
                                            ) : (
                                                <div style={{
                                                    width: '10px', height: '10px', borderRadius: '50%',
                                                    backgroundColor: '#ffcc00',
                                                    boxShadow: '0 0 8px #ffcc00',
                                                    margin: '0 auto'
                                                }} title="Bekliyor" />
                                            )}
                                        </td>

                                        {/* İşlem */}
                                        <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMenuOpenId(menuOpenId === item.id ? null : item.id);
                                                }}
                                                style={{
                                                    background: 'none', border: 'none',
                                                    color: 'var(--text-muted)', cursor: 'pointer',
                                                    padding: '5px', fontSize: '14px'
                                                }}
                                            >
                                                <FaEllipsisV />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Dropdown Menu Portal */}
            {menuOpenId && (() => {
                const item = list.find(r => r.id === menuOpenId);
                if (!item) return null;
                const done = item.status === 'DONE';

                // Find button position
                return createPortal(
                    <div
                        style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            zIndex: 99990
                        }}
                        onClick={() => setMenuOpenId(null)}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                top: '50%', left: '50%',
                                transform: 'translate(-50%, -50%)'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                        </div>
                    </div>,
                    document.body
                );
            })()}

            {/* Inline action menu — simpler approach: fixed bottom overlay per row */}
            {menuOpenId && (() => {
                const item = list.find(r => r.id === menuOpenId);
                if (!item) return null;
                const done = item.status === 'DONE';

                const menuBtnStyle = {
                    padding: '12px 15px', background: 'transparent',
                    border: 'none', textAlign: 'left', cursor: 'pointer',
                    fontSize: '13px', display: 'flex', alignItems: 'center',
                    gap: '8px', width: '100%', transition: 'background 0.15s'
                };

                return createPortal(
                    <>
                        {/* Backdrop */}
                        <div
                            style={{ position: 'fixed', inset: 0, zIndex: 99997 }}
                            onClick={() => setMenuOpenId(null)}
                        />
                        {/* Menu — centered fixed for simplicity */}
                        <div style={{
                            position: 'fixed',
                            bottom: '40px',
                            right: '40px',
                            background: '#1a1a1a',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.7)',
                            zIndex: 99998,
                            minWidth: '190px',
                            overflow: 'hidden'
                        }}>
                            <div style={{ padding: '10px 15px', borderBottom: '1px solid #333', fontSize: '12px', color: 'var(--text-muted)' }}>
                                {item.person}
                            </div>
                            <button
                                onClick={() => openEdit(item)}
                                style={{ ...menuBtnStyle, color: '#fff', borderBottom: '1px solid #2a2a2a' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#2a2a2a'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <FaPen size={11} /> Düzenle
                            </button>
                            <button
                                onClick={() => toggleDone(item)}
                                style={{
                                    ...menuBtnStyle,
                                    color: done ? '#ffcc00' : '#4caf50',
                                    borderBottom: '1px solid #2a2a2a'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#2a2a2a'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                {done ? <><FaUndo size={11} /> Geri Al</> : <><FaCheck size={11} /> Kapandı İşaretle</>}
                            </button>
                            <button
                                onClick={() => handleDelete(item.id)}
                                style={{ ...menuBtnStyle, color: '#ff453a' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#2a2a2a'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <FaTrash size={11} /> Sil
                            </button>
                        </div>
                    </>,
                    document.body
                );
            })()}

            {modal && (
                <RecordModal item={editing} onSave={handleSave} onClose={close} />
            )}
        </Layout>
    );
}
