import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { useData } from '../context/DataContext';
import { listBackups, downloadBackup, deleteBackup } from '../lib/backupService';
import {
    FaUser, FaGoogle, FaApple, FaSave, FaCheckCircle,
    FaCloudUploadAlt, FaCloudDownloadAlt, FaTrash, FaCloud,
    FaHistory, FaDownload, FaSync, FaDesktop, FaPowerOff
} from 'react-icons/fa';

export default function Settings() {
    const {
        userProfile, updateUserProfile, accounts, payments, setAccounts, setPayments,
        performBackup, downloadBackupLocal, restoreFromBackup, session
    } = useData();

    // Local state for form
    const [formData, setFormData] = useState({ fullName: '', phone: '', dob: '' });
    const [isSaved, setIsSaved] = useState(false);

    // Backup states
    const [cloudBackups, setCloudBackups] = useState([]);
    const [isLoadingBackups, setIsLoadingBackups] = useState(false);
    const [backupMessage, setBackupMessage] = useState(null); // { type: 'success'|'error', text }
    const [isRestoring, setIsRestoring] = useState(false);

    // Auto-launch state
    const [autoLaunch, setAutoLaunch] = useState(false);
    const [autoLaunchLoading, setAutoLaunchLoading] = useState(true);

    // Load initial profile data
    useEffect(() => {
        if (userProfile) {
            setFormData({
                fullName: userProfile.fullName || '',
                phone: userProfile.phone || '',
                dob: userProfile.dob || ''
            });
        }
    }, [userProfile]);

    // Load backup list when section is visible
    useEffect(() => {
        if (session?.user) {
            loadBackupList();
        }
    }, [session]);

    // Load auto-launch status from Electron
    useEffect(() => {
        const loadAutoLaunch = async () => {
            if (window.electronAPI?.getAutoLaunch) {
                try {
                    const enabled = await window.electronAPI.getAutoLaunch();
                    setAutoLaunch(enabled);
                } catch (err) {
                    console.error('Failed to get auto-launch status:', err);
                }
            }
            setAutoLaunchLoading(false);
        };
        loadAutoLaunch();
    }, []);

    const handleAutoLaunchToggle = async () => {
        const newValue = !autoLaunch;
        setAutoLaunch(newValue);

        if (window.electronAPI?.setAutoLaunch) {
            const result = await window.electronAPI.setAutoLaunch(newValue);
            if (!result.success) {
                setAutoLaunch(!newValue); // Revert on failure
                console.error('Failed to set auto-launch:', result.error);
            }
        }
    };

    const loadBackupList = async () => {
        if (!session?.user) return;
        setIsLoadingBackups(true);
        const backups = await listBackups(session.user.id);
        setCloudBackups(backups);
        setIsLoadingBackups(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setIsSaved(false);
    };

    const handleSaveProfile = () => {
        updateUserProfile(formData);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

    const handleConnectAccount = (provider) => {
        const currentStatus = userProfile.linkedAccounts?.[provider] || false;
        updateUserProfile({
            linkedAccounts: {
                ...userProfile.linkedAccounts,
                [provider]: !currentStatus
            }
        });
    };

    const handleBackupFrequencyChange = (e) => {
        const freq = e.target.value;
        const oldFreq = userProfile.backupConfig?.frequency;

        updateUserProfile({
            backupConfig: {
                ...userProfile.backupConfig,
                frequency: freq
            }
        });

        if (freq !== 'OFF' && freq !== oldFreq) {
            handleCloudBackup();
        }
    };

    // Cloud backup
    const handleCloudBackup = async () => {
        setBackupMessage(null);
        const result = await performBackup(true);
        if (result?.success) {
            setBackupMessage({ type: 'success', text: 'Bulut yedekleme başarılı!' });
            loadBackupList(); // Refresh list
        } else {
            setBackupMessage({ type: 'error', text: `Yedekleme hatası: ${result?.error || 'Bilinmeyen hata'}` });
        }
        setTimeout(() => setBackupMessage(null), 5000);
    };

    // Restore from cloud backup
    const handleRestoreFromCloud = async (backup) => {
        if (!window.confirm(`"${backup.displayDate}" tarihli yedeği geri yüklemek istediğinize emin misiniz?\n\nBu işlem mevcut tüm verilerinizi değiştirecektir.`)) {
            return;
        }

        setIsRestoring(true);
        setBackupMessage(null);

        const result = await downloadBackup(backup.fullPath);
        if (result.success) {
            const restoreResult = restoreFromBackup(result.data);
            if (restoreResult.success) {
                setBackupMessage({ type: 'success', text: 'Yedek başarıyla geri yüklendi!' });
            } else {
                setBackupMessage({ type: 'error', text: restoreResult.error });
            }
        } else {
            setBackupMessage({ type: 'error', text: `İndirme hatası: ${result.error}` });
        }

        setIsRestoring(false);
        setTimeout(() => setBackupMessage(null), 5000);
    };

    // Delete cloud backup
    const handleDeleteCloudBackup = async (backup) => {
        if (!window.confirm(`"${backup.displayDate}" tarihli yedeği silmek istediğinize emin misiniz?`)) {
            return;
        }

        const result = await deleteBackup(backup.fullPath);
        if (result.success) {
            setCloudBackups(prev => prev.filter(b => b.fullPath !== backup.fullPath));
            setBackupMessage({ type: 'success', text: 'Yedek silindi.' });
        } else {
            setBackupMessage({ type: 'error', text: 'Silme hatası.' });
        }
        setTimeout(() => setBackupMessage(null), 3000);
    };

    // Local file import
    const handleImportBackup = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.version && data.accounts && data.payments) {
                    if (window.confirm('Bu yedeği yüklemek mevcut tüm verilerinizi değiştirecektir. Emin misiniz?')) {
                        restoreFromBackup(data);
                        setBackupMessage({ type: 'success', text: 'Yedek başarıyla yüklendi!' });
                        setTimeout(() => setBackupMessage(null), 3000);
                    }
                } else {
                    alert('Geçersiz yedek dosyası formatı.');
                }
            } catch (err) {
                alert('Dosya okunamadı: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    const inputStyle = {
        width: '100%', padding: '12px', borderRadius: 'var(--radius-md)',
        background: '#1a1a1a', border: '1px solid var(--border)',
        color: '#fff', fontSize: '14px', outline: 'none', marginTop: '5px'
    };

    const labelStyle = {
        display: 'block', color: 'var(--text-muted)', fontSize: '13px',
        marginTop: '15px', fontWeight: '500'
    };

    const sectionStyle = {
        padding: '30px', borderRadius: 'var(--radius-lg)',
        background: 'rgba(30, 30, 30, 0.4)',
        border: '1px solid rgba(255,255,255,0.05)', marginBottom: '30px'
    };

    return (
        <Layout>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 className="gradient-text" style={{ fontSize: '2.5rem', margin: 0 }}>Ayarlar</h1>
            </div>

            <div style={{ maxWidth: '800px' }}>

                {/* 1. Profil Bilgileri */}
                <div className="glass-panel" style={sectionStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
                        <FaUser size={20} color="#6c63ff" />
                        <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Profil Bilgileri</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ width: '100%' }}>
                            <label style={labelStyle}>İsim Soyisim</label>
                            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Adınız ve Soyadınız" style={inputStyle} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={labelStyle}>Telefon Numarası (Opsiyonel)</label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="05XX XXX XX XX" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Doğum Tarihi (Opsiyonel)</label>
                                <input type="date" name="dob" value={formData.dob} onChange={handleChange} style={{ ...inputStyle, colorScheme: 'dark' }} />
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px' }}>
                        {isSaved && <span style={{ color: '#4caf50', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem' }}><FaCheckCircle /> Kaydedildi</span>}
                        <button className="btn btn-primary" onClick={handleSaveProfile} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 25px' }}>
                            <FaSave /> Kaydet
                        </button>
                    </div>
                </div>

                {/* 2. Uygulama Tercihleri */}
                <div className="glass-panel" style={sectionStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
                        <FaDesktop size={20} color="#ff9800" />
                        <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Uygulama Tercihleri</h2>
                    </div>

                    {/* Auto-launch toggle */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '12px',
                                background: 'rgba(255, 152, 0, 0.15)', color: '#ff9800',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <FaPowerOff size={18} />
                            </div>
                            <div>
                                <div style={{ color: '#fff', fontWeight: '500' }}>Bilgisayar Açıldığında Başlat</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                    Monty, bilgisayarınız açıldığında otomatik olarak arka planda başlatılır.
                                </div>
                            </div>
                        </div>

                        {/* Toggle Switch */}
                        <button
                            onClick={handleAutoLaunchToggle}
                            disabled={autoLaunchLoading}
                            style={{
                                width: '52px', height: '28px', borderRadius: '14px', border: 'none',
                                background: autoLaunch ? '#4caf50' : 'rgba(255,255,255,0.15)',
                                position: 'relative', cursor: 'pointer',
                                transition: 'background 0.3s ease', flexShrink: 0
                            }}
                        >
                            <div style={{
                                width: '22px', height: '22px', borderRadius: '50%',
                                background: '#fff', position: 'absolute', top: '3px',
                                left: autoLaunch ? '27px' : '3px',
                                transition: 'left 0.3s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                            }} />
                        </button>
                    </div>
                </div>

                {/* 3. Bildirimler */}
                <div className="glass-panel" style={sectionStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
                        <span style={{ fontSize: '20px' }}>🔔</span>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Bildirimler</h2>
                    </div>

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                        Her bildirim türünü ayrı ayrı açıp kapatabilirsiniz.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                            {
                                key: 'statementReminder',
                                icon: '📋',
                                title: 'Hesap Kesim Hatırlatması',
                                desc: 'Hesap kesim tarihinden sonra yeni tutarları girmeniz için günde 3 kez (09:00, 13:00, 18:00).',
                                color: '#ff9800'
                            },
                            {
                                key: 'dueSoon',
                                icon: '⏰',
                                title: 'Son Ödeme Yaklaşıyor',
                                desc: 'Son ödeme tarihine 3 gün ve 1 gün kala sabah 09:00\'da bildirim.',
                                color: '#ffc107'
                            },
                            {
                                key: 'dueToday',
                                icon: '🔴',
                                title: 'Bugün Son Ödeme Günü',
                                desc: 'Son ödeme günü olan ödemeler için sabah 09:00\'da bildirim.',
                                color: '#f44336'
                            },
                            {
                                key: 'overdue',
                                icon: '❗',
                                title: 'Gecikmiş Ödeme Uyarısı',
                                desc: 'Vadesi geçmiş ödemeler için her gün 10:00\'da bildirim.',
                                color: '#e91e63'
                            },
                            {
                                key: 'weeklySummary',
                                icon: '📊',
                                title: 'Haftalık Özet',
                                desc: 'Her Pazartesi 09:00\'da haftanın ödeme özeti.',
                                color: '#2196f3'
                            },
                            {
                                key: 'monthlySummary',
                                icon: '📅',
                                title: 'Aylık Özet',
                                desc: 'Her ayın 1\'inde 09:00\'da aylık ödeme özeti.',
                                color: '#9c27b0'
                            },
                            {
                                key: 'backupStatus',
                                icon: '☁️',
                                title: 'Yedekleme Durumu',
                                desc: 'Otomatik yedekleme başarılı veya başarısız olduğunda bildirim.',
                                color: '#00bcd4'
                            },
                            {
                                key: 'startupAlert',
                                icon: '🚀',
                                title: 'Uygulama Açılış Bildirimi',
                                desc: 'Uygulama açıldığında gecikmiş ve bugünkü ödemeler hakkında bildirim.',
                                color: '#4caf50'
                            }
                        ].map(item => {
                            const prefs = userProfile.notificationPrefs || {};
                            const isEnabled = prefs[item.key] !== false; // default true

                            return (
                                <div key={item.key} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '14px 16px', background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)',
                                    transition: 'background 0.2s'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '10px',
                                            background: `${item.color}15`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '18px', flexShrink: 0
                                        }}>
                                            {item.icon}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ color: '#fff', fontWeight: '500', fontSize: '0.9rem' }}>{item.title}</div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: '1.3', marginTop: '2px' }}>
                                                {item.desc}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => updateUserProfile({
                                            notificationPrefs: {
                                                ...(userProfile.notificationPrefs || {}),
                                                [item.key]: !isEnabled
                                            }
                                        })}
                                        style={{
                                            width: '48px', height: '26px', borderRadius: '13px', border: 'none',
                                            background: isEnabled ? '#4caf50' : 'rgba(255,255,255,0.15)',
                                            position: 'relative', cursor: 'pointer',
                                            transition: 'background 0.3s ease', flexShrink: 0, marginLeft: '12px'
                                        }}
                                    >
                                        <div style={{
                                            width: '20px', height: '20px', borderRadius: '50%',
                                            background: '#fff', position: 'absolute', top: '3px',
                                            left: isEnabled ? '25px' : '3px',
                                            transition: 'left 0.3s ease',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                        }} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Test bildirimi */}
                    <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={async () => {
                                const { sendNotification } = await import('../lib/notificationService');
                                await sendNotification(
                                    '🔔 Test Bildirimi — Monty',
                                    'Bildirimler düzgün çalışıyor! Ödeme hatırlatmaları bu şekilde görünecek.'
                                );
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
                        >
                            🔔 Test Bildirimi Gönder
                        </button>
                    </div>
                </div>

                {/* 4. Yedekleme & Bulut */}
                <div className="glass-panel" style={sectionStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
                        <FaCloud size={20} color="#00bcd4" />
                        <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Yedekleme ve Senkronizasyon</h2>
                    </div>

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                        Verileriniz Supabase bulut depolama alanına güvenli şekilde yedeklenir.
                        Otomatik veya manuel yedekleme seçeneklerini kullanabilirsiniz.
                    </p>

                    {/* Status Message */}
                    {backupMessage && (
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            marginBottom: '15px',
                            background: backupMessage.type === 'success' ? 'rgba(50, 215, 75, 0.1)' : 'rgba(255, 69, 58, 0.1)',
                            border: `1px solid ${backupMessage.type === 'success' ? 'rgba(50, 215, 75, 0.3)' : 'rgba(255, 69, 58, 0.3)'}`,
                            color: backupMessage.type === 'success' ? '#32D74B' : '#FF453A',
                            fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                            {backupMessage.type === 'success' ? <FaCheckCircle /> : '⚠️'}
                            {backupMessage.text}
                        </div>
                    )}

                    {/* Hesap Bağlantısı */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FaGoogle color="#DB4437" size={20} />
                                </div>
                                <div>
                                    <div style={{ color: '#fff', fontWeight: '500' }}>Google Hesabı</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                        {session ? session.user.email : 'Bağlı değil'}
                                    </div>
                                </div>
                            </div>
                            {session ? (
                                <button
                                    onClick={async () => {
                                        if (window.electronAPI?.clearSessionData) {
                                            await window.electronAPI.clearSessionData();
                                        }
                                        await supabase.auth.signOut();
                                    }}
                                    className="btn btn-secondary"
                                    style={{ padding: '8px 20px', fontSize: '0.9rem', color: '#ff453a', borderColor: '#ff453a' }}
                                >
                                    Çıkış Yap
                                </button>
                            ) : (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Giriş Yapılmadı</div>
                            )}
                        </div>
                    </div>

                    {/* Otomatik Yedekleme */}
                    <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FaSync size={14} /> Otomatik Yedekleme
                        </h3>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>Yedekleme Sıklığı</label>
                                <select
                                    value={userProfile.backupConfig?.frequency || 'OFF'}
                                    onChange={handleBackupFrequencyChange}
                                    style={{
                                        width: '100%', padding: '10px', background: '#333', color: '#fff',
                                        border: '1px solid #444', borderRadius: '6px', outline: 'none', cursor: 'pointer'
                                    }}
                                >
                                    <option value="OFF">Kapalı</option>
                                    <option value="DAILY">Günlük (Her gece 23:59)</option>
                                    <option value="WEEKLY">Haftalık (Her Pazar 23:59)</option>
                                    <option value="MONTHLY">Aylık (Ayın son günü 23:59)</option>
                                </select>
                            </div>
                            <div style={{ flex: 1, color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: '1.4' }}>
                                {userProfile?.backupConfig?.lastBackup ? (
                                    <>Son yedekleme: <br /><strong style={{ color: '#00bcd4' }}>{new Date(userProfile.backupConfig.lastBackup).toLocaleString('tr-TR')}</strong></>
                                ) : (
                                    'Henüz bulut yedekleme yapılmadı.'
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Manuel Yedekleme */}
                    <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FaCloudUploadAlt size={14} /> Manuel Yedekleme
                        </h3>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <button onClick={handleCloudBackup} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaCloud /> Buluta Yedekle
                            </button>
                            <button onClick={downloadBackupLocal} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaDownload /> Yerel Dosya İndir
                            </button>
                            <label className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <FaCloudUploadAlt /> Dosyadan Yükle
                                <input type="file" accept=".json" onChange={handleImportBackup} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>

                    {/* Bulut Yedekleri Listesi */}
                    <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ fontSize: '1rem', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaHistory size={14} /> Bulut Yedekleri
                            </h3>
                            <button
                                onClick={loadBackupList}
                                className="btn btn-secondary btn-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                                disabled={isLoadingBackups}
                            >
                                <FaSync size={12} style={{ animation: isLoadingBackups ? 'spin 1s linear infinite' : 'none' }} />
                                Yenile
                            </button>
                        </div>

                        {isLoadingBackups ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '20px', color: 'var(--text-muted)' }}>
                                <div className="spinner" style={{ width: '18px', height: '18px' }} />
                                <span>Yedekler yükleniyor...</span>
                            </div>
                        ) : cloudBackups.length === 0 ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                <FaCloud size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
                                <br />
                                Henüz bulut yedeği bulunmuyor.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {cloudBackups.map((backup, i) => (
                                    <div key={backup.fullPath} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '12px 16px',
                                        background: i === 0 ? 'rgba(0, 188, 212, 0.05)' : 'rgba(255,255,255,0.02)',
                                        borderRadius: '8px',
                                        border: `1px solid ${i === 0 ? 'rgba(0, 188, 212, 0.15)' : 'rgba(255,255,255,0.05)'}`,
                                        transition: 'all 0.2s'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <FaCloud size={16} color={i === 0 ? '#00bcd4' : '#555'} />
                                            <div>
                                                <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: i === 0 ? '600' : '400' }}>
                                                    {backup.displayDate}
                                                    {i === 0 && <span style={{ marginLeft: '8px', fontSize: '0.7rem', color: '#00bcd4', background: 'rgba(0,188,212,0.1)', padding: '2px 8px', borderRadius: '10px' }}>En Son</span>}
                                                </div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                                    {backup.name}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => handleRestoreFromCloud(backup)}
                                                disabled={isRestoring}
                                                className="btn btn-secondary btn-sm"
                                                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#00bcd4' }}
                                            >
                                                <FaCloudDownloadAlt size={12} /> Geri Yükle
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCloudBackup(backup)}
                                                className="btn-icon"
                                                style={{ color: '#ff453a', fontSize: '14px' }}
                                                title="Yedeği Sil"
                                            >
                                                <FaTrash size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Info */}
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '50px' }}>
                    <p>Monty App v1.0.0</p>
                </div>
            </div>
        </Layout>
    );
}
