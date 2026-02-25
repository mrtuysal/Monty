import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { FaGoogle, FaApple, FaEnvelope, FaLock, FaUser } from 'react-icons/fa';
import { useData } from '../context/DataContext';

export default function Login() {

    const navigate = useNavigate();
    const { session } = useData();
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // If already logged in, redirect
    React.useEffect(() => {
        if (session) {
            navigate('/', { replace: true });
        }
    }, [session, navigate]);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                // Sign Up
                const { data, error } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        data: {
                            full_name: formData.fullName
                        }
                    }
                });
                if (error) throw error;
                alert('Kayıt başarılı! Lütfen e-postanızı doğrulayın.');
            } else {
                // Sign In
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password
                });
                if (error) throw error;
                navigate('/'); // Go to Dashboard on success
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOAuth = async (provider) => {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: provider.toLowerCase(), // 'google' or 'apple'
                options: {
                    redirectTo: window.location.origin + '/'
                }
            });
            if (error) throw error;
            // The user will be redirected to the provider
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Decorations */}
            <div style={{
                position: 'absolute',
                top: '-20%',
                left: '-10%',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(108,99,255,0.2) 0%, rgba(0,0,0,0) 70%)',
                borderRadius: '50%',
                zIndex: 0
            }} />
            <div style={{
                position: 'absolute',
                bottom: '-20%',
                right: '-10%',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(255,101,132,0.15) 0%, rgba(0,0,0,0) 70%)',
                borderRadius: '50%',
                zIndex: 0
            }} />

            <div className="glass-panel" style={{
                width: '400px',
                padding: '40px',
                borderRadius: '20px',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
            }}>
                {/* Logo Placeholder */}
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                        borderRadius: '20px',
                        margin: '0 auto 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '40px',
                        boxShadow: '0 0 20px rgba(255, 215, 0, 0.4)'
                    }}>
                        🍌
                    </div>
                    <h1 className="gradient-text" style={{ fontSize: '2rem', margin: 0 }}>Monty</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '5px' }}>
                        Finansal Özgürlüğe Adım At
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(255, 69, 58, 0.1)',
                        border: '1px solid #ff453a',
                        color: '#ff453a',
                        padding: '10px',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {isSignUp && (
                        <div style={{ position: 'relative' }}>
                            <FaUser style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                name="fullName"
                                placeholder="Ad Soyad"
                                value={formData.fullName}
                                onChange={handleChange}
                                required={isSignUp}
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 45px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    )}

                    <div style={{ position: 'relative' }}>
                        <FaEnvelope style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="email"
                            name="email"
                            placeholder="E-posta Adresi"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            style={{
                                width: '100%',
                                padding: '12px 12px 12px 45px',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <FaLock style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="password"
                            name="password"
                            placeholder="Şifre"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            style={{
                                width: '100%',
                                padding: '12px 12px 12px 45px',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '12px', marginTop: '10px' }}
                    >
                        {loading ? 'İşleniyor...' : (isSignUp ? 'Kayıt Ol' : 'Giriş Yap')}
                    </button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    veya şununla devam et
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    <button
                        onClick={() => handleOAuth('Google')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: '#fff',
                            border: 'none',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#333',
                            fontWeight: '600',
                            gap: '8px'
                        }}
                    >
                        <FaGoogle color="#DB4437" /> Google
                    </button>
                    <button
                        onClick={() => handleOAuth('Apple')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: '#000',
                            border: '1px solid #333',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#fff',
                            fontWeight: '600',
                            gap: '8px'
                        }}
                    >
                        <FaApple /> Apple
                    </button>
                </div>

                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                        {isSignUp ? 'Zaten hesabın var mı? Giriş Yap' : 'Hesabın yok mu? Kayıt Ol'}
                    </button>
                </div>
            </div>
        </div>
    );
}
