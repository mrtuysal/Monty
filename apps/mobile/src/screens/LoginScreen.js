import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../constants/Theme';
import { supabase } from '../services/supabase';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
    });

    const handleAuth = async () => {
        if (!formData.email || !formData.password) {
            setError('E-posta ve şifre gerekli.');
            return;
        }
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: { data: { full_name: formData.fullName } },
                });
                if (error) throw error;
                Alert.alert('Başarılı', 'Kayıt başarılı! Lütfen e-postanızı doğrulayın.');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password,
                });
                if (error) throw error;
            }
        } catch (err) {
            if (err.message === 'Invalid login credentials') {
                setError('Kullanıcı bulunamadı veya şifre hatalı. Lütfen kayıt olun.');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        setError(null);
        try {
            // useProxy is deprecated. Use the app's native scheme so it redirects back correctly
            const redirectUrl = makeRedirectUri({
                scheme: 'monty'
            });

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                },
            });

            if (error) throw error;

            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

                if (result.type === 'success' && result.url) {
                    // Extract tokens from the URL
                    const url = new URL(result.url);
                    const params = new URLSearchParams(url.hash.substring(1));
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');

                    if (accessToken && refreshToken) {
                        await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });
                    }
                }
            }
        } catch (err) {
            setError('Google ile giriş başarısız: ' + err.message);
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Background blurs */}
            <View style={styles.bgBlur1} />
            <View style={styles.bgBlur2} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Logo */}
                    <View style={styles.logoContainer}>
                        <LinearGradient
                            colors={['#FFD700', '#FFA500']}
                            style={styles.logoBox}
                        >
                            <Text style={{ fontSize: 40 }}>🍌</Text>
                        </LinearGradient>
                        <Text style={styles.appName}>Monty</Text>
                        <Text style={styles.tagline}>Finansal Özgürlüğe Adım At</Text>
                    </View>

                    {/* Error */}
                    {error && (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {/* Form */}
                    <View style={styles.formCard}>
                        {isSignUp && (
                            <View style={styles.inputWrapper}>
                                <Ionicons name="person-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    placeholder="Ad Soyad"
                                    placeholderTextColor={Colors.textSecondary}
                                    value={formData.fullName}
                                    onChangeText={(t) => setFormData({ ...formData, fullName: t })}
                                    style={styles.input}
                                />
                            </View>
                        )}

                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                placeholder="E-posta Adresi"
                                placeholderTextColor={Colors.textSecondary}
                                value={formData.email}
                                onChangeText={(t) => setFormData({ ...formData, email: t })}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                style={styles.input}
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                placeholder="Şifre"
                                placeholderTextColor={Colors.textSecondary}
                                value={formData.password}
                                onChangeText={(t) => setFormData({ ...formData, password: t })}
                                secureTextEntry
                                style={styles.input}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleAuth}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[Colors.primary, '#5a52d5']}
                                style={styles.authButton}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.authButtonText}>
                                        {isSignUp ? 'Kayıt Ol' : 'Giriş Yap'}
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>veya</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Google Login */}
                        <TouchableOpacity
                            style={styles.googleButton}
                            onPress={handleGoogleLogin}
                            disabled={googleLoading}
                            activeOpacity={0.8}
                        >
                            {googleLoading ? (
                                <ActivityIndicator color="#333" />
                            ) : (
                                <>
                                    <Ionicons name="logo-google" size={20} color="#DB4437" />
                                    <Text style={styles.googleButtonText}>Google ile Devam Et</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Toggle Sign In / Sign Up */}
                        <TouchableOpacity
                            onPress={() => { setIsSignUp(!isSignUp); setError(null); }}
                            style={{ marginTop: 15 }}
                        >
                            <Text style={styles.toggleText}>
                                {isSignUp
                                    ? 'Zaten hesabın var mı? Giriş Yap'
                                    : 'Hesabın yok mu? Kayıt Ol'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    bgBlur1: {
        position: 'absolute', top: -150, left: -80,
        width: 400, height: 400, borderRadius: 200,
        backgroundColor: 'rgba(108, 99, 255, 0.15)',
    },
    bgBlur2: {
        position: 'absolute', bottom: -120, right: -80,
        width: 350, height: 350, borderRadius: 175,
        backgroundColor: 'rgba(255, 101, 132, 0.1)',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
        paddingVertical: 60,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 35,
    },
    logoBox: {
        width: 80, height: 80, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 15,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 10,
    },
    appName: {
        fontSize: 34, fontWeight: 'bold', color: '#fff',
    },
    tagline: {
        fontSize: 14, color: Colors.textSecondary, marginTop: 5,
    },
    errorBox: {
        backgroundColor: 'rgba(255, 69, 58, 0.1)',
        borderWidth: 1, borderColor: '#ff453a',
        borderRadius: 10, padding: 12, marginBottom: 15,
    },
    errorText: {
        color: '#ff453a', fontSize: 14, textAlign: 'center',
    },
    formCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20, padding: 25,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 12, marginBottom: 12,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    inputIcon: {
        paddingLeft: 15,
    },
    input: {
        flex: 1, color: '#fff', fontSize: 15,
        paddingVertical: 14, paddingHorizontal: 12,
    },
    authButton: {
        borderRadius: 12, paddingVertical: 15,
        alignItems: 'center', marginTop: 5,
    },
    authButtonText: {
        color: '#fff', fontSize: 16, fontWeight: '600',
    },
    divider: {
        flexDirection: 'row', alignItems: 'center',
        marginVertical: 18,
    },
    dividerLine: {
        flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    },
    dividerText: {
        color: Colors.textSecondary, marginHorizontal: 12, fontSize: 13,
    },
    googleButton: {
        backgroundColor: '#fff', borderRadius: 12,
        paddingVertical: 13, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center', gap: 10,
    },
    googleButtonText: {
        color: '#333', fontSize: 15, fontWeight: '600',
    },
    toggleText: {
        color: Colors.primary, textAlign: 'center', fontSize: 14,
    },
});
