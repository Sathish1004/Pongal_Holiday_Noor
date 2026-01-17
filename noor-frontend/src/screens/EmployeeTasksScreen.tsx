import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, StatusBar, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

import { useFocusEffect } from '@react-navigation/native';

const EmployeeTasksScreen = ({ navigation }: any) => {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            fetchTasks();
        }, [])
    );

    const fetchTasks = async () => {
        try {
            const response = await api.get('/tasks/assigned');
            setTasks(response.data.tasks || []);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed': return '#10B981'; // Green
            case 'Delayed': return '#EF4444'; // Red
            case 'Ongoing': return '#F59E0B'; // Orange
            default: return '#6B7280'; // Gray
        }
    };

    const renderItem = ({ item }: any) => (
        <TouchableOpacity
            style={styles.taskCard}
            onPress={() => navigation.navigate('StageProgress', { taskId: item.id, siteName: item.site_name })}
        >
            <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                    {/* Site Name and Phase */}
                    <Text style={styles.siteName}>
                        <Ionicons name="business" size={14} color="#6B7280" /> {item.site_name}
                    </Text>
                    <Text style={styles.taskName}>{item.name}</Text>
                    {item.phase_name && (
                        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                            Phase: {item.phase_name}
                        </Text>
                    )}
                </View>

                {/* Status Badge */}
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status?.toUpperCase() || 'PENDING'}
                    </Text>
                </View>
            </View>

            <View style={styles.cardFooter}>
                <View style={styles.dateInfo}>
                    <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                    <Text style={styles.dateText}>
                        Due: {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'No due date'}
                    </Text>
                </View>
                <View style={styles.progressInfo}>
                    <Text style={[styles.progressText, { color: getStatusColor(item.status) }]}>
                        {item.progress || 0}%
                    </Text>
                </View>
            </View>

            {/* Progress Bar Line */}
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${item.progress || 0}%`, backgroundColor: getStatusColor(item.status) }]} />
            </View>

            {/* Subtext hinting at chat */}
            <View style={styles.hintRow}>
                <Text style={styles.hintText}>Tap to view task details & chat</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Tasks</Text>
                <View style={{ width: 32 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#8B0000" />
                </View>
            ) : (
                <FlatList
                    data={tasks}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTasks(); }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="checkmark-done-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>No tasks assigned to you.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB'
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    list: { padding: 16 },
    taskCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12
    },
    headerLeft: { flex: 1, marginRight: 8 },
    siteName: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
    taskName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    dateInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dateText: { fontSize: 12, color: '#6B7280' },
    progressInfo: {},
    progressText: { fontSize: 14, fontWeight: 'bold' },
    progressBarBg: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden' },
    progressBarFill: { height: '100%' },
    hintRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F9FAFB'
    },
    hintText: {
        fontSize: 12,
        color: '#9CA3AF',
        fontStyle: 'italic'
    },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
    emptyText: { color: '#9CA3AF', marginTop: 16, fontSize: 16 },
});

export default EmployeeTasksScreen;
