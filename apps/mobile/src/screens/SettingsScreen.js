import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, TextInput, Switch, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Layout, THEMES } from '../constants/Theme';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { sendNotification, DEFAULT_NOTIFICATION_PREFS } from '../services/NotificationService';
import { checkForUpdates } from '../services/UpdateService';
import pkg from '../../package.json';

const NOTIFICATION_ITEMS = [
    {
        key: 'statementReminder',
        icon: '📋',
        title: 'Hesap Kesim Hatırlatması',
        desc: 'Hesap kesim tarihinden sonra tutarları girmeniz için günde 3 kez.',
        color: '#FF9500',
    },
    {
        key: 'dueSoon',
        icon: '⏰',
        title: 'Son Ödeme Yaklaşıyor',
        desc: 'Son ödeme tarihine 3 gün ve 1 gün kala hatırlatma.',
        color: '#FFC107',
    },
    {
        key: 'dueToday',
        icon: '🔴',
        title: 'Bugün Son Ödeme Günü',
        desc: 'Son ödeme günü olan ödemeler için sabah bildirimi.',
        color: '#F44336',
    },
    {
        key: 'overdue',
        icon: '❗',
        title: 'Gecikmiş Ödeme Uyarısı',
        desc: 'Vadesi geçmiş ödemeler için günlük bildirim.',
        color: '#E91E63',
    },
    {
        key: 'weeklySummary',
        icon: '📊',
        title: 'Haftalık Özet',
        desc: 'Her Pazartesi haftanın ödeme özeti.',
        color: '#2196F3',
    },
    {
        key: 'monthlySummary',
        icon: '📅',
        title: 'Aylık Özet',
        desc: 'Her ayın 1\'inde aylık ödeme özeti.',
        color: '#9C27B0',
    },
    {
        key: 'backupStatus',
        icon: '☁️',
        title: 'Yedekleme Durumu',
        desc: 'Yedekleme başarılı veya başarısız olduğunda bildirim.',
        color: '#00BCD4',
    },
    {
        key: 'startupAlert',
        icon: '🚀',
        title: 'Uygulama Açılış Bildirimi',
        desc: 'Açılışta gecikmiş ve bugünkü ödemeler hakkında bildirim.',
        color: '#4CAF50',
    },
];

