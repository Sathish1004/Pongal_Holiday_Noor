import * as React from 'react';
import { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, StatusBar, Alert, ScrollView, Modal, TextInput, Platform } from 'react-native';
import ConfirmationModal from '../components/ConfirmationModal';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

const EmployeeProjectDetailsScreen = ({ route, navigation }: any) => {
    const { siteId, siteName } = route.params;
    const { user } = useContext(AuthContext);
    const [phases, setPhases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Tasks');
    const [expandedPhaseIds, setExpandedPhaseIds] = useState<number[]>([]);

    // Material State
    const [materials, setMaterials] = useState<any[]>([]);
    const [requestModalVisible, setRequestModalVisible] = useState(false);
    const [newRequest, setNewRequest] = useState({ materialName: '', quantity: '', notes: '', taskId: null });
    const [taskSelectorVisible, setTaskSelectorVisible] = useState(false);

    // Get all tasks suitable for material request (active tasks)
    const availableTasks = phases.flatMap(p => p.myTasks || []);

    const fetchMaterials = async () => {
        try {
            const response = await api.get(`/sites/${siteId}/materials`);
            setMaterials(response.data.requests || []);
        } catch (error) {
            console.error('Error fetching materials:', error);
        }
    };

    const handleSubmitRequest = async () => {
        if (!newRequest.materialName || !newRequest.quantity || !newRequest.taskId) {
            Alert.alert('Error', 'Material Name, Quantity, and Task are required');
            return;
        }

        try {
            await api.post('/materials', {
                siteId,
                ...newRequest
            });
            Alert.alert('Success', 'Material request submitted');
            setRequestModalVisible(false);
            setNewRequest({ materialName: '', quantity: '', notes: '', taskId: null });
            fetchMaterials();
        } catch (error) {
            console.error('Error submitting request:', error);
            Alert.alert('Error', 'Failed to submit request');
        }
    };

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState({
        visible: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const confirmAction = (title: string, message: string, onConfirm: () => void) => {
        setConfirmModal({
            visible: true,
            title,
            message,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, visible: false }));
                await onConfirm();
            }
        });
    };

    const handleMarkReceived = async (reqId: number) => {
        confirmAction(
            "Confirm Receipt",
            "Are you sure you have received this material?",
            async () => {
                try {
                    await api.put(`/materials/${reqId}/received`);
                    fetchMaterials(); // Refresh list
                } catch (error) {
                    console.error('Error marking received:', error);
                    Alert.alert('Error', 'Failed to update status');
                }
            }
        );
    };

    // Refresh materials when tab is active
    useEffect(() => {
        if (activeTab === 'Materials') {
            fetchMaterials();
        }
    }, [activeTab]);

    const fetchProjectDetails = async () => {
        try {
            const [phasesRes, tasksRes] = await Promise.all([
                api.get(`/sites/${siteId}/phases`),
                api.get('/tasks/assigned')
            ]);

            const allPhases = phasesRes.data.phases || [];
            const myTasks: any[] = tasksRes.data.tasks || [];

            // Filter tasks for this site
            const siteTasks = myTasks.filter(t => t.site_id === Number(siteId));

            const relevantPhases = allPhases.filter((p: any) => {
                const isPhaseAssigned = p.assigned_to === user?.id; // Phase Lead
                const hasTaskAssigned = siteTasks.some(t => t.phase_id === p.id);
                return isPhaseAssigned || hasTaskAssigned;
            }).map((p: any) => ({
                ...p,
                myTasks: siteTasks.filter(t => t.phase_id === p.id)
            }));

            setPhases(relevantPhases);

            // Auto-expand first phase if available
            if (relevantPhases.length > 0) {
                setExpandedPhaseIds([relevantPhases[0].id]);
            }

        } catch (error) {
            console.error('Error fetching project details:', error);
            Alert.alert('Error', 'Failed to load project details');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchProjectDetails();
        }, [siteId])
    );

    const togglePhase = (phaseId: number) => {
        setExpandedPhaseIds(prev =>
            prev.indexOf(phaseId) > -1
                ? prev.filter(id => id !== phaseId)
                : [...prev, phaseId]
        );
    };

    const handleTaskClick = (task: any) => {
        // Navigate to StageProgress (Unified Task/Chat View)
        navigation.navigate('StageProgress', { taskId: task.id, siteName });
    };

    const handleViewProgress = (phase: any) => {
        navigation.navigate('StageProgress', { phaseId: phase.id, siteName });
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'TBD';
        return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>{siteName || 'Project Details'}</Text>
                    <Text style={styles.headerSubtitle}>Project Board</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Tabs */}
            <View style={styles.modalTabsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {['Tasks', 'Materials'].map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.modalTab, activeTab === tab && styles.modalTabActive]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.modalTabText, activeTab === tab && styles.modalTabTextActive]}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#8B0000" />
                </View>
            ) : (
                <ScrollView style={styles.modalBody} contentContainerStyle={{ padding: 16 }}>
                    {activeTab === 'Tasks' ? (
                        <>
                            {phases.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>No assigned tasks or phases found.</Text>
                                </View>
                            ) : (
                                phases.map((phase) => {
                                    const isExpanded = expandedPhaseIds.indexOf(phase.id) > -1;

                                    // Progress Calculation
                                    const tasksInPhase = phase.myTasks || [];
                                    const completedTasks = tasksInPhase.filter((t: any) => t.status === 'completed' || t.status === 'Completed').length;
                                    const totalTasks = tasksInPhase.length;
                                    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                                    // Status Logic
                                    let statusColor = '#F59E0B';
                                    if (phase.status === 'Completed') statusColor = '#10B981';
                                    if (phase.status === 'Delayed') statusColor = '#EF4444';

                                    const isPhaseAssigned = phase.assigned_to === user?.id;

                                    return (
                                        <View key={phase.id} style={[styles.phaseAccordion, phase.status === 'Completed' && styles.phaseAccordionCompleted]}>
                                            <TouchableOpacity
                                                style={[styles.phaseHeader, phase.status !== 'Completed' ? styles.phaseHeaderDark : styles.phaseHeaderCompleted, isExpanded && styles.phaseHeaderExpanded]}
                                                onPress={() => togglePhase(phase.id)}
                                                activeOpacity={0.9}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    {phase.status === 'Completed' ? (
                                                        <View style={styles.completedBadgeIcon}>
                                                            <Ionicons name="checkmark" size={16} color="#059669" />
                                                        </View>
                                                    ) : (
                                                        <View style={styles.phaseNumberBadge}>
                                                            <Text style={styles.phaseNumberText}>{phase.order_num}</Text>
                                                        </View>
                                                    )}

                                                    <View>
                                                        <Text style={phase.status === 'Completed' ? styles.phaseTitleCompleted : styles.phaseTitleWhite}>
                                                            {phase.name}
                                                        </Text>
                                                        <Text style={phase.status === 'Completed' ? styles.phaseSubtitleCompleted : styles.phaseSubtitleLight}>
                                                            {completedTasks}/{totalTasks} Completed · {progress}%
                                                        </Text>
                                                    </View>

                                                    {isPhaseAssigned && (
                                                        <View style={[styles.meBadge, { marginLeft: 8 }]}>
                                                            <Text style={styles.meBadgeText}>LEAD</Text>
                                                        </View>
                                                    )}
                                                </View>

                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    {isPhaseAssigned && (
                                                        <TouchableOpacity style={{ marginRight: 8 }} onPress={() => handleViewProgress(phase)}>
                                                            <Ionicons name="bar-chart" size={20} color={phase.status === 'Completed' ? '#059669' : '#fff'} />
                                                        </TouchableOpacity>
                                                    )}
                                                    <Ionicons
                                                        name={isExpanded ? "chevron-up" : "chevron-down"}
                                                        size={20}
                                                        color={phase.status === 'Completed' ? '#059669' : '#fff'}
                                                    />
                                                </View>
                                            </TouchableOpacity>

                                            {isExpanded && (
                                                <View style={styles.taskList}>
                                                    {phase.myTasks && phase.myTasks.length > 0 ? (
                                                        phase.myTasks.map((task: any) => {
                                                            const isCompleted = task.status === 'completed' || task.status === 'Completed';
                                                            return (
                                                                <TouchableOpacity
                                                                    key={task.id}
                                                                    style={[styles.taskItem, isCompleted && styles.taskItemCompleted]}
                                                                    onPress={() => handleTaskClick(task)}
                                                                >
                                                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                                        <View style={[styles.radioButton, isCompleted && styles.radioButtonSelected]}>
                                                                            {isCompleted && <Ionicons name="checkmark" size={12} color="#fff" />}
                                                                        </View>
                                                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                                                            <Text style={[styles.taskTitle, task.status === 'completed' && styles.taskCompletedText]}>
                                                                                {task.name}
                                                                            </Text>
                                                                            <Text style={styles.taskSubtitle}>
                                                                                Due: {formatDate(task.due_date)}
                                                                            </Text>
                                                                        </View>
                                                                    </View>

                                                                    <View style={[
                                                                        styles.statusPill,
                                                                        task.status === 'completed' ? styles.statusCompleted :
                                                                            task.status === 'in_progress' ? styles.statusProgress : styles.statusPending
                                                                    ]}>
                                                                        <Text style={[
                                                                            styles.statusText,
                                                                            task.status === 'completed' ? styles.statusTextCompleted :
                                                                                task.status === 'in_progress' ? styles.statusTextProgress : styles.statusTextPending
                                                                        ]}>
                                                                            {task.status === 'completed' ? 'Done' :
                                                                                task.status === 'waiting_for_approval' ? 'Review' : 'Pending'}
                                                                        </Text>
                                                                    </View>
                                                                </TouchableOpacity>
                                                            );
                                                        })
                                                    ) : (
                                                        <Text style={styles.noTasksText}>No tasks assigned to you in this stage.</Text>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    );
                                })
                            )}
                        </>
                    ) : (
                        <View style={styles.tabContentContainer}>
                            <View style={[styles.sectionHeaderRow, { justifyContent: 'space-between', marginBottom: 20 }]}>
                                <Text style={styles.tabSectionTitle}>Material Requests</Text>
                                <TouchableOpacity style={styles.addButtonSmall} onPress={() => setRequestModalVisible(true)}>
                                    <Ionicons name="add" size={18} color="#fff" />
                                    <Text style={styles.addButtonTextSmall}>Request</Text>
                                </TouchableOpacity>
                            </View>

                            {materials.length === 0 ? (
                                <View style={styles.emptyTabState}>
                                    <Ionicons name="cube-outline" size={48} color="#e5e7eb" />
                                    <Text style={styles.emptyTabText}>No material requests found.</Text>
                                </View>
                            ) : (
                                materials.map((item) => (
                                    <View key={item.id} style={styles.materialCard}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text style={styles.materialName}>{item.material_name}</Text>
                                            <View style={[styles.statusBadge,
                                            item.status === 'Approved' ? styles.badgeApproved :
                                                item.status === 'Rejected' ? styles.badgeRejected :
                                                    item.status === 'Received' ? styles.badgeReceived : styles.badgePending
                                            ]}>
                                                <Text style={[styles.statusBadgeText,
                                                item.status === 'Approved' ? styles.textApproved :
                                                    item.status === 'Rejected' ? styles.textRejected :
                                                        item.status === 'Received' ? styles.textReceived : styles.textPending
                                                ]}>{item.status}</Text>
                                            </View>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                                            <Text style={styles.materialMeta}>Qty: {item.quantity}</Text>
                                            <Text style={styles.materialMeta}>By: {item.requested_by || 'Unknown'}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text style={styles.materialMeta}>{item.site_name || siteName || 'Project'}</Text>
                                            <Text style={styles.materialMeta}>{formatDate(item.created_at)}</Text>
                                        </View>
                                        {item.notes && <Text style={styles.materialNotes}>"{item.notes}"</Text>}

                                        {item.status === 'Approved' && (
                                            <TouchableOpacity
                                                style={styles.markReceivedBtn}
                                                onPress={() => handleMarkReceived(item.id)}
                                            >
                                                <Ionicons name="checkmark-circle-outline" size={16} color="#059669" />
                                                <Text style={styles.markReceivedText}>Mark as Received</Text>
                                            </TouchableOpacity>
                                        )}
                                        {item.status === 'Received' && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                                <Ionicons name="checkbox" size={16} color="#059669" />
                                                <Text style={{ marginLeft: 4, color: '#059669', fontSize: 12, fontWeight: '600' }}>Received</Text>
                                            </View>
                                        )}
                                    </View>
                                ))
                            )}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Request Material Modal */}
            <Modal
                visible={requestModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setRequestModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.requestModalContent}>
                        <View style={styles.requestModalHeader}>
                            <Text style={styles.requestModalTitle}>Request Material</Text>
                            <TouchableOpacity onPress={() => setRequestModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Material Name <Text style={{ color: 'red' }}>*</Text></Text>
                            <TextInput
                                style={styles.inputField}
                                placeholder="e.g. Cement Bags, wiring"
                                value={newRequest.materialName}
                                onChangeText={(t) => setNewRequest({ ...newRequest, materialName: t })}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Related Task <Text style={{ color: 'red' }}>*</Text></Text>
                            <TouchableOpacity
                                style={styles.inputField}
                                onPress={() => setTaskSelectorVisible(true)}
                            >
                                <Text style={{ color: newRequest.taskId ? '#111827' : '#9CA3AF' }}>
                                    {newRequest.taskId
                                        ? availableTasks.find(t => t.id === newRequest.taskId)?.name
                                        : 'Select a task...'}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <Modal
                            visible={taskSelectorVisible}
                            transparent={true}
                            animationType="fade"
                            onRequestClose={() => setTaskSelectorVisible(false)}
                        >
                            <View style={styles.modalOverlay}>
                                <View style={[styles.requestModalContent, { maxHeight: '60%' }]}>
                                    <Text style={styles.inputLabel}>Select Task</Text>
                                    <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
                                        {availableTasks.length === 0 ? (
                                            <Text style={styles.emptyText}>No active tasks found.</Text>
                                        ) : (
                                            availableTasks.map(task => (
                                                <TouchableOpacity
                                                    key={task.id}
                                                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}
                                                    onPress={() => {
                                                        setNewRequest({ ...newRequest, taskId: task.id });
                                                        setTaskSelectorVisible(false);
                                                    }}
                                                >
                                                    <Text style={styles.taskTitle}>{task.name}</Text>
                                                    <Text style={{ fontSize: 12, color: '#6b7280' }}>Due: {new Date(task.due_date).toLocaleDateString()}</Text>
                                                </TouchableOpacity>
                                            ))
                                        )}
                                    </ScrollView>
                                    <TouchableOpacity
                                        style={[styles.backButton, { alignSelf: 'center', marginTop: 10 }]}
                                        onPress={() => setTaskSelectorVisible(false)}
                                    >
                                        <Text style={{ color: '#6B7280' }}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Modal>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Quantity <Text style={{ color: 'red' }}>*</Text></Text>
                            <TextInput
                                style={styles.inputField}
                                placeholder="e.g. 50 bags"
                                value={newRequest.quantity}
                                onChangeText={(t) => setNewRequest({ ...newRequest, quantity: t })}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Notes (Opional)</Text>
                            <TextInput
                                style={[styles.inputField, { height: 80 }]}
                                multiline
                                placeholder="Any additional details..."
                                value={newRequest.notes}
                                onChangeText={(t) => setNewRequest({ ...newRequest, notes: t })}
                                textAlignVertical="top"
                            />
                        </View>

                        <TouchableOpacity style={styles.submitRequestBtn} onPress={handleSubmitRequest}>
                            <Text style={styles.submitRequestText}>Submit Request</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <ConfirmationModal
                visible={confirmModal.visible}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
            />

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#6B7280',
    },
    // Tabs
    modalTabsContainer: {
        maxHeight: 50,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingHorizontal: 10,
    },
    modalTab: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginRight: 4,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    modalTabActive: {
        borderBottomColor: '#8B0000',
    },
    modalTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    modalTabTextActive: {
        color: '#8B0000',
    },
    modalBody: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    // Phase Accordion
    phaseAccordion: {
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden'
    },
    phaseAccordionCompleted: {
        borderColor: '#10b981',
        backgroundColor: '#ecfdf5',
    },
    phaseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    phaseHeaderDark: {
        backgroundColor: '#8B0000',
    },
    phaseHeaderCompleted: {
        backgroundColor: '#ecfdf5',
    },
    phaseHeaderExpanded: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    phaseNumberBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    phaseNumberText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#8B0000',
    },
    completedBadgeIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#d1fae5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    phaseTitleWhite: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    phaseTitleCompleted: {
        fontSize: 16,
        fontWeight: '700',
        color: '#064e3b',
    },
    phaseSubtitleLight: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    phaseSubtitleCompleted: {
        fontSize: 12,
        color: '#047857',
        marginTop: 2,
    },
    taskList: {
        padding: 16,
        backgroundColor: '#fff',
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    taskItemCompleted: {
        backgroundColor: '#f0fdf4',
    },
    radioButton: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#d1d5db',
    },
    radioButtonSelected: {
        borderColor: '#059669',
        backgroundColor: '#059669',
    },
    taskTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    taskCompletedText: {
        textDecorationLine: 'line-through',
        color: '#9ca3af',
    },
    taskSubtitle: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    noTasksText: {
        fontSize: 13,
        color: '#9ca3af',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 10,
    },
    // Badges/Pills
    statusPill: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusCompleted: {
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0',
    },
    statusProgress: {
        backgroundColor: '#eff6ff',
        borderColor: '#bfdbfe',
    },
    statusPending: {
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    statusTextCompleted: { color: '#059669' },
    statusTextProgress: { color: '#2563eb' },
    statusTextPending: { color: '#dc2626' },

    meBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    meBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#166534',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    // Materials Tab Styles
    tabContentContainer: {
        padding: 16,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tabSectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
    },
    addButtonSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8B0000',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    addButtonTextSmall: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
        marginLeft: 4,
    },
    emptyTabState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderStyle: 'dashed',
    },
    emptyTabText: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 12,
    },

    // Material Cards
    materialCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    materialName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1f2937'
    },
    materialMeta: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4
    },
    materialNotes: {
        fontSize: 12,
        fontStyle: 'italic',
        color: '#374151',
        backgroundColor: '#f9fafb',
        padding: 6,
        borderRadius: 4,
        marginTop: 4
    },

    // Status Badges
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
    },
    badgePending: { backgroundColor: '#fef2f2', borderColor: '#fee2e2' },
    badgeApproved: { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' },
    badgeRejected: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
    badgeReceived: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },

    statusBadgeText: { fontSize: 10, fontWeight: '700' },
    textPending: { color: '#dc2626' }, // Red for pending/rejected
    textRejected: { color: '#dc2626' },
    textApproved: { color: '#059669' },
    textReceived: { color: '#166534' },

    markReceivedBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        backgroundColor: '#ecfdf5',
        padding: 8,
        borderRadius: 8,
        alignSelf: 'flex-start'
    },
    markReceivedText: {
        fontSize: 12,
        color: '#059669',
        fontWeight: '600',
        marginLeft: 4
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    requestModalContent: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5
    },
    requestModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    requestModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827'
    },
    inputGroup: {
        marginBottom: 16
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6
    },
    inputField: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        color: '#1f2937'
    },
    submitRequestBtn: {
        backgroundColor: '#8B0000',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10
    },
    submitRequestText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    }
});

export default EmployeeProjectDetailsScreen;
