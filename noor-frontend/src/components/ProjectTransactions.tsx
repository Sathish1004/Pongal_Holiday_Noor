import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

declare const window: any;

interface Transaction {
    id: number;
    type: 'IN' | 'OUT';
    amount: number;
    description: string;
    date: string;
    phase_id?: number;
    phase_name?: string;
    created_by_name?: string;
}

interface ProjectTransactionsProps {
    siteId: number;
    phases: any[];
    readonly?: boolean;
    clientName?: string;
}

const ProjectTransactions: React.FC<ProjectTransactionsProps> = ({ siteId, phases, readonly = false, clientName }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState({ totalIn: 0, totalOut: 0, balance: 0 });
    const [loading, setLoading] = useState(true);
    const [addModalVisible, setAddModalVisible] = useState(false);

    // Form State
    const [type, setType] = useState<'IN' | 'OUT'>('OUT');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedPhaseId, setSelectedPhaseId] = useState<number | null>(null);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('Cash'); // Cash, Bank Transfer, Cheque

    // Budget Warning Modal State
    const [warningModalVisible, setWarningModalVisible] = useState(false);
    const [warningMessage, setWarningMessage] = useState({ title: '', details: '', newTotal: '' });
    const [phaseDropdownOpen, setPhaseDropdownOpen] = useState(false);

    // Phase Usage Stats (derived or fetched)
    const [phaseUsage, setPhaseUsage] = useState<Record<number, number>>({});

    // NEW: Phase Details View State
    const [viewPhaseId, setViewPhaseId] = useState<number | null>(null);
    const [viewPhaseTransactions, setViewPhaseTransactions] = useState<Transaction[]>([]);


    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get(`/sites/${siteId}/transactions`);
            setTransactions(response.data.transactions);
            setStats(response.data.stats);

            // Calculate phase usage locally for immediate UI update
            const usage: Record<number, number> = {};
            response.data.transactions.forEach((t: Transaction) => {
                if (t.type === 'OUT' && t.phase_id) {
                    usage[t.phase_id] = (usage[t.phase_id] || 0) + Number(t.amount);
                }
            });
            setPhaseUsage(usage);

        } catch (error) {
            console.error('Error fetching transactions:', error);
            Alert.alert('Error', 'Failed to load transactions');
        } finally {
            setLoading(false);
        }
    }, [siteId]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const submitTransaction = async () => {
        // Legacy wrapper for the Warning Modal Proceed button which respects state
        await submitTransactionWithArgs({
            type,
            amount: Number(amount),
            description,
            phase_id: selectedPhaseId,
            date,
            payment_method: type === 'IN' ? paymentMethod : null
        });
    };

    const handleAddTransaction = async (overridePhaseId?: number) => {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        // Use overridePhaseId if provided, else selectedPhaseId
        const activePhaseId = overridePhaseId || selectedPhaseId;

        // If 'viewPhaseId' is active (in details view), we enforce it as the activePhaseId
        const finalPhaseId = viewPhaseId || activePhaseId;

        if (type === 'OUT' && !finalPhaseId) {
            Alert.alert('Error', 'Please select a phase for expenses');
            return;
        }

        // Set the state just in case, for submitTransaction to pick up if it relies on state 
        // (Note: submitTransaction reads from state, so we must set it. 
        // Since setState is async, we should probably modify submitTransaction to take args, 
        // but for now we will assume submitTransaction reads the LATEST state if we trigger it or use args.)
        // ACTUALLY: submitTransaction uses `selectedPhaseId` from closure/state. 
        // We need to update state and then call submit, OR refactor submitTransaction.
        // Let's Refactor submitTransaction slightly to accept optional args.

        await submitTransactionWithArgs({
            type,
            amount: Number(amount),
            description,
            phase_id: finalPhaseId, // This allows IN payments to have a phase too
            date,
            payment_method: type === 'IN' ? paymentMethod : null
        });
    };

    const submitTransactionWithArgs = async (data: any) => {
        try {
            // Budget Check logic moved here for safety if phase is present
            if (data.type === 'OUT' && data.phase_id) {
                const phase = phases.find(p => p.id == data.phase_id);
                const budget = Number(phase?.budget) || 0;
                const used = phaseUsage[data.phase_id] || 0;
                const newTotal = used + Number(data.amount);

                // If budget check fails, we stop (unless user confirms logic is added differently)
                // For simplicity, reusing warning logic is tricky with args. 
                // We'll skip complex warning for the inline "safe" version or implement a quick check.
                if (budget > 0 && newTotal > budget) {
                    // We need to show modal. But modal uses state. 
                    // We can set state variables and show modal, effectively "pausing" this function.
                    // But we can't easily resume with args.
                    // IMPORTANT: The existing warning logic relies on state.
                    // We will set the state values so the warning modal can pick them up if needed.
                    setSelectedPhaseId(data.phase_id);

                    setWarningMessage({
                        title: 'Budget Exceeded',
                        details: `This transaction will exceed the phase budget.\n\nBudget: ${formatMoney(budget)}\nUsed: ${formatMoney(used)}`,
                        newTotal: `New Total: ${formatMoney(newTotal)}`
                    });
                    setWarningModalVisible(true);
                    return;
                }
            }

            await api.post(`/sites/${siteId}/transactions`, data);

            Alert.alert('Success', 'Transaction added successfully');
            setAddModalVisible(false); // Close global modal if open
            resetForm();
            fetchTransactions();
        } catch (error: any) {
            console.error('Error adding transaction:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to add transaction');
        }
    };

    const resetForm = () => {
        setAmount('');
        setDescription('');
        // If we are in a specific phase view, keep that phase selected, otherwise clear it
        if (!viewPhaseId) {
            setSelectedPhaseId(null);
        }
        setDate(new Date().toISOString().split('T')[0]);
        setType('OUT');
        setPaymentMethod('Cash');
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatMoney = (amount: number) => {
        return `₹ ${Number(amount).toLocaleString('en-IN')}`;
    };

    const renderSummaryCard = (title: string, value: number, color: string, icon: any) => (
        <View style={[styles.summaryCard, { borderLeftColor: color }]}>
            <View style={styles.summaryIconContainer}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <View>
                <Text style={styles.summaryLabel}>{title}</Text>
                <Text style={[styles.summaryValue, { color }]}>{formatMoney(value)}</Text>
            </View>
        </View>
    );

    // --- NEW: Render Phase Details Page ---
    const renderPhaseDetails = () => {
        const phase = phases.find(p => p.id === viewPhaseId);
        if (!phase) return null;

        const budget = Number(phase.budget) || 0;
        const used = phaseUsage[phase.id] || 0;
        const remaining = budget - used;
        const isOver = used > budget;

        // Filter transactions for this phase
        const pTrans = transactions.filter(t => t.phase_id === phase.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return (
            <View style={styles.container}>
                {/* Header Section */}
                <View style={styles.phaseDetailHeader}>
                    <TouchableOpacity onPress={() => setViewPhaseId(null)} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                        <Text style={styles.backButtonText}>Back to Dashboard</Text>
                    </TouchableOpacity>
                    <Text style={styles.phaseDetailTitle}>{phase.name}</Text>

                    <View style={styles.phaseDetailStatsRow}>
                        <View style={styles.phaseStatBox}>
                            <Text style={styles.statLabel}>Total Budget</Text>
                            <Text style={[styles.statValue, { color: '#166534' }]}>{formatMoney(budget)}</Text>
                        </View>
                        <View style={styles.phaseStatBox}>
                            <Text style={styles.statLabel}>Total Used (OUT)</Text>
                            <Text style={[styles.statValue, { color: isOver ? '#DC2626' : '#EA580C' }]}>{formatMoney(used)}</Text>
                        </View>
                        <View style={styles.phaseStatBox}>
                            <Text style={styles.statLabel}>Remaining</Text>
                            <Text style={[styles.statValue, { color: remaining < 0 ? '#DC2626' : '#2563EB' }]}>{formatMoney(remaining)}</Text>
                        </View>
                    </View>
                </View>

                <ScrollView style={styles.contentScroll}>


                    {/* Transactions List */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Transactions History</Text>
                        {pTrans.length === 0 ? (
                            <Text style={styles.emptyText}>No transactions for this phase.</Text>
                        ) : (
                            pTrans.map(item => (
                                <View key={item.id} style={styles.transactionRow}>
                                    <View style={[styles.iconBox, { backgroundColor: item.type === 'IN' ? '#DCFCE7' : '#FEE2E2' }]}>
                                        <Ionicons
                                            name={item.type === 'IN' ? 'arrow-down' : 'arrow-up'}
                                            size={20}
                                            color={item.type === 'IN' ? '#166534' : '#DC2626'}
                                        />
                                    </View>
                                    <View style={styles.transInfo}>
                                        <Text style={styles.transDesc}>{item.description}</Text>
                                        <View style={styles.transMeta}>
                                            <Text style={styles.transDate}>{formatDate(item.date)}</Text>
                                            <Text style={styles.transPhase}> • {phase.name}</Text>
                                            {item.type === 'IN' && <Text style={[styles.transPhase, { color: '#166534' }]}> • Payment In</Text>}
                                            {item.type === 'OUT' && <Text style={[styles.transPhase, { color: '#DC2626' }]}> • Expense</Text>}
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[styles.transAmount, { color: item.type === 'IN' ? '#166534' : '#DC2626' }]}>
                                            {item.type === 'IN' ? '+' : '-'} {formatMoney(item.amount)}
                                        </Text>
                                        <Text style={{ fontSize: 10, color: '#6B7280' }}>{item.created_by_name || 'Admin'}</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>
            </View>
        );
    };

    if (viewPhaseId) {
        return renderPhaseDetails();
    }

    return (
        <View style={styles.container}>
            {/* Summary Cards */}
            <View style={styles.summaryRow}>
                {renderSummaryCard('Balance', stats.balance, stats.balance >= 0 ? '#166534' : '#DC2626', 'wallet-outline')}
                {renderSummaryCard('Total In', stats.totalIn, '#166534', 'arrow-down-circle-outline')}
                {renderSummaryCard('Total Out', stats.totalOut, '#DC2626', 'arrow-up-circle-outline')}
            </View>

            {/* Main Content: Phase Budgets & Transaction List */}
            <ScrollView style={styles.contentScroll}>

                {/* Phase Budgets */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Phase Budgets</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.phaseScroll}>
                        {phases.map(phase => {
                            const budget = Number(phase.budget) || 0;
                            const used = phaseUsage[phase.id] || 0;
                            const percent = budget > 0 ? (used / budget) * 100 : 0;
                            const isOver = used > budget;

                            return (
                                <TouchableOpacity
                                    key={phase.id}
                                    style={styles.phaseCard}
                                    onPress={() => setViewPhaseId(phase.id)}
                                >
                                    <Text style={styles.phaseName} numberOfLines={1}>{phase.name}</Text>
                                    <View style={styles.progressBarBg}>
                                        <View style={[
                                            styles.progressBarFill,
                                            { width: `${Math.min(percent, 100)}%`, backgroundColor: isOver ? '#DC2626' : '#166534' }
                                        ]} />
                                    </View>
                                    <View style={styles.phaseStats}>
                                        <Text style={styles.phaseStatText}>{formatMoney(used)} used</Text>
                                        <Text style={styles.phaseStatText}>of {formatMoney(budget)}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Recent Transactions */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Transactions</Text>
                    </View>

                    {!readonly && (
                        <View style={styles.actionButtonsRow}>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#059669' }]} // Teal/Emerald
                                onPress={() => { setType('IN'); setAddModalVisible(true); }}
                            >
                                <Text style={styles.actionButtonText}>Payment In</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#BE123C' }]} // Rose/Pink
                                onPress={() => { setType('OUT'); setAddModalVisible(true); }}
                            >
                                <Text style={styles.actionButtonText}>Payment Out</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {loading ? (
                        <ActivityIndicator size="large" color="#8B0000" style={{ marginTop: 20 }} />
                    ) : transactions.length === 0 ? (
                        <Text style={styles.emptyText}>No transactions recorded yet.</Text>
                    ) : (
                        transactions.map(item => (
                            <View key={item.id} style={styles.transactionRow}>
                                <View style={[styles.iconBox, { backgroundColor: item.type === 'IN' ? '#DCFCE7' : '#FEE2E2' }]}>
                                    <Ionicons
                                        name={item.type === 'IN' ? 'arrow-down' : 'arrow-up'}
                                        size={20}
                                        color={item.type === 'IN' ? '#166534' : '#DC2626'}
                                    />
                                </View>
                                <View style={styles.transInfo}>
                                    <Text style={styles.transDesc}>{item.description || 'No description'}</Text>
                                    <View style={styles.transMeta}>
                                        <Text style={styles.transDate}>{formatDate(item.date)}</Text>
                                        {item.phase_name && (
                                            <Text style={styles.transPhase}> • {item.phase_name}</Text>
                                        )}
                                    </View>
                                </View>
                                <Text style={[styles.transAmount, { color: item.type === 'IN' ? '#166534' : '#DC2626' }]}>
                                    {item.type === 'IN' ? '+' : '-'} {formatMoney(item.amount)}
                                </Text>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Add Transaction Modal (Global) */}
            <Modal
                visible={addModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setAddModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {type === 'IN' ? 'Add Payment (IN)' : 'Add Expense (OUT)'}
                            </Text>
                            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Amount</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0.00"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                        />

                        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="YYYY-MM-DD"
                            value={date}
                            onChangeText={setDate}
                        />

                        {type === 'OUT' && (
                            <>
                                <Text style={styles.label}>Select Phase</Text>
                                <View style={styles.dropdownContainer}>
                                    <TouchableOpacity
                                        style={styles.dropdownTrigger}
                                        onPress={() => setPhaseDropdownOpen(!phaseDropdownOpen)}
                                    >
                                        <Text style={[
                                            styles.dropdownText,
                                            !selectedPhaseId && styles.placeholderText
                                        ]}>
                                            {selectedPhaseId
                                                ? phases.find(p => p.id === selectedPhaseId)?.name
                                                : "Select a phase..."}
                                        </Text>
                                        <Ionicons name={phaseDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
                                    </TouchableOpacity>

                                    {phaseDropdownOpen && (
                                        <View style={styles.dropdownList}>
                                            <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
                                                {phases.map(p => (
                                                    <TouchableOpacity
                                                        key={p.id}
                                                        style={[
                                                            styles.dropdownItem,
                                                            selectedPhaseId === p.id && styles.dropdownItemSelected
                                                        ]}
                                                        onPress={() => {
                                                            setSelectedPhaseId(p.id);
                                                            setPhaseDropdownOpen(false);
                                                        }}
                                                    >
                                                        <Text style={[
                                                            styles.dropdownItemText,
                                                            selectedPhaseId === p.id && styles.dropdownItemTextSelected
                                                        ]}>
                                                            {p.name}
                                                        </Text>
                                                        {selectedPhaseId === p.id && (
                                                            <Ionicons name="checkmark" size={18} color="#8B0000" />
                                                        )}
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>
                            </>
                        )}

                        {type === 'IN' && (
                            <>
                                <Text style={styles.label}>Client Name</Text>
                                <TextInput
                                    style={[styles.input, styles.readOnlyInput]}
                                    value={clientName || 'Unknown Client'}
                                    editable={false}
                                />

                                <Text style={styles.label}>Payment Method</Text>
                                <View style={styles.methodSelector}>
                                    {['Cash', 'Bank Transfer', 'Cheque'].map(method => (
                                        <TouchableOpacity
                                            key={method}
                                            style={[styles.methodChip, paymentMethod === method && styles.methodChipSelected]}
                                            onPress={() => setPaymentMethod(method)}
                                        >
                                            <Text style={[styles.methodChipText, paymentMethod === method && styles.methodChipTextSelected]}>
                                                {method}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, { height: 80 }]}
                            placeholder="Enter details..."
                            multiline
                            value={description}
                            onChangeText={setDescription}
                        />

                        <TouchableOpacity style={styles.saveBtn} onPress={() => handleAddTransaction()}>
                            <Text style={styles.saveBtnText}>Save Transaction</Text>
                        </TouchableOpacity>

                        {/* WARNING OVERLAY */}
                        {warningModalVisible && (
                            <View style={styles.warningOverlay}>
                                <View style={styles.warningContent}>
                                    <View style={styles.warningIconContainer}>
                                        <Ionicons name="warning" size={48} color="#DC2626" />
                                    </View>
                                    <Text style={styles.warningTitle}>{warningMessage.title}</Text>
                                    <Text style={styles.warningText}>{warningMessage.details}</Text>
                                    <Text style={styles.warningNewTotal}>{warningMessage.newTotal}</Text>

                                    <View style={styles.warningActions}>
                                        <TouchableOpacity
                                            style={styles.warningCancelBtn}
                                            onPress={() => setWarningModalVisible(false)}
                                        >
                                            <Text style={styles.warningCancelText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.warningProceedBtn}
                                            onPress={submitTransaction}
                                        >
                                            <Text style={styles.warningProceedText}>Proceed</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#F9FAFB',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 10
    },
    summaryCard: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 12,
        borderLeftWidth: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    summaryIconContainer: {
        marginBottom: 8
    },
    summaryLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    contentScroll: {
        flex: 1,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12
    },
    phaseScroll: {
        flexDirection: 'row',
        paddingVertical: 4
    },
    phaseCard: {
        width: 160,
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 12,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    phaseName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#374151',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    phaseStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    phaseStatText: {
        fontSize: 10,
        color: '#6B7280',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8B0000',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4
    },
    addButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14
    },
    emptyText: {
        textAlign: 'center',
        color: '#9CA3AF',
        marginTop: 20,
        fontStyle: 'italic',
    },
    transactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    transInfo: {
        flex: 1,
    },
    transDesc: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1F2937',
    },
    transMeta: {
        flexDirection: 'row',
        marginTop: 2,
    },
    transDate: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    transPhase: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
    },
    transAmount: {
        fontSize: 14,
        fontWeight: 'bold',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        elevation: 5,
        // Ensure overflow is not hidden so we can position absolute items if needed, 
        // OR make sure items are inside. 
        // For warning overlay inside, we want it to cover this content.
        position: 'relative',
        overflow: 'hidden'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    typeSelector: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 12,
    },
    typeBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    typeBtnIn: {
        backgroundColor: '#DCFCE7',
        borderColor: '#166534',
    },
    typeBtnOut: {
        backgroundColor: '#FEE2E2',
        borderColor: '#DC2626',
    },
    typeText: {
        fontWeight: '600',
        color: '#6B7280',
    },
    typeTextSelected: {
        color: '#111827',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    phaseSelector: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    phaseChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    phaseChipSelected: {
        backgroundColor: '#FEF2F2',
        borderColor: '#8B0000',
    },
    phaseChipText: {
        fontSize: 13,
        color: '#4B5563',
    },
    phaseChipTextSelected: {
        color: '#8B0000',
        fontWeight: 'bold',
    },

    // Dropdown Styles
    dropdownContainer: {
        marginBottom: 16,
        zIndex: 1000, // Ensure it floats above subsequent elements if strictly positioned, though here it pushes content
    },
    dropdownTrigger: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
    },
    dropdownText: {
        fontSize: 14,
        color: '#111827',
    },
    placeholderText: {
        color: '#9CA3AF',
    },
    dropdownList: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderTopWidth: 0,
        borderRadius: 8,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        backgroundColor: '#FFF',
        maxHeight: 200,
        overflow: 'hidden',
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    dropdownItemSelected: {
        backgroundColor: '#FEF2F2',
    },
    dropdownItemText: {
        fontSize: 14,
        color: '#374151',
    },
    dropdownItemTextSelected: {
        color: '#8B0000',
        fontWeight: '600',
    },

    // Payment Method Styles
    readOnlyInput: {
        backgroundColor: '#F3F4F6',
        color: '#6B7280',
    },
    methodSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    methodChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    methodChipSelected: {
        backgroundColor: '#DCFCE7',
        borderColor: '#166534',
    },
    methodChipText: {
        fontSize: 13,
        color: '#4B5563',
    },
    methodChipTextSelected: {
        color: '#166534',
        fontWeight: 'bold',
    },

    saveBtn: {
        backgroundColor: '#8B0000',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    saveBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },

    // New Action Buttons
    actionButtonsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
    },
    actionButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },

    // Warning Overlay Styles
    warningOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 1)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
        padding: 20,
        elevation: 10,
    },
    warningContent: {
        width: '100%',
        alignItems: 'center',
    },
    warningIconContainer: {
        marginBottom: 16,
        backgroundColor: '#FEE2E2',
        padding: 16,
        borderRadius: 40,
    },
    warningTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
    },
    warningText: {
        fontSize: 14,
        color: '#4B5563',
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 20,
    },
    warningNewTotal: {
        fontSize: 16,
        fontWeight: '600',
        color: '#DC2626',
        marginBottom: 24,
    },
    warningActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    warningCancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        alignItems: 'center',
    },
    warningCancelText: {
        color: '#374151',
        fontWeight: '600',
    },
    warningProceedBtn: {
        flex: 1,
        backgroundColor: '#DC2626',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    warningProceedText: {
        color: '#FFF',
        fontWeight: '600',
    },
    // Detail Page Styles
    phaseDetailHeader: {
        marginBottom: 20,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    backButtonText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#374151',
        fontWeight: '600',
    },
    phaseDetailTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    phaseDetailStatsRow: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap'
    },
    phaseStatBox: {
        flex: 1,
        minWidth: 100,
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    inlineFormSection: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 24,
    },
    inlineFormTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#8B0000',
        marginBottom: 16,
    },
});

export default ProjectTransactions;
