import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput, ScrollView, Switch, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AddMilestoneModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    milestoneData?: any; // If editing
    projectPhases: any[]; // To link phases
    onDelete?: (id: number) => Promise<void>; // Add optional delete handler
}

const AddMilestoneModal: React.FC<AddMilestoneModalProps> = ({
    visible, onClose, onSave, milestoneData, projectPhases, onDelete
}) => {
    const [name, setName] = useState('');
    const [plannedEndDate, setPlannedEndDate] = useState(''); // ISO String YYYY-MM-DD
    const [selectedPhaseIds, setSelectedPhaseIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);

    // CUSTOM_POPUP: State for custom confirmation popup
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Simple manual date input for now or reuse a DatePicker if available globally
    // Using text input YYYY-MM-DD for simplicity as requested "Add Milestone Modal" specifics weren't detailed on DatePicker

    useEffect(() => {
        if (visible) {
            setShowDeleteConfirm(false); // Reset confirm state involved
            if (milestoneData) {
                setName(milestoneData.name);
                setPlannedEndDate(milestoneData.planned_end_date ? milestoneData.planned_end_date.split('T')[0] : '');
                const linked = projectPhases.filter(p => p.milestone_id === milestoneData.id).map(p => p.id);
                setSelectedPhaseIds(linked);
            } else {
                setName('');
                setPlannedEndDate(new Date().toISOString().split('T')[0]);
                setSelectedPhaseIds([]);
            }
        }
    }, [visible, milestoneData, projectPhases]);

    const isValidDate = (dateString: string) => {
        // Regex check for format YYYY-MM-DD
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;

        // Logical check for real dates (e.g., preventing Feb 30)
        const [y, m, d] = dateString.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return date.getFullYear() === y && date.getMonth() + 1 === m && date.getDate() === d;
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "Please enter a milestone name");
            return;
        }

        if (!isValidDate(plannedEndDate)) {
            Alert.alert("Invalid Date", "Please enter a valid date in YYYY-MM-DD format.\n(e.g., Feb 30 does not exist)");
            return;
        }

        setLoading(true);
        try {
            await onSave({
                id: milestoneData?.id,
                name,
                plannedEndDate,
                phaseIds: selectedPhaseIds
            });
            onClose();
        } catch (error) {
            console.error("Save failed", error);
            Alert.alert("Error", "Failed to save milestone");
        } finally {
            setLoading(false);
        }
    };

    const togglePhase = (id: number) => {
        if (selectedPhaseIds.includes(id)) {
            setSelectedPhaseIds(selectedPhaseIds.filter(pid => pid !== id));
        } else {
            setSelectedPhaseIds([...selectedPhaseIds, id]);
        }
    };

    // Trigger specific popup
    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        setLoading(true);
        try {
            if (onDelete && milestoneData?.id) {
                await onDelete(milestoneData.id);
                onClose();
            }
        } catch (error) {
            console.error("Delete failed", error);
            Alert.alert("Error", "Failed to delete milestone");
        } finally {
            setLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{milestoneData ? 'Edit Milestone' : 'New Milestone'}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.body}>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Milestone Name</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="e.g., Structure Completed"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Target Date (YYYY-MM-DD)</Text>
                            <TextInput
                                style={styles.input}
                                value={plannedEndDate}
                                onChangeText={setPlannedEndDate}
                                placeholder="YYYY-MM-DD"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Link Stages (Phases)</Text>
                            <Text style={styles.helperText}>Select stages included in this milestone to auto-track progress.</Text>
                            <View style={styles.phaseList}>
                                {projectPhases.map(phase => (
                                    <TouchableOpacity
                                        key={phase.id}
                                        style={[
                                            styles.phaseItem,
                                            selectedPhaseIds.includes(phase.id) && styles.phaseItemSelected,
                                            (phase.milestone_id && (!milestoneData || phase.milestone_id !== milestoneData.id)) && styles.phaseItemDisabled
                                        ]}
                                        onPress={() => {
                                            if (phase.milestone_id && (!milestoneData || phase.milestone_id !== milestoneData.id)) return;
                                            togglePhase(phase.id);
                                        }}
                                    >
                                        <Text style={[
                                            styles.phaseText,
                                            selectedPhaseIds.includes(phase.id) && styles.phaseTextSelected
                                        ]}>
                                            {phase.name}
                                        </Text>
                                        {selectedPhaseIds.includes(phase.id) && (
                                            <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        {milestoneData && onDelete && (
                            <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteClick} disabled={loading}>
                                <Ionicons name="trash-outline" size={18} color="#DC2626" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Milestone</Text>}
                        </TouchableOpacity>
                    </View>

                    {/* Custom Delete Confirmation Overlay */}
                    {showDeleteConfirm && (
                        <View style={styles.confirmOverlay}>
                            <View style={styles.confirmBox}>
                                <View style={styles.confirmIconBg}>
                                    <Ionicons name="alert-circle" size={32} color="#DC2626" />
                                </View>
                                <Text style={styles.confirmTitle}>Delete Milestone</Text>
                                <Text style={styles.confirmText}>
                                    Are you sure you want to delete this milestone? This action cannot be undone.
                                </Text>
                                <View style={styles.confirmButtons}>
                                    <TouchableOpacity
                                        style={styles.confirmCancelBtn}
                                        onPress={() => setShowDeleteConfirm(false)}
                                        disabled={loading}
                                    >
                                        <Text style={styles.confirmCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.confirmDeleteBtn}
                                        onPress={confirmDelete}
                                        disabled={loading}
                                    >
                                        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmDeleteText}>Delete</Text>}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20
    },
    container: {
        backgroundColor: '#fff', borderRadius: 12, maxHeight: '80%', overflow: 'hidden' // Ensure overlay is clipped if needed, but usually absolute covers 
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6'
    },
    title: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    body: { padding: 16 },
    formGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
    input: {
        borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, fontSize: 14
    },
    helperText: { fontSize: 11, color: '#6B7280', marginBottom: 8 },
    phaseList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    phaseItem: {
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', flexDirection: 'row', alignItems: 'center', gap: 6
    },
    phaseItemSelected: {
        backgroundColor: '#EFF6FF', borderColor: '#3B82F6'
    },
    phaseItemDisabled: {
        backgroundColor: '#F3F4F6', opacity: 0.5
    },
    phaseText: { fontSize: 12, color: '#4B5563' },
    phaseTextSelected: { color: '#1D4ED8', fontWeight: '600' },
    footer: {
        flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 12
    },
    cancelBtn: {
        flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center'
    },
    deleteBtn: {
        padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center'
    },
    saveBtn: {
        flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#3B82F6', alignItems: 'center'
    },
    cancelBtnText: { color: '#374151', fontWeight: '600' },
    saveBtnText: { color: '#fff', fontWeight: '600' },

    // Custom Confirmation Popup Styles
    confirmOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        zIndex: 10
    },
    confirmBox: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        maxWidth: 320,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 }
    },
    confirmIconBg: {
        backgroundColor: '#FEF2F2',
        padding: 12,
        borderRadius: 50,
        marginBottom: 16
    },
    confirmTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8
    },
    confirmText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24
    },
    confirmButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%'
    },
    confirmCancelBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        alignItems: 'center'
    },
    confirmDeleteBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#DC2626',
        alignItems: 'center'
    },
    confirmCancelText: {
        color: '#374151',
        fontWeight: '600'
    },
    confirmDeleteText: {
        color: '#fff',
        fontWeight: '600'
    }
});

export default AddMilestoneModal;