export default function SettingsScreen() {
    const { session, userProfile, updateUserProfile, signOut } = useData();
    const { themeId, setThemeId, colors, isDark, toggleTheme } = useTheme();

    // Profile editing state
    const [editingProfile, setEditingProfile] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        dob: '',
    });

    // Update Checker state
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

    useEffect(() => {
        if (userProfile) {
            setFormData({
                fullName: userProfile.fullName || '',
                phone: userProfile.phone || '',
                dob: userProfile.dob || '',
            });
        }
    }, [userProfile]);

    const handleSaveProfile = useCallback(() => {
        updateUserProfile(formData);
        setEditingProfile(false);
        Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi.');
    }, [formData, updateUserProfile]);

    const handleNotifToggle = useCallback((key) => {
        const currentPrefs = userProfile.notificationPrefs || {};
        const currentValue = currentPrefs[key] !== false; // default true
        updateUserProfile({
            notificationPrefs: {
                ...currentPrefs,
                [key]: !currentValue,
            },
        });
    }, [userProfile, updateUserProfile]);

    const handleTestNotification = useCallback(async () => {
        await sendNotification(
            '🔔 Test Bildirimi — Monty',
            'Bildirimler düzgün çalışıyor! Ödeme hatırlatmaları bu şekilde görünecek.'
        );
    }, []);

    const handleManualUpdateCheck = async () => {
        setIsCheckingUpdate(true);
        await checkForUpdates(false); // pass false so user gets feedback popups
        setIsCheckingUpdate(false);
    };

    const handleSignOut = () => {
        Alert.alert(
            'Çıkış Yap',
            'Hesabınızdan çıkmak istediğinize emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                { text: 'Çıkış Yap', style: 'destructive', onPress: signOut },
            ]
        );
    };

    const notifPrefs = { ...DEFAULT_NOTIFICATION_PREFS, ...(userProfile.notificationPrefs || {}) };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={[Typography.h1, { color: colors.text, marginBottom: 25 }]}>Ayarlar</Text>

                {/* ═══════════════════════ Profile Card ═══════════════════════ */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="person-outline" size={20} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>Profil Bilgileri</Text>
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => setEditingProfile(!editingProfile)}
                        >
                            <Ionicons
                                name={editingProfile ? 'close-outline' : 'create-outline'}
                                size={18}
                                color={Colors.primary}
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.profileCard}>
                        <View style={styles.avatar}>
                            <Text style={{ fontSize: 28 }}>
                                {(userProfile.fullName || session?.user?.email || '?')[0].toUpperCase()}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            {editingProfile ? (
                                <TextInput
                                    style={styles.profileInput}
                                    value={formData.fullName}
                                    onChangeText={(t) => setFormData(p => ({ ...p, fullName: t }))}
                                    placeholder="İsim Soyisim"
                                    placeholderTextColor={Colors.textSecondary}
                                />
                            ) : (
                                <Text style={styles.profileName}>
                                    {userProfile.fullName || 'Kullanıcı'}
                                </Text>
                            )}
                            <Text style={styles.profileEmail}>
                                {session?.user?.email || ''}
                            </Text>
                        </View>
                    </View>

                    {editingProfile && (
                        <View style={styles.editForm}>
                            <Text style={styles.inputLabel}>Telefon (Opsiyonel)</Text>
                            <TextInput
                                style={styles.profileInput}
                                value={formData.phone}
                                onChangeText={(t) => setFormData(p => ({ ...p, phone: t }))}
                                placeholder="05XX XXX XX XX"
                                placeholderTextColor={Colors.textSecondary}
                                keyboardType="phone-pad"
                            />

                            <Text style={styles.inputLabel}>Doğum Tarihi (Opsiyonel)</Text>
                            <TextInput
                                style={styles.profileInput}
                                value={formData.dob}
                                onChangeText={(t) => setFormData(p => ({ ...p, dob: t }))}
                                placeholder="2000-01-15"
                                placeholderTextColor={Colors.textSecondary}
                            />

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
                                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                <Text style={styles.saveBtnText}>Kaydet</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* ═══════════════════════ Notifications ═══════════════════════ */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="notifications-outline" size={20} color="#FF9500" />
                        <Text style={styles.sectionTitle}>Bildirimler</Text>
                    </View>

                    <Text style={styles.sectionDesc}>
                        Her bildirim türünü ayrı ayrı açıp kapatabilirsiniz.
                    </Text>

                    {NOTIFICATION_ITEMS.map(item => {
                        const isEnabled = notifPrefs[item.key] !== false;
                        return (
                            <View key={item.key} style={styles.notifRow}>
                                <View style={[styles.notifIcon, { backgroundColor: item.color + '15' }]}>
                                    <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                                </View>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text style={styles.notifTitle}>{item.title}</Text>
                                    <Text style={styles.notifDesc}>{item.desc}</Text>
                                </View>
                                <Switch
                                    value={isEnabled}
                                    onValueChange={() => handleNotifToggle(item.key)}
                                    trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#4CAF50' }}
                                    thumbColor="#fff"
                                    ios_backgroundColor="rgba(255,255,255,0.15)"
                                />
                            </View>
                        );
                    })}

                    {/* Test notification button */}
                    <TouchableOpacity style={styles.testNotifBtn} onPress={handleTestNotification}>
                        <Ionicons name="notifications" size={16} color={Colors.primary} />
                        <Text style={styles.testNotifText}>Test Bildirimi Gönder</Text>
                    </TouchableOpacity>
                </View>

                {/* ═══════════════════════ Tema & Görünüm ═══════════════════════ */}
                <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tema & Görünüm</Text>
                    </View>
                    <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
                        Uygulama renk paletini ve aydınlık/koyu modunu seçin:
                    </Text>

                    <View style={styles.themeGrid}>
                        {Object.values(THEMES).map(t => {
                            const isSelected = themeId === t.id;
                            return (
                                <TouchableOpacity
                                    key={t.id}
                                    style={[
                                        styles.themeCard,
                                        {
                                            backgroundColor: isSelected
                                                ? (t.isDark ? '#1C1C21' : '#F1F5F9')
                                                : colors.surfaceHigh,
                                            borderColor: isSelected ? colors.primary : colors.border
                                        }
                                    ]}
                                    onPress={() => setThemeId(t.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.themeCardTop}>
                                        <View style={styles.themePaletteRow}>
                                            {t.preview.map((dotColor, idx) => (
                                                <View
                                                    key={idx}
                                                    style={[styles.themeColorDot, { backgroundColor: dotColor }]}
                                                />
                                            ))}
                                        </View>
                                        <View style={[
                                            styles.modeBadge,
                                            { backgroundColor: t.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.06)' }
                                        ]}>
                                            <Text style={[styles.modeBadgeText, { color: t.isDark ? '#E8F54A' : '#0284C7' }]}>
                                                {t.isDark ? '🌙 Koyu' : '☀️ Aydınlık'}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                                        <Text style={[styles.themeCardName, { color: colors.text }]}>
                                            {t.name}
                                        </Text>
                                        {isSelected && (
                                            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                                        )}
                                    </View>
                                    <Text style={[styles.themeCardSubtitle, { color: colors.textSecondary }]}>
                                        {t.subtitle}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* ═══════════════════════ App Info ═══════════════════════ */}
                <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Uygulama</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.infoRow}
                        onPress={toggleTheme}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconBox, { backgroundColor: colors.primaryContainer }]}>
                            <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={18} color={colors.primary} />
                        </View>
                        <Text style={[styles.infoTitle, { color: colors.text }]}>Aktif Tema Modu</Text>
                        <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(0,188,212,0.15)' : 'rgba(16,185,129,0.15)' }]}>
                            <Text style={[styles.badgeText, { color: isDark ? '#00BCD4' : '#16A34A' }]}>
                                {isDark ? '🌙 Koyu' : '☀️ Aydınlık'} (Değiştir)
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.infoRow}>
                        <View style={[styles.iconBox, { backgroundColor: 'rgba(142,142,147,0.15)' }]}>
                            <Ionicons name="code-slash-outline" size={18} color={Colors.textSecondary} />
                        </View>
                        <Text style={styles.infoTitle}>Versiyon</Text>
                        <Text style={styles.versionText}>{pkg.version}</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.updateCheckBtn}
                        onPress={handleManualUpdateCheck}
                        disabled={isCheckingUpdate}
                    >
                        {isCheckingUpdate ? (
                            <ActivityIndicator size="small" color={Colors.primary} />
                        ) : (
                            <>
                                <Ionicons name="cloud-download-outline" size={16} color={Colors.primary} />
                                <Text style={styles.testNotifText}>Güncellemeleri Denetle</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* ═══════════════════════ Sign Out ═══════════════════════ */}
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <Ionicons name="log-out-outline" size={20} color={Colors.error} />
                    <Text style={styles.signOutText}>Çıkış Yap</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
    scrollContent: { padding: Layout.screenPadding, paddingBottom: 40 },

    // Sections
    section: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 18,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 15,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    sectionTitle: {
        color: Colors.text,
        fontSize: 17,
        fontWeight: '600',
        flex: 1,
    },
    sectionDesc: {
        color: Colors.textSecondary,
        fontSize: 13,
        marginBottom: 15,
        lineHeight: 18,
    },

    // Profile
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: Colors.primary + '30',
        alignItems: 'center', justifyContent: 'center', marginRight: 15,
    },
    profileName: { color: Colors.text, fontSize: 17, fontWeight: '600' },
    profileEmail: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
    editButton: {
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: Colors.primary + '15',
        alignItems: 'center', justifyContent: 'center',
    },
    editForm: {
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    inputLabel: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 5,
        marginTop: 10,
    },
    profileInput: {
        backgroundColor: Colors.background,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: Colors.text,
        fontSize: 15,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    saveBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 15,
    },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

    // Notifications
    notifRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.03)',
    },
    notifIcon: {
        width: 36, height: 36, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
    },
    notifTitle: { color: Colors.text, fontSize: 14, fontWeight: '500' },
    notifDesc: { color: Colors.textSecondary, fontSize: 11, lineHeight: 15, marginTop: 2 },
    testNotifBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 15,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.primary + '40',
        backgroundColor: Colors.primary + '10',
    },
    testNotifText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },

    // App Info
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.03)',
    },
    iconBox: {
        width: 34, height: 34, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
    },
    infoTitle: { color: Colors.text, fontSize: 15, flex: 1 },
    badge: {
        backgroundColor: 'rgba(0,188,212,0.15)',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    },
    badgeText: { color: '#00BCD4', fontSize: 12, fontWeight: '600' },
    versionText: { color: Colors.textSecondary, fontSize: 14 },
    updateCheckBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 15,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.primary + '40',
        backgroundColor: Colors.primary + '10',
    },

    // Sign Out
    signOutButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255, 69, 58, 0.1)',
        borderRadius: 14, padding: 16, marginTop: 10,
        borderWidth: 1, borderColor: 'rgba(255, 69, 58, 0.2)',
        gap: 10,
    },
    signOutText: { color: Colors.error, fontSize: 16, fontWeight: '600' },

    // Theme Styles
    themeGrid: {
        gap: 12,
        marginTop: 5,
    },
    themeCard: {
        borderRadius: 14,
        padding: 14,
        borderWidth: 1.5,
    },
    themeCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    themePaletteRow: {
        flexDirection: 'row',
        gap: 6,
    },
    themeColorDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.15)',
    },
    modeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    modeBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    themeCardName: {
        fontSize: 15,
        fontWeight: '600',
    },
    themeCardSubtitle: {
        fontSize: 12,
        marginTop: 4,
        lineHeight: 16,
    },
});
