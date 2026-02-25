import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FaFileUpload, FaTimes, FaCheckCircle, FaEdit, FaTrash, FaPlus, FaRobot, FaCamera, FaStop } from 'react-icons/fa';
import { extractPaymentsFromFile, isAIConfigured } from '../lib/aiService';

/**
 * FileUploadModal — AI-powered document scanner
 * 
 * Allows user to upload invoice/statement images or PDFs,
 * sends them to Gemini Vision for extraction,
 * shows editable preview, and saves to payments.
 */
export default function FileUploadModal({ isOpen, onClose, onSavePayments, formatMoneyInput, parseMoneyInput }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [extractedPayments, setExtractedPayments] = useState([]);
    const [editingIndex, setEditingIndex] = useState(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Camera handlers
    const startCamera = useCallback(async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            setCameraStream(stream);
            setIsCameraOpen(true);
            // Attach stream to video element after render
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 100);
        } catch (err) {
            console.error('Camera error:', err);
            setError('Kameraya erişilemedi. Lütfen kamera izinlerini kontrol edin.');
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setIsCameraOpen(false);
    }, [cameraStream]);

    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
            if (blob) {
                const capturedFile = new File([blob], `kamera_${Date.now()}.jpg`, { type: 'image/jpeg' });
                setFile(capturedFile);
                setPreview(canvas.toDataURL('image/jpeg', 0.9));
                setExtractedPayments([]);
                stopCamera();
            }
        }, 'image/jpeg', 0.9);
    }, [stopCamera]);

    if (!isOpen) return null;

    const handleFileSelect = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;

        // Validate file type
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowed.includes(selected.type)) {
            setError('Desteklenmeyen dosya formatı. JPEG, PNG, WebP veya PDF yükleyin.');
            return;
        }

        // Validate file size (max 10MB)
        if (selected.size > 10 * 1024 * 1024) {
            setError('Dosya boyutu çok büyük. Maksimum 10MB.');
            return;
        }

        setFile(selected);
        setError(null);
        setExtractedPayments([]);

        // Create preview for images
        if (selected.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target.result);
            reader.readAsDataURL(selected);
        } else {
            setPreview(null); // PDF has no image preview
        }
    };

    const handleProcess = async () => {
        if (!file) return;

        setIsProcessing(true);
        setError(null);

        const result = await extractPaymentsFromFile(file);

        if (result.success) {
            if (result.payments.length === 0) {
                setError('Belgede ödeme bilgisi bulunamadı. Lütfen fatura veya ekstre yükleyin.');
            } else {
                setExtractedPayments(result.payments);
            }
        } else {
            setError(result.error);
        }

        setIsProcessing(false);
    };

    const handleFieldChange = (index, field, value) => {
        setExtractedPayments(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleRemovePayment = (index) => {
        setExtractedPayments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveAll = () => {
        if (extractedPayments.length === 0) return;
        onSavePayments(extractedPayments);
        handleReset();
        onClose();
    };

    const handleReset = () => {
        setFile(null);
        setPreview(null);
        setError(null);
        setExtractedPayments([]);
        setEditingIndex(null);
        stopCamera();
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        stopCamera();
        onClose();
    };

    const formatCurrency = (amount) => {
        if (amount == null) return '—';
        return `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
    };

    const typeLabels = {
        CREDIT_CARD: '💳 Kredi Kartı',
        BILL: '📄 Fatura',
        LOAN: '🏦 Kredi',
        OTHER: '📋 Diğer'
    };

    const overlayStyle = {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000
    };

    const modalStyle = {
        background: '#1a1a1a', borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
        width: '90%', maxWidth: '800px', maxHeight: '90vh',
        overflow: 'auto', padding: '30px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
    };

    const inputStyle = {
        width: '100%', padding: '8px 10px', background: '#2a2a2a',
        border: '1px solid #444', borderRadius: '6px',
        color: '#fff', fontSize: '0.85rem', outline: 'none'
    };

    // Hidden canvas for camera capture
    const hiddenCanvas = <canvas ref={canvasRef} style={{ display: 'none' }} />;

    return createPortal(
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && handleClose()}>
            <div style={modalStyle}>
                {hiddenCanvas}
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '12px',
                            background: 'linear-gradient(135deg, #6C63FF 0%, #00bcd4 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <FaRobot size={20} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#fff' }}>AI ile Fatura Okuma</h2>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Fatura veya ekstre yükleyin ya da kamera ile çekin
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="btn-icon" style={{ color: '#888' }}>
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Camera View */}
                {isCameraOpen && (
                    <div style={{
                        borderRadius: '12px', overflow: 'hidden',
                        marginBottom: '20px', position: 'relative',
                        border: '2px solid rgba(108, 99, 255, 0.3)',
                        background: '#000'
                    }}>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            style={{ width: '100%', display: 'block', maxHeight: '400px', objectFit: 'contain' }}
                        />
                        <div style={{
                            position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)',
                            display: 'flex', gap: '12px'
                        }}>
                            <button
                                onClick={capturePhoto}
                                style={{
                                    width: '60px', height: '60px', borderRadius: '50%',
                                    border: '3px solid #fff', background: 'rgba(108, 99, 255, 0.8)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.4)', transition: 'transform 0.2s'
                                }}
                                onMouseDown={e => e.target.style.transform = 'scale(0.9)'}
                                onMouseUp={e => e.target.style.transform = 'scale(1)'}
                                title="Fotoğraf Çek"
                            >
                                <FaCamera size={22} color="#fff" />
                            </button>
                            <button
                                onClick={stopCamera}
                                style={{
                                    width: '44px', height: '44px', borderRadius: '50%',
                                    border: '2px solid #ff453a', background: 'rgba(255, 69, 58, 0.8)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    alignSelf: 'center'
                                }}
                                title="Kamerayı Kapat"
                            >
                                <FaStop size={14} color="#fff" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Upload Area */}
                {extractedPayments.length === 0 && !isCameraOpen && (
                    <div>
                        {/* File preview or upload options */}
                        {file ? (
                            <div
                                style={{
                                    border: '2px dashed rgba(108, 99, 255, 0.3)',
                                    borderRadius: '12px', padding: '30px', textAlign: 'center',
                                    cursor: 'pointer', marginBottom: '20px',
                                    background: 'rgba(108, 99, 255, 0.05)',
                                    transition: 'all 0.3s'
                                }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />
                                {preview && (
                                    <img
                                        src={preview}
                                        alt="Preview"
                                        style={{
                                            maxWidth: '100%', maxHeight: '200px',
                                            borderRadius: '8px', marginBottom: '15px',
                                            objectFit: 'contain'
                                        }}
                                    />
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                    <FaFileUpload size={20} color="#6C63FF" />
                                    <span style={{ color: '#fff', fontWeight: '500' }}>{file.name}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                        ({(file.size / 1024).toFixed(0)} KB)
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
                                marginBottom: '20px'
                            }}>
                                {/* File Upload Option */}
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const droppedFile = e.dataTransfer.files[0];
                                        if (droppedFile) {
                                            const syntheticEvent = { target: { files: [droppedFile] } };
                                            handleFileSelect(syntheticEvent);
                                        }
                                    }}
                                    style={{
                                        border: '2px dashed rgba(108, 99, 255, 0.3)',
                                        borderRadius: '12px', padding: '35px 20px', textAlign: 'center',
                                        cursor: 'pointer', transition: 'all 0.3s',
                                        background: 'transparent'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(108, 99, 255, 0.05)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                                        onChange={handleFileSelect}
                                        style={{ display: 'none' }}
                                    />
                                    <FaFileUpload size={36} color="#6C63FF" style={{ opacity: 0.6, marginBottom: '12px' }} />
                                    <div style={{ color: '#fff', fontWeight: '500', marginBottom: '5px', fontSize: '0.95rem' }}>
                                        Dosya Yükle
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                        JPEG, PNG, WebP, PDF
                                    </div>
                                </div>

                                {/* Camera Option */}
                                <div
                                    onClick={startCamera}
                                    style={{
                                        border: '2px dashed rgba(0, 188, 212, 0.3)',
                                        borderRadius: '12px', padding: '35px 20px', textAlign: 'center',
                                        cursor: 'pointer', transition: 'all 0.3s',
                                        background: 'transparent'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 188, 212, 0.05)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <FaCamera size={36} color="#00bcd4" style={{ opacity: 0.6, marginBottom: '12px' }} />
                                    <div style={{ color: '#fff', fontWeight: '500', marginBottom: '5px', fontSize: '0.95rem' }}>
                                        Kamera ile Çek
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                        Faturayı fotoğraflayın
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div style={{
                        padding: '12px 16px', borderRadius: '8px', marginBottom: '15px',
                        background: 'rgba(255, 69, 58, 0.1)',
                        border: '1px solid rgba(255, 69, 58, 0.3)',
                        color: '#FF453A', fontSize: '0.85rem'
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* API Key Warning */}
                {!isAIConfigured() && (
                    <div style={{
                        padding: '12px 16px', borderRadius: '8px', marginBottom: '15px',
                        background: 'rgba(255, 204, 0, 0.1)',
                        border: '1px solid rgba(255, 204, 0, 0.3)',
                        color: '#ffcc00', fontSize: '0.85rem'
                    }}>
                        ⚠️ Gemini API anahtarı ayarlanmamış. <code>.env</code> dosyasına <code>VITE_GEMINI_API_KEY=your_key</code> ekleyin.
                    </div>
                )}

                {/* Process Button */}
                {file && extractedPayments.length === 0 && !isProcessing && (
                    <button
                        onClick={handleProcess}
                        disabled={!isAIConfigured()}
                        className="btn btn-primary"
                        style={{
                            width: '100%', padding: '14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            fontSize: '1rem', marginBottom: '15px'
                        }}
                    >
                        <FaRobot /> AI ile Analiz Et
                    </button>
                )}

                {/* Processing State */}
                {isProcessing && (
                    <div style={{
                        textAlign: 'center', padding: '30px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px'
                    }}>
                        <div style={{
                            width: '50px', height: '50px', borderRadius: '50%',
                            border: '3px solid rgba(108, 99, 255, 0.2)',
                            borderTopColor: '#6C63FF',
                            animation: 'spin 1s linear infinite'
                        }} />
                        <div style={{ color: '#fff', fontWeight: '500' }}>Belge analiz ediliyor...</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            Yapay zeka fatura bilgilerini okuyor
                        </div>
                    </div>
                )}

                {/* Extracted Results */}
                {extractedPayments.length > 0 && (
                    <div>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            marginBottom: '15px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaCheckCircle color="#32D74B" />
                                <span style={{ color: '#fff', fontWeight: '600' }}>
                                    {extractedPayments.length} ödeme bulundu
                                </span>
                            </div>
                            <button
                                onClick={handleReset}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.8rem' }}
                            >
                                Yeni Dosya Yükle
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                            {extractedPayments.map((payment, index) => (
                                <div key={index} style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '10px', padding: '16px',
                                    transition: 'all 0.2s'
                                }}>
                                    {editingIndex === index ? (
                                        /* Edit Mode */
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Kurum</label>
                                                    <input value={payment.institution} onChange={(e) => handleFieldChange(index, 'institution', e.target.value)} style={inputStyle} />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Başlık</label>
                                                    <input value={payment.title} onChange={(e) => handleFieldChange(index, 'title', e.target.value)} style={inputStyle} />
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Tutar</label>
                                                    <input type="number" step="0.01" value={payment.amount || ''} onChange={(e) => handleFieldChange(index, 'amount', parseFloat(e.target.value) || 0)} style={inputStyle} />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Son Ödeme</label>
                                                    <input type="date" value={payment.dueDate || ''} onChange={(e) => handleFieldChange(index, 'dueDate', e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Hesap Kesim</label>
                                                    <input type="date" value={payment.statementDate || ''} onChange={(e) => handleFieldChange(index, 'statementDate', e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                <div>
                                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Tür</label>
                                                    <select value={payment.type} onChange={(e) => handleFieldChange(index, 'type', e.target.value)} style={inputStyle}>
                                                        <option value="CREDIT_CARD">Kredi Kartı</option>
                                                        <option value="BILL">Fatura</option>
                                                        <option value="LOAN">Kredi</option>
                                                        <option value="OTHER">Diğer</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Min. Ödeme</label>
                                                    <input type="number" step="0.01" value={payment.minPayment ?? ''} onChange={(e) => handleFieldChange(index, 'minPayment', e.target.value ? parseFloat(e.target.value) : null)} style={inputStyle} />
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                <button onClick={() => setEditingIndex(null)} className="btn btn-primary btn-sm" style={{ fontSize: '0.8rem' }}>
                                                    Tamam
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Display Mode */
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                                    <span style={{
                                                        fontSize: '0.7rem', padding: '2px 8px',
                                                        borderRadius: '10px',
                                                        background: payment.type === 'CREDIT_CARD' ? 'rgba(108,99,255,0.15)' :
                                                            payment.type === 'BILL' ? 'rgba(255,152,0,0.15)' :
                                                                payment.type === 'LOAN' ? 'rgba(0,188,212,0.15)' : 'rgba(255,255,255,0.1)',
                                                        color: payment.type === 'CREDIT_CARD' ? '#6C63FF' :
                                                            payment.type === 'BILL' ? '#ff9800' :
                                                                payment.type === 'LOAN' ? '#00bcd4' : '#888'
                                                    }}>
                                                        {typeLabels[payment.type]}
                                                    </span>
                                                    <span style={{ color: '#fff', fontWeight: '600', fontSize: '0.95rem' }}>
                                                        {payment.institution || payment.title}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                    <span>💰 {formatCurrency(payment.amount)}</span>
                                                    {payment.dueDate && <span>📅 Son: {payment.dueDate}</span>}
                                                    {payment.statementDate && <span>📋 Kesim: {payment.statementDate}</span>}
                                                    {payment.minPayment != null && <span>Min: {formatCurrency(payment.minPayment)}</span>}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button onClick={() => setEditingIndex(index)} className="btn-icon" style={{ color: '#6C63FF' }} title="Düzenle">
                                                    <FaEdit size={14} />
                                                </button>
                                                <button onClick={() => handleRemovePayment(index)} className="btn-icon" style={{ color: '#ff453a' }} title="Kaldır">
                                                    <FaTrash size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Save All Button */}
                        <button
                            onClick={handleSaveAll}
                            className="btn btn-primary"
                            style={{
                                width: '100%', padding: '14px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                fontSize: '1rem'
                            }}
                        >
                            <FaPlus /> Tümünü Ödemelere Kaydet ({extractedPayments.length})
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
