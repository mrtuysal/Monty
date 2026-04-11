import React, { useState, useMemo, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Modal, Alert, FlatList, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Colors, Typography, Layout } from '../constants/Theme';
import { useData } from '../context/DataContext';

const PAYMENT_TYPES = [
    { key: 'CREDIT_CARD', label: 'Kredi Kartı', emoji: '💳' },
    { key: 'BILL', label: 'Fatura', emoji: '📄' },
    { key: 'LOAN', label: 'Kredi', emoji: '🏦' },
    { key: 'OTHER', label: 'Diğer', emoji: '📋' },
];

const STATUS_MAP = {
    PENDING: { label: 'Bekliyor', color: '#FF9500' },
    PAID: { label: 'Ödendi', color: Colors.success },
    OVERDUE: { label: 'Gecikmiş', color: Colors.error },
};

const initialForm = {
    type: 'CREDIT_CARD',
    institution: '',
    description: '',
    amount: '',
    dueDate: '',
    statementDate: '',
    status: 'PENDING',
    isRecurring: false,
};

export default function PaymentsScreen() {
    const { payments, addPayment, updatePayment, deletePayment, formatMoney } = useData();
    const [modalVisible, setModalVisible] = useState(false);
    const [form, setForm] = useState(initialForm);
    const [filter, setFilter] = useState('ALL');
    const [editingId, setEditingId] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState({ visible: false, field: null });

    const handleDateChange = (event, selectedDate) => {
        if (Platform.OS === 'android') {
            setShowDatePicker({ visible: false, field: null });
        }
        if (event.type === 'set' && selectedDate) {
            const formattedDate = selectedDate.toISOString().split('T')[0];
            setForm(prev => ({ ...prev, [showDatePicker.field]: formattedDate }));
        } else if (Platform.OS === 'ios') {
            if (selectedDate) {
                const formattedDate = selectedDate.toISOString().split('T')[0];
                setForm(prev => ({ ...prev, [showDatePicker.field]: formattedDate }));
            }
        }
    };

    const filteredPayments = useMemo(() => {
        return [...payments]
            .filter(p => filter === 'ALL' || p.type === filter)
            .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0));
    }, [payments, filter]);

    const handleSave = useCallback(async () => {
        if (!form.institution) {
            Alert.alert('Hata', 'Kurum adı gereklidir.');
            return;
        }
        if (!form.dueDate) {
            Alert.alert('Hata', 'Son ödeme tarihi gereklidir.');
            return;
        }

        if (editingId) {
            await updatePayment(editingId, {
                ...form,
                amount: parseFloat(form.amount) || 0,
            });
        } else {
            await addPayment({
                ...form,
                amount: parseFloat(form.amount) || 0,
            });
        }
        setForm(initialForm);
        setEditingId(null);
        setModalVisible(false);
    }, [form, addPayment, updatePayment, editingId]);

    const handleEdit = useCallback((payment) => {
        setForm({
            type: payment.type || 'CREDIT_CARD',
            institution: payment.institution || '',
            description: payment.description || '',
            amount: (payment.amount || '').toString(),
            dueDate: payment.dueDate || '',
            statementDate: payment.statementDate || '',
            status: payment.status || 'PENDING',
            isRecurring: payment.isRecurring || false,
        });
        setEditingId(payment.id);
        setModalVisible(true);
    }, []);

    const addPeriod = (dateStr, freq) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (freq === 'WEEKLY') d.setDate(d.getDate() + 7);
        else if (freq === 'QUARTERLY') d.setMonth(d.getMonth() + 3);
        else if (freq === 'YEARLY') d.setFullYear(d.getFullYear() + 1);
        else d.setMonth(d.getMonth() + 1); // Default MONTHLY
        return d.toISOString().split('T')[0];
    };

    const handleStatusToggle = useCallback(async (payment) => {
        const newStatus = payment.status === 'PAID' ? 'PENDING' : 'PAID';
        await updatePayment(payment.id, { status: newStatus });

        if (newStatus === 'PAID' && payment.isRecurring) {
            const nextDueDate = addPeriod(payment.dueDate, payment.recurringFrequency || 'MONTHLY');
            
            const alreadyExists = payments.some(p => 
                p.institution === payment.institution && 
                p.type === payment.type &&
                p.dueDate === nextDueDate
            );

            if (!alreadyExists) {
                const nextPayment = { ...payment };
                delete nextPayment.id;
                nextPayment.status = 'PENDING';
                nextPayment.dueDate = nextDueDate;
                
                if (payment.statementDate) {
                    nextPayment.statementDate = addPeriod(payment.statementDate, payment.recurringFrequency || 'MONTHLY');
                }

                if (payment.type === 'CREDIT_CARD') {
                    nextPayment.amount = 0;
                }

                await addPayment(nextPayment);
            }
        }
    }, [updatePayment, payments, addPayment]);

    const handleDelete = useCallback((payment) => {
        Alert.alert(
            'Ödemeyi Sil',
            `"${payment.institution}" ödemesini silmek istediğinize emin misiniz?`,
            [
                { text: 'İptal', style: 'cancel' },
                { text: 'Sil', style: 'destructive', onPress: () => deletePayment(payment.id) },
            ]
        );
    }, [deletePayment]);

    const typeEmoji = (type) => PAYMENT_TYPES.find(t => t.key === type)?.emoji || '📋';

    const renderPayment = ({ item }) => {
        const status = STATUS_MAP[item.status] || STATUS_MAP.PENDING;
        return (
            <TouchableOpacity
                style={styles.paymentCard}
                activeOpacity={0.7}
                onPress={() => handleEdit(item)}
            >
                <View style={styles.paymentHeader}>
                    <Text style={{ fontSize: 24 }}>{typeEmoji(item.type)}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.paymentInstitution}>
                            {item.institution || item.description}
                        </Text>
                        {item.description && item.institution && (
                            <Text style={styles.paymentDesc}>{item.description}</Text>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity onPress={() => handleEdit(item)}>
                            <Ionicons name="create-outline" size={18} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item)}>
                            <Ionicons name="trash-outline" size={18} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.paymentDetails}>
                    <View style={styles.detailItem}>
                        <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>{item.dueDate || '—'}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                </View>

                <View style={styles.paymentFooter}>
                    <Text style={styles.paymentAmount}>₺ {formatMoney(item.amount)}</Text>
                    <TouchableOpacity
                        onPress={() => handleStatusToggle(item)}
                        style={[
                            styles.toggleBtn,
                            item.status === 'PAID' && styles.toggleBtnPaid,
                        ]}
                    >
                        <Ionicons
                            name={item.status === 'PAID' ? 'checkmark-circle' : 'checkmark-circle-outline'}
                            size={18}
                            color={item.status === 'PAID' ? Colors.success : Colors.textSecondary}
                        />
                        <Text style={{
                            color: item.status === 'PAID' ? Colors.success : Colors.textSecondary,
                            fontSize: 13, fontWeight: '600',
                        }}>
                            {item.status === 'PAID' ? 'Ödendi' : 'Öde'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={Typography.h1}>Ödemeler</Text>
                <TouchableOpacity onPress={() => { setEditingId(null); setForm(initialForm); setModalVisible(true); }}>
                    <LinearGradient
                        colors={[Colors.primary, '#5a52d5']}
                        style={styles.addButton}
                    >
                        <Ionicons name="add" size={24} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
                <TouchableOpacity
                    style={[styles.filterChip, filter === 'ALL' && styles.filterActive]}
                    onPress={() => setFilter('ALL')}
                >
                    <Text style={[styles.filterText, filter === 'ALL' && styles.filterActiveText]}>Tümü</Text>
                </TouchableOpacity>
                {PAYMENT_TYPES.map(t => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.filterChip, filter === t.key && styles.filterActive]}
                        onPress={() => setFilter(t.key)}
                    >
                        <Text style={[styles.filterText, filter === t.key && styles.filterActiveText]}>
                            {t.emoji} {t.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* List */}
            <FlatList
                data={filteredPayments}
                renderItem={renderPayment}
                keyExtractor={(item) => item.id?.toString()}
                contentContainerStyle={{ padding: Layout.screenPadding, paddingBottom: 30 }}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="document-text-outline" size={50} color={Colors.textSecondary} />
                        <Text style={{ color: Colors.textSecondary, marginTop: 10, fontSize: 15 }}>
                            Henüz ödeme yok
                        </Text>
                    </View>
                }
            />

            {/* Add Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingId ? 'Ödeme Düzenle' : 'Yeni Ödeme'}</Text>
                            <TouchableOpacity onPress={() => { setModalVisible(false); setForm(initialForm); setEditingId(null); }}>
                                <Ionicons name="close-circle" size={28} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <KeyboardAwareScrollView showsVerticalScrollIndicator={false} extraScrollHeight={50} enableOnAndroid>
                            {/* Type Selection */}
                            <Text style={styles.label}>Tür</Text>
                            <View style={styles.typeRow}>
                                {PAYMENT_TYPES.map(t => (
                                    <TouchableOpacity
                                        key={t.key}
                                        style={[styles.typeChip, form.type === t.key && styles.typeChipActive]}
                                        onPress={() => setForm({ ...form, type: t.key })}
                                    >
                                        <Text style={{ fontSize: 18 }}>{t.emoji}</Text>
                                        <Text style={[
                                            styles.typeChipText,
                                            form.type === t.key && { color: '#fff' }
                                        ]}>{t.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Kurum</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Garanti, Turkcell..."
                                placeholderTextColor={Colors.textSecondary}
                                value={form.institution}
                                onChangeText={(t) => setForm({ ...form, institution: t })}
                            />

                            <Text style={styles.label}>Açıklama (opsiyonel)</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Yıllık aidat, telefon faturası..."
                                placeholderTextColor={Colors.textSecondary}
                                value={form.description}
                                onChangeText={(t) => setForm({ ...form, description: t })}
                            />

                            <Text style={styles.label}>Tutar (₺)</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="1.250,00"
                                placeholderTextColor={Colors.textSecondary}
                                keyboardType="decimal-pad"
                                value={form.amount}
                                onChangeText={(t) => setForm({ ...form, amount: t })}
                            />

                            <Text style={styles.label}>Son Ödeme Tarihi</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker({ visible: true, field: 'dueDate' })}>
                                <View pointerEvents="none">
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="Tarih seçin..."
                                        placeholderTextColor={Colors.textSecondary}
                                        value={form.dueDate}
                                        editable={false}
                                    />
                                </View>
                            </TouchableOpacity>

                            {form.type === 'CREDIT_CARD' && (
                                <>
                                    <Text style={styles.label}>Hesap Kesim Tarihi</Text>
                                    <TouchableOpacity onPress={() => setShowDatePicker({ visible: true, field: 'statementDate' })}>
                                        <View pointerEvents="none">
                                            <TextInput
                                                style={styles.modalInput}
                                                placeholder="Tarih seçin..."
                                                placeholderTextColor={Colors.textSecondary}
                                                value={form.statementDate}
                                                editable={false}
                                            />
                                        </View>
                                    </TouchableOpacity>
                                </>
                            )}

                            <TouchableOpacity onPress={handleSave} style={{ marginTop: 10 }}>
                                <LinearGradient
                                    colors={[Colors.primary, '#5a52d5']}
                                    style={styles.saveButton}
                                >
                                    <Text style={styles.saveButtonText}>{editingId ? 'Güncelle' : 'Kaydet'}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </KeyboardAwareScrollView>

                        {showDatePicker.visible && (
                            <DateTimePicker
                                value={form[showDatePicker.field] ? new Date(form[showDatePicker.field]) : new Date()}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleDateChange}
                            />
                        )}
                        {Platform.OS === 'ios' && showDatePicker.visible && (
                            <TouchableOpacity
                                style={{ alignItems: 'center', marginVertical: 10 }}
                                onPress={() => setShowDatePicker({ visible: false, field: null })}
                            >
                                <Text style={{ color: Colors.primary, fontSize: 16, fontWeight: 'bold' }}>Bitti</Text>
                            </TouchableOpacity>
                        )}
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
        alignItems: 'center', paddingHorizontal: Layout.screenPadding,
    },
    addButton: {
        width: 44, height: 44, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
    },
    filterBar: { paddingHorizontal: 15, marginVertical: 15, flexGrow: 0 },
    filterChip: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
        marginRight: 8, backgroundColor: Colors.surface,
        borderWidth: 1, borderColor: Colors.border,
    },
    filterActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
    filterText: { color: Colors.textSecondary, fontSize: 13 },
    filterActiveText: { color: Colors.primary, fontWeight: '600' },
    paymentCard: {
        backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
        marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
    },
    paymentHeader: { flexDirection: 'row', alignItems: 'center' },
    paymentInstitution: { color: '#fff', fontSize: 16, fontWeight: '600' },
    paymentDesc: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
    paymentDetails: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginTop: 12,
    },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    detailText: { color: Colors.textSecondary, fontSize: 12 },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 5,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 12, fontWeight: '600' },
    paymentFooter: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginTop: 12, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
    },
    paymentAmount: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    toggleBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)',
    },
    toggleBtnPaid: { backgroundColor: 'rgba(50,215,75,0.1)' },
    emptyState: { alignItems: 'center', paddingTop: 80 },
    // Modal
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
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
        borderRadius: 14, paddingVertical: 16,
        alignItems: 'center', marginBottom: 20,
    },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
