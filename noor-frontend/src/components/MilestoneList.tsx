import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Milestone {
    id: number;
    name: string;
    status: 'Not Started' | 'In Progress' | 'Completed' | 'Delayed';
    progress: number;
    planned_end_date: string;
    actual_completion_date?: string; // Add this
    is_delayed?: boolean;
}

interface MilestoneListProps {
    milestones: Milestone[];
    onAddPress: () => void;
    onEditPress: (milestone: Milestone) => void;
}

const MilestoneList: React.FC<MilestoneListProps> = ({ milestones, onAddPress, onEditPress }) => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Milestones Overview</Text>
                <TouchableOpacity style={styles.addButton} onPress={onAddPress}>
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.addButtonText}>Add Milestone</Text>
                </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
                {milestones.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No milestones set. Add one to track high-level progress.</Text>
                    </View>
                ) : (
                    milestones.map((milestone) => {
                        // 1. DERIVED STATUS LOGIC
                        let derivedStatus = 'Not Started';
                        if (milestone.progress > 0 && milestone.progress < 100) {
                            derivedStatus = 'Started';
                        } else if (milestone.progress === 100) {
                            derivedStatus = 'Completed';
                        }

                        // 2. STYLING VARIATIONS
                        const isCompleted = derivedStatus === 'Completed';
                        let progressColorStyle = { backgroundColor: '#9CA3AF' }; // Grey for 0 or Default
                        if (derivedStatus === 'Started') progressColorStyle = { backgroundColor: '#3B82F6' }; // Blue
                        if (isCompleted) progressColorStyle = { backgroundColor: '#10B981' }; // Green

                        return (
                            <TouchableOpacity
                                key={milestone.id}
                                style={[
                                    styles.card,
                                    milestone.status === 'Delayed' && styles.cardDelayed,
                                    isCompleted && styles.cardCompleted
                                ]}
                                onPress={() => {
                                    if (isCompleted) return;
                                    onEditPress(milestone);
                                }}
                                activeOpacity={isCompleted ? 1 : 0.7}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1, marginRight: 8 }}>
                                        {isCompleted && (
                                            <Text style={styles.achievedText}> Milestone Achieved</Text>
                                        )}
                                        <Text style={styles.milestoneName} numberOfLines={2}>
                                            {milestone.name}
                                        </Text>
                                    </View>
                                    <StatusBadge status={derivedStatus} />
                                </View>

                                <View style={styles.progressContainer}>
                                    <View style={styles.progressBarBg}>
                                        <View style={[
                                            styles.progressBarFill,
                                            { width: isCompleted ? '100%' : `${milestone.progress}%` },
                                            progressColorStyle
                                        ]} />
                                    </View>
                                    <Text style={styles.progressText}>
                                        {isCompleted ? '100%' : `${milestone.progress}%`}
                                    </Text>
                                </View>

                                <View style={styles.dateContainer}>
                                    <Ionicons
                                        name={isCompleted ? "checkmark-done-circle" : "calendar-outline"}
                                        size={12}
                                        color={isCompleted ? "#047857" : "#6B7280"}
                                    />
                                    <Text style={[styles.dateText, isCompleted && { color: '#047857', fontWeight: '600' }]}>
                                        {isCompleted
                                            ? `Completed on: ${milestone.actual_completion_date ? new Date(milestone.actual_completion_date).toLocaleDateString() : new Date().toLocaleDateString()}`
                                            : `Target: ${new Date(milestone.planned_end_date).toLocaleDateString()}`
                                        }
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    let bg = '#E5E7EB';
    let color = '#374151';
    let icon = 'ellipse';

    switch (status) {
        case 'Completed':
            bg = '#D1FAE5'; color = '#065F46'; icon = 'checkmark-circle'; // Changed to checkmark as requested
            break;
        case 'Started':
        case 'In Progress':
            bg = '#DBEAFE'; color = '#1E40AF'; icon = 'play-circle'; // Blue for started
            break;
        case 'Delayed':
            bg = '#FEE2E2'; color = '#991B1B'; icon = 'alert-circle';
            break;
        case 'Not Started':
            bg = '#F3F4F6'; color = '#6B7280'; icon = 'time-outline';
            break;
    }

    return (
        <View style={[styles.badge, { backgroundColor: bg }]}>
            <Ionicons name={icon as any} size={10} color={color} style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, { color }]}>{status}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        marginTop: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8B0000',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        gap: 4,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    scrollContainer: {
        paddingBottom: 10,
    },
    emptyContainer: {
        padding: 20,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        width: '100%',
    },
    emptyText: {
        color: '#6B7280',
        fontSize: 13,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginRight: 12,
        width: 220,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    cardDelayed: {
        borderColor: '#FEM2E2',
        borderLeftWidth: 4,
        borderLeftColor: '#DC2626',
    },
    cardCompleted: {
        borderColor: '#10B981',
        borderWidth: 1,
        backgroundColor: '#ECFDF5', // Very light green bg
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    milestoneName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937',
    },
    achievedText: {
        fontSize: 10,
        color: '#10B981',
        fontWeight: '700',
        marginTop: 2,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    progressBarBg: {
        flex: 1,
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#059669', // Default green
    },
    progressText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dateText: {
        fontSize: 11,
        color: '#6B7280',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
});

export default MilestoneList;
