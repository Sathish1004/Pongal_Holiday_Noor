import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, FlatList, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useNavigation } from '@react-navigation/native';

const CompletedTasksScreen = () => {
    const navigation = useNavigation();
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCompletedTasks();
    }, []);

    const fetchCompletedTasks = async () => {
        try {
            const response = await api.get('/tasks/assigned?status=completed');
            setTasks(response.data.tasks || []);
        } catch (error) {
            console.error('Error fetching completed tasks:', error);
            Alert.alert('Error', 'Failed to load completed tasks');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.taskCard}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: '#d1fae5' }]}>
                    <Ionicons name="checkmark-done" size={20} color="#059669" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.taskName}>{item.name}</Text>
                    <Text style={styles.projectName}>{item.site_name || 'Unknown Project'}</Text>
                </View>
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Completed</Text>
                </View>
            </View>
            <View style={styles.cardFooter}>
                <Text style={styles.dateText}>Completed: {formatDate(item.updated_at)}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Completed Tasks</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={tasks}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="documents-outline" size={48} color="#9ca3af" />
                        <Text style={styles.emptyText}>No completed tasks found.</Text>
                    </View>
                }
                refreshing={loading}
                onRefresh={fetchCompletedTasks}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
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
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    taskCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    taskName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    projectName: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    statusBadge: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#059669',
        fontSize: 12,
        fontWeight: '600',
    },
    cardFooter: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    dateText: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'right',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 12,
        color: '#6B7280',
        fontSize: 14,
    },
});

export default CompletedTasksScreen;
