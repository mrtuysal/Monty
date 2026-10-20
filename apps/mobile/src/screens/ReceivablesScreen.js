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

const parseDateInput = (val) => {
    if (!val) return null;
    const str = String(val).trim();
    const trMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (trMatch) {
        return `${trMatch[3]}-${trMatch[2].padStart(2, '0')}-${trMatch[1].padStart(2, '0')}`;
    }
    return str.split('T')[0];
};

const getTodayFormatted = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}.${d.getFullYear()}`;
};

const initialForm = {
    type: 'RECEIVABLE', // RECEIVABLE or DEBT
    person: '',
    description: '',
    amount: '',
    date: getTodayFormatted(),
    dueDate: '',
    notes: '',
    status: 'PENDING',
};

export default function ReceivablesScreen() {
    const { receivables, addReceivable, updateReceivable, deleteReceivable, formatMoney, formatDate } = useData();

    const [activeTab, setActiveTab] = useState('ALL'); // ALL, RECEIVABLE, DEBT
    const [modalVisible, setModalVisible] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(initialForm);

    // Summary calculations
    const stats = useMemo(() => {
        let totalReceivable = 0;
        let totalDebt = 0;

        receivables.forEach(r => {
            const amount = parseFloat(r.amount) || 0;
            if (r.status !== 'DONE') {
                if (r.type === 'RECEIVABLE') totalReceivable += amount;
                else if (r.type === 'DEBT') totalDebt += amount;
            }
        });

        return {
            totalReceivable,
            totalDebt,
            net: totalReceivable - totalDebt
        };
    }, [receivables]);

    // Filtered list
    const filteredList = useMemo(() => {
        return receivables.filter(r => {
            if (activeTab === 'RECEIVABLE') return r.type === 'RECEIVABLE';
            if (activeTab === 'DEBT') return r.type === 'DEBT';
            return true;
        }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    }, [receivables, activeTab]);

    const handleOpenAdd = () => {
        setEditingId(null);
        setForm({
            ...initialForm,
            type: activeTab === 'DEBT' ? 'DEBT' : 'RECEIVABLE',
            date: getTodayFormatted()
        });
        setModalVisible(true);
    };

    const handleOpenEdit = (item) => {
        setEditingId(item.id);
        setForm({
            type: item.type || 'RECEIVABLE',
            person: item.person || '',
            description: item.description || '',
            amount: item.amount ? String(item.amount) : '',
            date: formatDate(item.date || new Date()),
            dueDate: item.dueDate || item.due_date ? formatDate(item.dueDate || item.due_date) : '',
            notes: item.notes || '',
            status: item.status || 'PENDING',
        });
        setModalVisible(true);
    };

    const handleSave = useCallback(async () => {
        if (!form.person.trim()) {
            Alert.alert('Hata', 'Kişi veya kurum adı gereklidir.');
            return;
        }
        const parsedAmount = parseFloat(form.amount.replace(',', '.'));
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            Alert.alert('Hata', 'Geçerli bir tutar giriniz.');
            return;
        }

        const payload = {
            type: form.type,
            person: form.person.trim(),
            description: form.description.trim(),
            amount: parsedAmount,
            date: parseDateInput(form.date) || new Date().toISOString().split('T')[0],
            dueDate: parseDateInput(form.dueDate),
            notes: form.notes.trim(),
            status: form.status,
        };

        if (editingId) {
            await updateReceivable(editingId, payload);
        } else {
            await addReceivable(payload);
        }

        setModalVisible(false);
        setEditingId(null);
        setForm(initialForm);
    }, [form, editingId, addReceivable, updateReceivable]);

    const handleDelete = useCallback((item) => {
        Alert.alert(
            'Kaydı Sil',
            `"${item.person}" kaydını silmek istediğinize emin misiniz?`,
            [
                { text: 'İptal', style: 'cancel' },
                { text: 'Sil', style: 'destructive', onPress: () => deleteReceivable(item.id) },
            ]
        );
    }, [deleteReceivable]);

    const handleToggleDone = useCallback((item) => {
        const nextStatus = item.status === 'DONE' ? 'PENDING' : 'DONE';
        updateReceivable(item.id, { status: nextStatus });
    }, [updateReceivable]);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={Typography.h1}>Alacak & Borç</Text>
                <TouchableOpacity onPress={handleOpenAdd}>
                    <LinearGradient
                        colors={[Colors.primary, '#5a52d5']}
                        style={styles.addButton}
                    >
                        <Ionicons name="add" size={24} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Summary Net Balance Card */}
            <LinearGradient
                colors={['#1c1a2e', '#13121f']}
                style={styles.netCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.netRow}>
                    <View>
                        <Text style={styles.netLabel}>Net Durum</Text>
                        <Text style={[styles.netAmount, { color: stats.net >= 0 ? Colors.success : Colors.error }]}>
                            ₺ {formatMoney(Math.abs(stats.net))}
                            <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
                                {stats.net >= 0 ? ' (Artıda)' : ' (Ekside)'}
                            </Text>
                        </Text>
                    </View>
                    <Ionicons
                        name={stats.net >= 0 ? 'trending-up' : 'trending-down'}
                        size={32}
                        color={stats.net >= 0 ? Colors.success : Colors.error}
                    />
                </View>

                <View style={styles.statsSplit}>
                    <View style={styles.statBox}>
                        <Text style={styles.statBoxLabel}>Alacaklarım</Text>
                        <Text style={[styles.statBoxVal, { color: Colors.success }]}>
                            +₺ {formatMoney(stats.totalReceivable)}
                        </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statBoxLabel}>Borçlarım</Text>
                        <Text style={[styles.statBoxVal, { color: Colors.error }]}>
                            -₺ {formatMoney(stats.totalDebt)}
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Tab Filter */}
            <View style={styles.tabContainer}>
                {[
                    { key: 'ALL', label: 'Tümü' },
                    { key: 'RECEIVABLE', label: 'Alacaklarım' },
                    { key: 'DEBT', label: 'Borçlarım' },
                ].map(t => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
                        onPress={() => setActiveTab(t.key)}
                    >
                        <Text style={[styles.tabBtnText, activeTab === t.key && styles.tabBtnTextActive]}>
                            {t.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* List */}
            <FlatList
                data={filteredList}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="documents-outline" size={48} color={Colors.textSecondary} />
                        <Text style={styles.emptyText}>Henüz kayıt bulunmuyor.</Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const isReceivable = item.type === 'RECEIVABLE';
                    const isDone = item.status === 'DONE';

                    return (
                        <View style={[styles.card, isDone && styles.cardDone]}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardPersonGroup}>
                                    <View style={[
                                        styles.typeIndicator,
                                        { backgroundColor: isReceivable ? 'rgba(50,215,75,0.15)' : 'rgba(255,69,58,0.15)' }
                                    ]}>
                                        <Ionicons
                                            name={isReceivable ? 'arrow-down' : 'arrow-up'}
                                            size={16}
                                            color={isReceivable ? Colors.success : Colors.error}
                                        />
                                    </View>
                                    <View>
                                        <Text style={[styles.cardPerson, isDone && styles.textDone]}>
                                            {item.person}
                                        </Text>
                                        <Text style={styles.cardDesc}>
                                            {item.description || (isReceivable ? 'Alacak' : 'Borç')}
                                        </Text>
                                    </View>
                                </View>

                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[
                                        styles.cardAmount,
                                        { color: isDone ? Colors.textSecondary : isReceivable ? Colors.success : Colors.error }
                                    ]}>
                                        {isReceivable ? '+' : '-'}₺ {formatMoney(item.amount)}
                                    </Text>
                                    <View style={[
                                        styles.statusBadge,
                                        { backgroundColor: isDone ? 'rgba(50,215,75,0.15)' : 'rgba(255,149,0,0.15)' }
                                    ]}>
                                        <Text style={[
                                            styles.statusBadgeText,
                                            { color: isDone ? Colors.success : '#FF9500' }
                                        ]}>
                                            {isDone ? (isReceivable ? 'Tahsil Edildi' : 'Ödendi') : 'Bekliyor'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Card Footer Info & Actions */}
                            <View style={styles.cardFooter}>
                                <View style={styles.dateGroup}>
                                    {item.date && (
                                        <Text style={styles.dateText}>
                                            <Ionicons name="calendar-outline" size={12} /> {formatDate(item.date)}
                                        </Text>
                                    )}
                                    {(item.dueDate || item.due_date) && (
                                        <Text style={[styles.dateText, { color: '#FF9500' }]}>
                                            <Ionicons name="time-outline" size={12} /> Vade: {formatDate(item.dueDate || item.due_date)}
                                        </Text>
                                    )}
                                </View>

                                <View style={styles.cardActions}>
                                    <TouchableOpacity
                                        style={[styles.actionIconBtn, isDone && { backgroundColor: Colors.success }]}
                                        onPress={() => handleToggleDone(item)}
                                    >
                                        <Ionicons
                                            name={isDone ? 'checkmark' : 'checkmark-outline'}
                                            size={16}
                                            color={isDone ? '#fff' : Colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.actionIconBtn}
                                        onPress={() => handleOpenEdit(item)}
                                    >
                                        <Ionicons name="pencil-outline" size={16} color={Colors.textSecondary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.actionIconBtn}
                                        onPress={() => handleDelete(item)}
                                    >
                                        <Ionicons name="trash-outline" size={16} color={Colors.error} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    );
                }}
            />

            {/* Add / Edit Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAwareScrollView contentContainerStyle={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingId ? 'Kaydı Düzenle' : 'Yeni Alacak / Borç'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {/* Type Picker */}
                        <View style={styles.typeSelector}>
                            <TouchableOpacity
                                style={[
                                    styles.typeSelectorBtn,
                                    form.type === 'RECEIVABLE' && { backgroundColor: 'rgba(50,215,75,0.2)', borderColor: Colors.success }
                                ]}
                                onPress={() => setForm(f => ({ ...f, type: 'RECEIVABLE' }))}
                            >
                                <Ionicons name="arrow-down" size={18} color={Colors.success} />
                                <Text style={[styles.typeSelectorText, form.type === 'RECEIVABLE' && { color: Colors.success }]}>
                                    Alacak
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.typeSelectorBtn,
                                    form.type === 'DEBT' && { backgroundColor: 'rgba(255,69,58,0.2)', borderColor: Colors.error }
                                ]}
                                onPress={() => setForm(f => ({ ...f, type: 'DEBT' }))}
                            >
                                <Ionicons name="arrow-up" size={18} color={Colors.error} />
                                <Text style={[styles.typeSelectorText, form.type === 'DEBT' && { color: Colors.error }]}>
                                    Borç
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Person Name */}
                        <Text style={styles.inputLabel}>Kişi veya Kurum Adı *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Örn: Ahmet Yılmaz, ABC Ltd."
                            placeholderTextColor={Colors.textSecondary}
                            value={form.person}
                            onChangeText={(val) => setForm(f => ({ ...f, person: val }))}
                        />

                        {/* Amount */}
                        <Text style={styles.inputLabel}>Tutar (₺) *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0,00"
                            placeholderTextColor={Colors.textSecondary}
                            keyboardType="numeric"
                            value={form.amount}
                            onChangeText={(val) => setForm(f => ({ ...f, amount: val }))}
                        />

                        {/* Description */}
                        <Text style={styles.inputLabel}>Açıklama</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Örn: Yemek parası, Proje avansı"
                            placeholderTextColor={Colors.textSecondary}
                            value={form.description}
                            onChangeText={(val) => setForm(f => ({ ...f, description: val }))}
                        />

                        {/* Date and Due Date */}
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>İşlem Tarihi</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="GG.AA.YYYY"
                                    placeholderTextColor={Colors.textSecondary}
                                    value={form.date}
                                    onChangeText={(val) => setForm(f => ({ ...f, date: val }))}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Vade Tarihi</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="GG.AA.YYYY (Opsiyonel)"
                                    placeholderTextColor={Colors.textSecondary}
                                    value={form.dueDate}
                                    onChangeText={(val) => setForm(f => ({ ...f, dueDate: val }))}
                                />
                            </View>
                        </View>

                        {/* Notes */}
                        <Text style={styles.inputLabel}>Notlar</Text>
                        <TextInput
                            style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                            placeholder="Ek notlar ekleyin..."
                            placeholderTextColor={Colors.textSecondary}
                            multiline
                            value={form.notes}
                            onChangeText={(val) => setForm(f => ({ ...f, notes: val }))}
                        />

                        {/* Save Button */}
                        <TouchableOpacity style={{ marginTop: 20 }} onPress={handleSave}>
                            <LinearGradient
                                colors={[Colors.primary, '#5a52d5']}
                                style={styles.saveBtn}
                            >
                                <Text style={styles.saveBtnText}>
                                    {editingId ? 'Güncelle' : 'Kaydet'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </KeyboardAwareScrollView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Layout.screenPadding,
        marginBottom: 15,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    netCard: {
        marginHorizontal: Layout.screenPadding,
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: 15,
    },
    netRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    netLabel: {
        color: Colors.textSecondary,
        fontSize: 13,
        fontWeight: '500',
    },
    netAmount: {
        fontSize: 24,
        fontWeight: '700',
        marginTop: 4,
    },
    statsSplit: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
        paddingTop: 12,
    },
    statBox: {
        flex: 1,
    },
    statBoxLabel: {
        color: Colors.textSecondary,
        fontSize: 12,
    },
    statBoxVal: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginHorizontal: 12,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: Layout.screenPadding,
        gap: 8,
        marginBottom: 12,
    },
    tabBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    tabBtnActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    tabBtnText: {
        color: Colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    tabBtnTextActive: {
        color: '#fff',
    },
    listContent: {
        paddingHorizontal: Layout.screenPadding,
        paddingBottom: 30,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cardDone: {
        opacity: 0.6,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    cardPersonGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    typeIndicator: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardPerson: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    textDone: {
        textDecorationLine: 'line-through',
    },
    cardDesc: {
        color: Colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    cardAmount: {
        fontSize: 16,
        fontWeight: '700',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        marginTop: 4,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 14,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    dateGroup: {
        gap: 3,
    },
    dateText: {
        color: Colors.textSecondary,
        fontSize: 11,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionIconBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 50,
    },
    emptyText: {
        color: Colors.textSecondary,
        fontSize: 14,
        marginTop: 10,
    },
    modalOverlay: {
        flexGrow: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    modalContent: {
        backgroundColor: '#161618',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    typeSelectorBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    typeSelectorText: {
        color: Colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    inputLabel: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#1f1f22',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: '#fff',
        fontSize: 15,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    saveBtn: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
