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
    const { accounts, addAccount, deleteAccount, formatMoney } = useData();
    const [modalVisible, setModalVisible] = useState(false);
    const [form, setForm] = useState(initialForm);

    // Group accounts by institution
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
            let amount = acc.balance || 0;
            if (acc.currency === 'USD') amount *= 32;
            if (acc.currency === 'EUR') amount *= 35;
            return sum + amount;
        }, 0);
    }, [accounts]);

    const handleSave = useCallback(async () => {
        if (!form.institution) {
            Alert.alert('Hata', 'Kurum adı gereklidir.');
            return;
        }
        await addAccount({
            ...form,
            balance: parseFloat(form.balance) || 0,
            available: parseFloat(form.available) || 0,
        });
        setForm(initialForm);
        setModalVisible(false);
    }, [form, addAccount]);

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
                <TouchableOpacity onPress={() => setModalVisible(true)}>
                    <LinearGradient
                        colors={[Colors.primary, '#5a52d5']}
                        style={styles.addButton}
                    >
                        <Ionicons name="add" size={24} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Total Card */}
            <View style={{ paddingHorizontal: Layout.screenPadding }}>
                <LinearGradient
                    colors={['#1a1a2e', '#16213e']}
                    style={styles.totalCard}
                >
                    <Text style={styles.totalLabel}>Toplam Varlık</Text>
                    <Text style={styles.totalAmount}>₺ {formatMoney(totalBalance)}</Text>
                    <Text style={styles.totalAccounts}>{accounts.length} hesap</Text>
                </LinearGradient>
            </View>

            {/* Grouped List */}
            <ScrollView contentContainerStyle={{ padding: Layout.screenPadding, paddingBottom: 30 }}>
                {grouped.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="wallet-outline" size={50} color={Colors.textSecondary} />
                        <Text style={{ color: Colors.textSecondary, marginTop: 10, fontSize: 15 }}>
                            Henüz hesap yok
                        </Text>
                    </View>
                ) : (
                    grouped.map(([institution, accs]) => (
                        <View key={institution} style={styles.group}>
                            <Text style={styles.groupTitle}>{institution}</Text>
                            {accs.map(acc => (
                                <View key={acc.id} style={styles.accountCard}>
                                    <View style={styles.accountHeader}>
                                        <Ionicons
                                            name={ACCOUNT_TYPES.find(t => t.key === acc.type)?.icon || 'wallet-outline'}
                                            size={20} color={Colors.primary}
                                        />
                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                            <Text style={styles.accountName}>{acc.name || acc.institution}</Text>
                                            <Text style={styles.accountType}>
                                                {ACCOUNT_TYPES.find(t => t.key === acc.type)?.label || acc.type}
                                                {' • '}{acc.currency}
                                            </Text>
                                        </View>
                                        <TouchableOpacity onPress={() => handleDelete(acc)}>
                                            <Ionicons name="ellipsis-vertical" size={18} color={Colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.balanceRow}>
                                        <View>
                                            <Text style={styles.balanceLabel}>Bakiye</Text>
                                            <Text style={styles.balanceValue}>
                                                {currencySymbol(acc.currency)} {formatMoney(acc.balance)}
                                            </Text>
                                        </View>
                                        {acc.available != null && acc.available !== acc.balance && (
                                            <View>
                                                <Text style={styles.balanceLabel}>Kullanılabilir</Text>
                                                <Text style={[styles.balanceValue, { color: Colors.success }]}>
                                                    {currencySymbol(acc.currency)} {formatMoney(acc.available)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Add Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Yeni Hesap</Text>
                            <TouchableOpacity onPress={() => { setModalVisible(false); setForm(initialForm); }}>
                                <Ionicons name="close-circle" size={28} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <KeyboardAwareScrollView showsVerticalScrollIndicator={false} extraScrollHeight={50} enableOnAndroid>
                            <Text style={styles.label}>Kurum</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Garanti BBVA, Enpara..."
                                placeholderTextColor={Colors.textSecondary}
                                value={form.institution}
                                onChangeText={(t) => setForm({ ...form, institution: t })}
                            />

                            <Text style={styles.label}>Hesap Adı</Text>
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
                                    <Text style={styles.saveButtonText}>Kaydet</Text>
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
    group: { marginBottom: 20 },
    groupTitle: {
        color: Colors.textSecondary, fontSize: 13, fontWeight: '600',
        textTransform: 'uppercase', marginBottom: 8, marginLeft: 5,
    },
    accountCard: {
        backgroundColor: Colors.surface, borderRadius: 14,
        padding: 16, marginBottom: 8,
        borderWidth: 1, borderColor: Colors.border,
    },
    accountHeader: { flexDirection: 'row', alignItems: 'center' },
    accountName: { color: '#fff', fontSize: 15, fontWeight: '600' },
    accountType: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
    balanceRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        marginTop: 14, paddingTop: 14,
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
    },
    balanceLabel: { color: Colors.textSecondary, fontSize: 11 },
    balanceValue: { color: '#fff', fontSize: 17, fontWeight: 'bold', marginTop: 2 },
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
