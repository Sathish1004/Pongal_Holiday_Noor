import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, StyleSheet, StatusBar, TextInput, Modal, Alert } from 'react-native';
import api from '../services/api';

interface Task {
    id: number;
    name: string;
    description: string;
    site_name: string;
    site_location: string;
    phase_name: string;
    employee_name: string;
    start_date: string;
    due_date: string;
    amount: number;
    status: string;
}

interface Site { id: number; name: string; }
interface Phase { id: number; name: string; site_id: number; }
interface Employee { id: number; name: string; }

const TaskManagementScreen = ({ navigation }: any) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [phases, setPhases] = useState<Phase[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedSite, setSelectedSite] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        name: '', description: '', siteId: '', phaseId: '', employeeId: '',
        startDate: '', dueDate: '', amount: ''
    });

    useEffect(() => {
        fetchTasks();
        fetchSites();
        fetchEmployees();
    }, []);

    const fetchTasks = async () => {
        try {
            const res = await api.get('/tasks');
            setTasks(res.data.tasks || []);
        } catch (e) { console.log('Error:', e); }
    };

    const fetchSites = async () => {
        try {
            const res = await api.get('/sites');
            setSites(res.data.sites || []);
        } catch (e) { console.log('Error:', e); }
    };

    const fetchPhases = async (siteId: number) => {
        try {
            const res = await api.get(`/sites/${siteId}/phases`);
            setPhases(res.data.phases || []);
        } catch (e) { console.log('Error:', e); }
    };

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/employees');
            setEmployees(res.data.employees || []);
        } catch (e) { console.log('Error:', e); }
    };

    const handleSiteChange = (siteId: string) => {
        setFormData({ ...formData, siteId, phaseId: '' });
        if (siteId) {
            fetchPhases(parseInt(siteId));
            setSelectedSite(parseInt(siteId));
        } else {
            setPhases([]);
            setSelectedSite(null);
        }
    };

    const openModal = () => {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        setFormData({
            name: '', description: '', siteId: '', phaseId: '', employeeId: '',
            startDate: today.toISOString().split('T')[0],
            dueDate: nextWeek.toISOString().split('T')[0],
            amount: ''
        });
        setPhases([]);
        setSelectedSite(null);
        setShowModal(true);
    };

    const handleCreate = async () => {
        if (!formData.name) {
            Alert.alert('Error', 'Please enter task name');
            return;
        }

        try {
            await api.post('/tasks', {
                name: formData.name,
                description: formData.description,
                siteId: formData.siteId ? parseInt(formData.siteId) : null,
                phaseId: formData.phaseId ? parseInt(formData.phaseId) : null,
                employeeId: formData.employeeId ? parseInt(formData.employeeId) : null,
                startDate: formData.startDate,
                dueDate: formData.dueDate,
                amount: formData.amount ? parseFloat(formData.amount) : 0
            });
            setShowModal(false);
            fetchTasks();
            Alert.alert('Success', 'Task created successfully');
        } catch (e) {
            Alert.alert('Error', 'Failed to create task');
        }
    };

    const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'TBD';
    const formatAmount = (a: number) => a ? `₹${a.toLocaleString('en-IN')}` : '—';

    const getStatusColor = (s: string) => {
        if (s === 'completed') return { bg: '#dcfce7', text: '#16a34a' };
        if (s === 'delayed') return { bg: '#fef2f2', text: '#dc2626' };
        if (s === 'in_progress') return { bg: '#dbeafe', text: '#2563eb' };
        return { bg: '#fef3c7', text: '#d97706' };
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Task Management</Text>
                <TouchableOpacity onPress={openModal} style={styles.addBtn}>
                    <Text style={styles.addBtnText}>+ New Task</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
                {tasks.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyIcon}>📋</Text>
                        <Text style={styles.emptyText}>No tasks yet</Text>
                        <Text style={styles.emptySub}>Tap "+ New Task" to create</Text>
                    </View>
                ) : (
                    tasks.map((task) => {
                        const sc = getStatusColor(task.status);
                        return (
                            <View key={task.id} style={styles.taskCard}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.taskName}>{task.name}</Text>
                                    <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                                        <Text style={[styles.badgeText, { color: sc.text }]}>{task.status?.toUpperCase()}</Text>
                                    </View>
                                </View>
                                {task.description && <Text style={styles.taskDesc}>{task.description}</Text>}
                                <View style={styles.metaRow}>
                                    {task.site_name && <Text style={styles.meta}>📍 {task.site_name}</Text>}
                                    {task.phase_name && <Text style={styles.meta}>🔧 {task.phase_name}</Text>}
                                </View>
                                <View style={styles.metaRow}>
                                    {task.employee_name && <Text style={styles.meta}>👷 {task.employee_name}</Text>}
                                    <Text style={styles.meta}>📅 {formatDate(task.start_date)} → {formatDate(task.due_date)}</Text>
                                </View>
                                {task.amount > 0 && (
                                    <View style={styles.amountRow}>
                                        <Text style={styles.amountLabel}>💰 Amount:</Text>
                                        <Text style={styles.amountValue}>{formatAmount(task.amount)}</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>

            <Modal visible={showModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <ScrollView style={styles.modalScroll}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>📋 Create New Task</Text>

                            <View style={styles.field}>
                                <Text style={styles.label}>Task Name *</Text>
                                <TextInput style={styles.input} placeholder="e.g. Site Plan Drawing" placeholderTextColor="#94a3b8"
                                    value={formData.name} onChangeText={(t) => setFormData({ ...formData, name: t })} />
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.label}>Description</Text>
                                <TextInput style={[styles.input, styles.textArea]} placeholder="Task details..." placeholderTextColor="#94a3b8"
                                    value={formData.description} onChangeText={(t) => setFormData({ ...formData, description: t })}
                                    multiline numberOfLines={3} />
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.label}>🏗️ Select Site</Text>
                                <View style={styles.selectList}>
                                    {sites.map((site) => (
                                        <TouchableOpacity key={site.id}
                                            style={[styles.selectItem, formData.siteId === String(site.id) && styles.selectItemActive]}
                                            onPress={() => handleSiteChange(String(site.id))}>
                                            <Text style={[styles.selectText, formData.siteId === String(site.id) && styles.selectTextActive]}>
                                                {site.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {phases.length > 0 && (
                                <View style={styles.field}>
                                    <Text style={styles.label}>🔧 Select Phase</Text>
                                    <View style={styles.selectList}>
                                        {phases.map((phase) => (
                                            <TouchableOpacity key={phase.id}
                                                style={[styles.selectItem, formData.phaseId === String(phase.id) && styles.selectItemActive]}
                                                onPress={() => setFormData({ ...formData, phaseId: String(phase.id) })}>
                                                <Text style={[styles.selectText, formData.phaseId === String(phase.id) && styles.selectTextActive]}>
                                                    {phase.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            <View style={styles.field}>
                                <Text style={styles.label}>👷 Assign Employee</Text>
                                <View style={styles.selectList}>
                                    {employees.map((emp) => (
                                        <TouchableOpacity key={emp.id}
                                            style={[styles.selectItem, formData.employeeId === String(emp.id) && styles.selectItemActive]}
                                            onPress={() => setFormData({ ...formData, employeeId: String(emp.id) })}>
                                            <Text style={[styles.selectText, formData.employeeId === String(emp.id) && styles.selectTextActive]}>
                                                {emp.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
                                    <Text style={styles.label}>📅 Start Date</Text>
                                    <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8"
                                        value={formData.startDate} onChangeText={(t) => setFormData({ ...formData, startDate: t })} />
                                </View>
                                <View style={[styles.field, { flex: 1, marginLeft: 8 }]}>
                                    <Text style={styles.label}>🏁 Due Date</Text>
                                    <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8"
                                        value={formData.dueDate} onChangeText={(t) => setFormData({ ...formData, dueDate: t })} />
                                </View>
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.label}>💰 Amount / Cost (₹)</Text>
                                <TextInput style={styles.input} placeholder="e.g. 50000" placeholderTextColor="#94a3b8"
                                    value={formData.amount} onChangeText={(t) => setFormData({ ...formData, amount: t })}
                                    keyboardType="numeric" />
                            </View>

                            <View style={styles.btnRow}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
                                    <Text style={styles.createBtnText}>Create Task</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    backBtnText: { fontSize: 22, color: '#374151' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
    addBtn: { backgroundColor: '#22c55e', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
    addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    content: { flex: 1 },
    contentPadding: { padding: 16 },
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyIcon: { fontSize: 60, marginBottom: 16 },
    emptyText: { fontSize: 18, fontWeight: '600', color: '#64748b' },
    emptySub: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
    taskCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    taskName: { fontSize: 16, fontWeight: '700', color: '#0f172a', flex: 1 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 10, fontWeight: '700' },
    taskDesc: { fontSize: 13, color: '#64748b', marginBottom: 10 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
    meta: { fontSize: 12, color: '#94a3b8', marginRight: 16, marginBottom: 4 },
    amountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    amountLabel: { fontSize: 13, color: '#64748b' },
    amountValue: { fontSize: 15, fontWeight: '700', color: '#059669', marginLeft: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalScroll: { flex: 1, paddingTop: 30, paddingHorizontal: 16 },
    modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24, marginBottom: 40 },
    modalTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 20, textAlign: 'center' },
    field: { marginBottom: 16 },
    row: { flexDirection: 'row' },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
    input: { backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1, borderColor: '#e2e8f0', color: '#0f172a' },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    selectList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    selectItem: { backgroundColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginRight: 8, marginBottom: 8 },
    selectItemActive: { backgroundColor: '#3b82f6' },
    selectText: { fontSize: 13, color: '#374151' },
    selectTextActive: { color: '#fff', fontWeight: '600' },
    btnRow: { flexDirection: 'row', marginTop: 8 },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f1f5f9', marginRight: 8, alignItems: 'center' },
    cancelBtnText: { color: '#64748b', fontWeight: '600' },
    createBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#22c55e', marginLeft: 8, alignItems: 'center' },
    createBtnText: { color: '#fff', fontWeight: '600' },
});

export default TaskManagementScreen;
