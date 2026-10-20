import React, { useState, useMemo, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Modal, Alert, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Colors, Typography, Layout } from '../constants/Theme';
import { useData } from '../context/DataContext';

const ACCOUNT_TYPES = [
    { key: 'BANK', label: 'Banka', icon: 'business-outline' },
    { key: 'CASH', label: 'Nakit', icon: 'cash-outline' },
    { key: 'CRYPTO', label: 'Kripto', icon: 'logo-bitcoin' },
    { key: 'INVESTMENT', label: 'Yatırım', icon: 'trending-up-outline' },
];

const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'];

const initialForm = {
    institution: '',
    name: '',
    type: 'BANK',
    accountType: 'CHECKING',
    currency: 'TRY',
    balance: '',
    available: '',
};

export default function AccountsScreen() {
    const { accounts, addAccount, updateAccount, deleteAccount, saveAccountOrder, formatMoney, convertToTRY } = useData();
    const [modalVisible, setModalVisible] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [actionAccount, setActionAccount] = useState(null);
    const [form, setForm] = useState(initialForm);

    // Group accounts by institution respecting order of appearance in `accounts`
    const grouped = useMemo(() => {
        const groups = {};
        accounts.forEach(acc => {
            const inst = acc.institution || 'Diğer';
            if (!groups[inst]) groups[inst] = [];
            groups[inst].push(acc);
        });
        return Object.entries(groups);
    }, [accounts]);

    const totalBalance = useMemo(() => {
        return accounts.reduce((sum, acc) => {
            const amount = convertToTRY ? convertToTRY(acc.balance, acc.currency) : (acc.balance || 0);
            return sum + amount;
        }, 0);
    }, [accounts, convertToTRY]);

    // Institution Reordering
    const handleMoveInstitution = (instName, direction) => {
        const institutions = [...new Set(accounts.map(a => a.institution || 'Diğer'))];
        const currentIndex = institutions.indexOf(instName);
        if (currentIndex === -1) return;

        const targetIndex = currentIndex + direction;
        if (targetIndex < 0 || targetIndex >= institutions.length) return;

        const [moved] = institutions.splice(currentIndex, 1);
        institutions.splice(targetIndex, 0, moved);

        const newAccounts = [];
        institutions.forEach(inst => {
            newAccounts.push(...accounts.filter(a => (a.institution || 'Diğer') === inst));
        });

        if (saveAccountOrder) {
            saveAccountOrder(newAccounts);
        }
    };

    // Account Reordering (within the same institution)
    const handleMoveAccount = (acc, direction) => {
        const inst = acc.institution || 'Diğer';
        const groupItems = accounts.filter(a => (a.institution || 'Diğer') === inst);
        const currentIndex = groupItems.findIndex(a => a.id === acc.id);
        if (currentIndex === -1) return;

        const targetIndex = currentIndex + direction;
        if (targetIndex < 0 || targetIndex >= groupItems.length) return;

        const [moved] = groupItems.splice(currentIndex, 1);
        groupItems.splice(targetIndex, 0, moved);

        const institutions = [...new Set(accounts.map(a => a.institution || 'Diğer'))];
        const newAccounts = [];

        institutions.forEach(currentInst => {
            if (currentInst === inst) {
                newAccounts.push(...groupItems);
            } else {
                newAccounts.push(...accounts.filter(a => (a.institution || 'Diğer') === currentInst));
            }
        });

        if (saveAccountOrder) {
            saveAccountOrder(newAccounts);
        }
    };

    const handleOpenAdd = () => {
        setEditingAccount(null);
        setForm(initialForm);
        setModalVisible(true);
    };

    const handleOpenEdit = (acc) => {
        setEditingAccount(acc);
        setForm({
            institution: acc.institution || '',
            name: acc.name || '',
            type: acc.type || 'BANK',
            accountType: acc.accountType || 'CHECKING',
            currency: acc.currency || 'TRY',
            balance: (acc.balance || '').toString(),
            available: (acc.available || '').toString(),
        });
        setModalVisible(true);
    };

    const handleSave = useCallback(async () => {
        if (!form.institution.trim()) {
            Alert.alert('Hata', 'Kurum adı gereklidir.');
            return;
        }

        const payload = {
            ...form,
            balance: parseFloat(form.balance) || 0,
            available: parseFloat(form.available) || parseFloat(form.balance) || 0,
        };

        if (editingAccount) {
            await updateAccount(editingAccount.id, payload);
        } else {
            await addAccount(payload);
        }

        setForm(initialForm);
        setEditingAccount(null);
        setModalVisible(false);
    }, [form, editingAccount, addAccount, updateAccount]);

    const handleDelete = useCallback((account) => {
        Alert.alert(
            'Hesabı Sil',
            `"${account.name || account.institution}" hesabını silmek istediğinize emin misiniz?`,
            [
                { text: 'İptal', style: 'cancel' },
                { text: 'Sil', style: 'destructive', onPress: () => deleteAccount(account.id) },
            ]
        );
    }, [deleteAccount]);

    const currencySymbol = (c) => {
        const map = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' };
        return map[c] || c;
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={Typography.h1}>Hesaplar</Text>
                <TouchableOpacity onPress={handleOpenAdd}>
                    <LinearGradient
                        colors={[Colors.primary, '#5a52d5']}
                        style={styles.addButton}
                    >
                        <Ionicons name="add" size={24} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Total Card */}
            <View style={{ paddingHorizontal: Layout.screenPadding, marginBottom: 12 }}>
                <LinearGradient
                    colors={['#1a1a2e', '#16213e']}
                    style={styles.totalCard}
                >
                    <Text style={styles.totalLabel}>Toplam Varlık</Text>
                    <Text style={styles.totalAmount}>₺ {formatMoney(totalBalance)}</Text>
                    <Text style={styles.totalAccounts}>{accounts.length} hesap</Text>
                </LinearGradient>
            </View>

            {/* Grouped List: En üstte Banka Adı ve Toplam Varlık, Alt Satırlarda Hesap İsmi, Bakiyesi ve 3 Nokta */}
            <ScrollView contentContainerStyle={{ paddingHorizontal: Layout.screenPadding, paddingBottom: 40 }}>
                {grouped.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="wallet-outline" size={50} color={Colors.textSecondary} />
                        <Text style={{ color: Colors.textSecondary, marginTop: 10, fontSize: 15 }}>
                            Henüz hesap yok
                        </Text>
                    </View>
                ) : (
                    grouped.map(([institution, accs], groupIdx) => {
                        // Calculate bank total in TRY
                        const bankTotal = accs.reduce((sum, a) => {
                            const val = convertToTRY ? convertToTRY(a.balance, a.currency) : (a.balance || 0);
                            return sum + val;
                        }, 0);

                        const isFirstGroup = groupIdx === 0;
                        const isLastGroup = groupIdx === grouped.length - 1;

                        return (
                            <View key={institution} style={styles.bankGroupCard}>
                                {/* Banka Başlık Satırı: Banka Adı & Toplam Varlık & Sıralama Okları */}
                                <View style={styles.bankHeaderRow}>
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={styles.bankTitleText}>{institution}</Text>
                                        <View style={styles.accountCountBadge}>
                                            <Text style={styles.accountCountText}>{accs.length} hesap</Text>
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <Text style={styles.bankTotalText}>
                                            ₺ {formatMoney(bankTotal)}
                                        </Text>

                                        {/* Banka Taşıma Okları */}
                                        <View style={styles.arrowGroup}>
                                            <TouchableOpacity
                                                disabled={isFirstGroup}
                                                onPress={() => handleMoveInstitution(institution, -1)}
                                                style={[styles.arrowBtn, isFirstGroup && { opacity: 0.25 }]}
                                            >
                                                <Ionicons name="chevron-up" size={15} color="#fff" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                disabled={isLastGroup}
                                                onPress={() => handleMoveInstitution(institution, 1)}
                                                style={[styles.arrowBtn, isLastGroup && { opacity: 0.25 }]}
                                            >
                                                <Ionicons name="chevron-down" size={15} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>

                                {/* Alt Satırlarda: Hesap İsmi, Bakiyesi ve 3 Nokta */}
                                <View style={styles.accountsListContainer}>
                                    {accs.map((acc, accIdx) => (
                                        <View key={acc.id} style={[styles.accountRow, accIdx > 0 && styles.accountRowBorder]}>
                                            {/* Sol: İkon & İsim & Tür */}
                                            <View style={styles.accountLeft}>
                                                <Ionicons
                                                    name={ACCOUNT_TYPES.find(t => t.key === acc.type)?.icon || 'wallet-outline'}
                                                    size={18}
                                                    color={Colors.primary}
                                                />
                                                <View style={{ flex: 1, marginLeft: 8 }}>
                                                    <Text style={styles.accountNameText} numberOfLines={1}>
                                                        {acc.name || acc.institution}
                                                    </Text>
                                                    <Text style={styles.accountTypeText}>
                                                        {ACCOUNT_TYPES.find(t => t.key === acc.type)?.label || acc.type} • {acc.currency}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Sağ: Bakiye ve 3 Nokta İşlem Butonu */}
                                            <View style={styles.accountRight}>
                                                <Text style={styles.accountBalanceText}>
                                                    {currencySymbol(acc.currency)} {formatMoney(acc.balance)}
                                                </Text>

                                                {/* 3 Nokta (...) İşlem Butonu */}
                                                <TouchableOpacity
                                                    style={styles.moreOptionsBtn}
                                                    onPress={() => setActionAccount(acc)}
                                                >
                                                    <Ionicons name="ellipsis-vertical" size={17} color={Colors.textSecondary} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* 3 Noktaya Dokunulduğunda Açılan Hesap İşlem Seçenekleri Modalı */}
            <Modal visible={!!actionAccount} animationType="fade" transparent onRequestClose={() => setActionAccount(null)}>
                <TouchableOpacity
                    style={styles.actionModalOverlay}
                    activeOpacity={1}
                    onPress={() => setActionAccount(null)}
                >
                    <View style={styles.actionModalSheet}>
                        <View style={styles.actionModalHeader}>
                            <Text style={styles.actionModalTitle} numberOfLines={1}>
                                {actionAccount?.name || actionAccount?.institution}
                            </Text>
                            <Text style={styles.actionModalSub}>
                                {currencySymbol(actionAccount?.currency)} {formatMoney(actionAccount?.balance)}
                            </Text>
                        </View>

                        {/* Yukarı Taşı */}
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => {
                                const target = actionAccount;
                                setActionAccount(null);
                                handleMoveAccount(target, -1);
                            }}
                        >
                            <Ionicons name="arrow-up-circle-outline" size={20} color="#38bdf8" />
                            <Text style={[styles.actionBtnText, { color: '#38bdf8' }]}>
                                Yukarı Taşı
                            </Text>
                        </TouchableOpacity>

                        {/* Aşağı Taşı */}
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => {
                                const target = actionAccount;
                                setActionAccount(null);
                                handleMoveAccount(target, 1);
                            }}
                        >
                            <Ionicons name="arrow-down-circle-outline" size={20} color="#38bdf8" />
                            <Text style={[styles.actionBtnText, { color: '#38bdf8' }]}>
                                Aşağı Taşı
                            </Text>
                        </TouchableOpacity>

                        {/* Düzenle */}
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => {
                                const target = actionAccount;
                                setActionAccount(null);
                                handleOpenEdit(target);
                            }}
                        >
                            <Ionicons name="create-outline" size={20} color={Colors.primary} />
                            <Text style={[styles.actionBtnText, { color: Colors.primary }]}>
                                Hesabı Düzenle
                            </Text>
                        </TouchableOpacity>

                        {/* Sil */}
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: 'rgba(255,69,58,0.1)' }]}
                            onPress={() => {
                                const target = actionAccount;
                                setActionAccount(null);
                                handleDelete(target);
                            }}
                        >
                            <Ionicons name="trash-outline" size={20} color={Colors.error} />
                            <Text style={[styles.actionBtnText, { color: Colors.error }]}>
                                Hesabı Sil
                            </Text>
                        </TouchableOpacity>

                        {/* Kapat */}
                        <TouchableOpacity
                            style={[styles.actionBtn, { marginTop: 4, backgroundColor: 'rgba(255,255,255,0.06)' }]}
                            onPress={() => setActionAccount(null)}
                        >
                            <Text style={[styles.actionBtnText, { color: Colors.textSecondary }]}>
                                Kapat
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Add / Edit Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingAccount ? 'Hesabı Düzenle' : 'Yeni Hesap'}</Text>
                            <TouchableOpacity onPress={() => { setModalVisible(false); setEditingAccount(null); setForm(initialForm); }}>
                                <Ionicons name="close-circle" size={28} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <KeyboardAwareScrollView showsVerticalScrollIndicator={false} extraScrollHeight={50} enableOnAndroid>
                            <Text style={styles.label}>Kurum / Banka Adı</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Garanti BBVA, Enpara..."
                                placeholderTextColor={Colors.textSecondary}
                                value={form.institution}
                                onChangeText={(t) => setForm({ ...form, institution: t })}
                            />

                            <Text style={styles.label}>Hesap İsmi</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Vadesiz TL, Dolar Hesabı..."
                                placeholderTextColor={Colors.textSecondary}
                                value={form.name}
                                onChangeText={(t) => setForm({ ...form, name: t })}
                            />

                            <Text style={styles.label}>Tür</Text>
                            <View style={styles.typeRow}>
                                {ACCOUNT_TYPES.map(t => (
                                    <TouchableOpacity
                                        key={t.key}
                                        style={[styles.typeChip, form.type === t.key && styles.typeChipActive]}
                                        onPress={() => setForm({ ...form, type: t.key })}
                                    >
                                        <Ionicons name={t.icon} size={16} color={form.type === t.key ? '#fff' : Colors.textSecondary} />
                                        <Text style={[styles.typeChipText, form.type === t.key && { color: '#fff' }]}>
                                            {t.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Para Birimi</Text>
                            <View style={styles.typeRow}>
                                {CURRENCIES.map(c => (
                                    <TouchableOpacity
                                        key={c}
                                        style={[styles.typeChip, form.currency === c && styles.typeChipActive]}
                                        onPress={() => setForm({ ...form, currency: c })}
                                    >
                                        <Text style={[styles.typeChipText, form.currency === c && { color: '#fff' }]}>
                                            {currencySymbol(c)} {c}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Bakiye</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="10.000,00"
                                placeholderTextColor={Colors.textSecondary}
                                keyboardType="decimal-pad"
                                value={form.balance}
                                onChangeText={(t) => setForm({ ...form, balance: t })}
                            />

                            <TouchableOpacity onPress={handleSave} style={{ marginTop: 15 }}>
                                <LinearGradient
                                    colors={[Colors.primary, '#5a52d5']}
                                    style={styles.saveButton}
                                >
                                    <Text style={styles.saveButtonText}>{editingAccount ? 'Güncelle' : 'Kaydet'}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </KeyboardAwareScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', paddingHorizontal: Layout.screenPadding, marginBottom: 15,
    },
    addButton: {
        width: 44, height: 44, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
    },
    totalCard: {
        borderRadius: 18, padding: 22, marginBottom: 20,
        borderWidth: 1, borderColor: 'rgba(108,99,255,0.2)',
    },
    totalLabel: { color: Colors.textSecondary, fontSize: 13 },
    totalAmount: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginVertical: 5 },
    totalAccounts: { color: Colors.textSecondary, fontSize: 12 },
    // Kompakt Banka ve Hesap Listesi Stilleri
    bankGroupCard: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
    },
    bankHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 11,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    bankTitleText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    bankTotalText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    accountCountBadge: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    accountCountText: {
        color: Colors.textSecondary,
        fontSize: 10.5,
        fontWeight: '600',
    },
    arrowGroup: {
        flexDirection: 'row',
        gap: 2,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 6,
        padding: 1,
    },
    arrowBtn: {
        padding: 4,
    },
    accountsListContainer: {
        paddingVertical: 2,
    },
    accountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 9,
    },
    accountRowBorder: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.03)',
    },
    accountLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    accountNameText: {
        color: '#fff',
        fontSize: 13.5,
        fontWeight: '600',
    },
    accountTypeText: {
        color: Colors.textSecondary,
        fontSize: 11,
        marginTop: 1,
    },
    accountRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    accountBalanceText: {
        color: '#fff',
        fontSize: 13.5,
        fontWeight: 'bold',
        textAlign: 'right',
    },
    moreOptionsBtn: {
        padding: 5,
        marginRight: -4,
    },

    // 3 Nokta İşlem Modalı
    actionModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'flex-end',
        padding: 16,
    },
    actionModalSheet: {
        backgroundColor: '#1a1a2e',
        borderRadius: 20,
        padding: 18,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    actionModalHeader: {
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    actionModalTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    actionModalSub: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '600',
        marginTop: 2,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: Colors.surface,
    },
    actionBtnText: {
        fontSize: 14.5,
        fontWeight: '600',
    },

    emptyState: { alignItems: 'center', paddingTop: 80 },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: Colors.background, borderTopLeftRadius: 24,
        borderTopRightRadius: 24, padding: 25, maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 20,
    },
    modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
    label: {
        color: Colors.textSecondary, fontSize: 13, fontWeight: '600',
        marginBottom: 6, marginTop: 12,
    },
    typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    typeChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 12, backgroundColor: Colors.surface,
        borderWidth: 1, borderColor: Colors.border,
    },
    typeChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '20' },
    typeChipText: { color: Colors.textSecondary, fontSize: 13 },
    modalInput: {
        backgroundColor: Colors.surface, borderRadius: 12,
        padding: 14, color: '#fff', fontSize: 15,
        borderWidth: 1, borderColor: Colors.border,
        textAlign: 'right', // Rakamlar ve yazılar sağa dayalı
    },
    saveButton: {
        borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 20,
    },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
