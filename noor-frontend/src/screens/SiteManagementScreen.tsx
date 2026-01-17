import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, StyleSheet, StatusBar, TextInput, Modal, Alert } from 'react-native';
import api from '../services/api';

interface Site {
    id: number;
    name: string;
    location: string;
    start_date: string;
    end_date: string;
    duration: string;
    status: string;
    phase_count?: number;
    task_count?: number;
}

interface Employee {
    id: number;
    name: string;
    email: string;
}

const SiteManagementScreen = ({ navigation, route }: any) => {
    const { hideAction } = route.params || {};
    const [sites, setSites] = useState<Site[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        startDate: '',
        endDate: '',
        duration: ''
    });

    useEffect(() => {
        fetchSites();
        fetchEmployees();
    }, []);

    const fetchSites = async () => {
        try {
            const response = await api.get('/sites');
            setSites(response.data.sites || []);
        } catch (error) {
            console.log('Error fetching sites:', error);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await api.get('/employees');
            setEmployees(response.data.employees || []);
        } catch (error) {
            console.log('Error fetching employees:', error);
        }
    };

    const toggleEmployee = (id: number) => {
        setSelectedEmployees(prev =>
            prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
        );
    };

    const openModal = () => {
        const today = new Date();
        const threeMonths = new Date();
        threeMonths.setMonth(threeMonths.getMonth() + 3);

        setFormData({
            name: '',
            location: '',
            startDate: today.toISOString().split('T')[0],
            endDate: threeMonths.toISOString().split('T')[0],
            duration: '3 months'
        });
        setSelectedEmployees([]);
        setShowModal(true);
    };

    const handleCreate = async () => {
        if (!formData.name || !formData.location) {
            Alert.alert('Error', 'Please fill Site Name and Location');
            return;
        }

        try {
            await api.post('/sites', {
                ...formData,
                assignedEmployees: selectedEmployees
            });
            setShowModal(false);
            fetchSites();
            Alert.alert('Success', 'Site created with default phases:\n• Planning & Site Preparation\n• Foundation\n• Structure\n• Finishing');
        } catch (error) {
            Alert.alert('Error', 'Failed to create site');
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'TBD';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Site Management</Text>
                {!hideAction && (
                    <TouchableOpacity onPress={openModal} style={styles.addBtn}>
                        <Text style={styles.addBtnText}>+ New Site</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
                {sites.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyIcon}>🏗️</Text>
                        <Text style={styles.emptyText}>No construction sites yet</Text>
                        <Text style={styles.emptySub}>Tap "+ New Site" to add your first site</Text>
                    </View>
                ) : (
                    sites.map((site) => (
                        <TouchableOpacity key={site.id} style={styles.siteCard}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.siteName}>{site.name}</Text>
                                <View style={[styles.badge, { backgroundColor: site.status === 'active' ? '#dcfce7' : '#fef3c7' }]}>
                                    <Text style={[styles.badgeText, { color: site.status === 'active' ? '#16a34a' : '#d97706' }]}>
                                        {site.status?.toUpperCase()}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.siteLocation}>📍 {site.location}</Text>
                            <View style={styles.dateRow}>
                                <Text style={styles.dateText}>📅 {formatDate(site.start_date)} → {formatDate(site.end_date)}</Text>
                            </View>
                            <View style={styles.statsRow}>
                                <View style={styles.stat}>
                                    <Text style={styles.statNum}>{site.phase_count || 4}</Text>
                                    <Text style={styles.statLabel}>Phases</Text>
                                </View>
                                <View style={styles.stat}>
                                    <Text style={styles.statNum}>{site.task_count || 0}</Text>
                                    <Text style={styles.statLabel}>Tasks</Text>
                                </View>
                                <View style={styles.stat}>
                                    <Text style={styles.statNum}>{site.duration || '—'}</Text>
                                    <Text style={styles.statLabel}>Duration</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            <Modal visible={showModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <ScrollView style={styles.modalScroll}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>🏗️ Create New Site</Text>

                            <View style={styles.field}>
                                <Text style={styles.label}>Site Name *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Main Block Crescent"
                                    placeholderTextColor="#94a3b8"
                                    value={formData.name}
                                    onChangeText={(t) => setFormData({ ...formData, name: t })}
                                />
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.label}>Location *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Chennai, Vandalore"
                                    placeholderTextColor="#94a3b8"
                                    value={formData.location}
                                    onChangeText={(t) => setFormData({ ...formData, location: t })}
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
                                    <Text style={styles.label}>📅 Start Date</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#94a3b8"
                                        value={formData.startDate}
                                        onChangeText={(t) => setFormData({ ...formData, startDate: t })}
                                    />
                                </View>
                                <View style={[styles.field, { flex: 1, marginLeft: 8 }]}>
                                    <Text style={styles.label}>🏁 End Date</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#94a3b8"
                                        value={formData.endDate}
                                        onChangeText={(t) => setFormData({ ...formData, endDate: t })}
                                    />
                                </View>
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.label}>⏱️ Duration</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 3 months"
                                    placeholderTextColor="#94a3b8"
                                    value={formData.duration}
                                    onChangeText={(t) => setFormData({ ...formData, duration: t })}
                                />
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.label}>👷 Assign Employees</Text>
                                <View style={styles.empList}>
                                    {employees.map((emp) => (
                                        <TouchableOpacity
                                            key={emp.id}
                                            style={[styles.empItem, selectedEmployees.includes(emp.id) && styles.empSelected]}
                                            onPress={() => toggleEmployee(emp.id)}
                                        >
                                            <Text style={[styles.empName, selectedEmployees.includes(emp.id) && styles.empNameSelected]}>
                                                {emp.name}
                                            </Text>
                                            {selectedEmployees.includes(emp.id) && <Text style={styles.check}>✓</Text>}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.phaseInfo}>
                                <Text style={styles.phaseTitle}>📋 Default Phases (auto-created):</Text>
                                <Text style={styles.phaseItem}>1. Planning & Site Preparation</Text>
                                <Text style={styles.phaseItem}>2. Foundation</Text>
                                <Text style={styles.phaseItem}>3. Structure</Text>
                                <Text style={styles.phaseItem}>4. Finishing</Text>
                            </View>

                            <View style={styles.btnRow}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
                                    <Text style={styles.createBtnText}>Create Site</Text>
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
    addBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
    addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    content: { flex: 1 },
    contentPadding: { padding: 16 },
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyIcon: { fontSize: 60, marginBottom: 16 },
    emptyText: { fontSize: 18, fontWeight: '600', color: '#64748b' },
    emptySub: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
    siteCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    siteName: { fontSize: 18, fontWeight: '700', color: '#0f172a', flex: 1 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 10, fontWeight: '700' },
    siteLocation: { fontSize: 14, color: '#64748b', marginBottom: 8 },
    dateRow: { marginBottom: 12 },
    dateText: { fontSize: 13, color: '#94a3b8' },
    statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
    stat: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: 18, fontWeight: '700', color: '#3b82f6' },
    statLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalScroll: { flex: 1, paddingTop: 40, paddingHorizontal: 16 },
    modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24, marginBottom: 40 },
    modalTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 20, textAlign: 'center' },
    field: { marginBottom: 16 },
    row: { flexDirection: 'row' },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
    input: { backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1, borderColor: '#e2e8f0', color: '#0f172a' },
    empList: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
    empItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    empSelected: { backgroundColor: '#dbeafe' },
    empName: { fontSize: 14, color: '#374151' },
    empNameSelected: { color: '#2563eb', fontWeight: '600' },
    check: { color: '#2563eb', fontWeight: '700' },
    phaseInfo: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, marginBottom: 16 },
    phaseTitle: { fontSize: 13, fontWeight: '700', color: '#166534', marginBottom: 8 },
    phaseItem: { fontSize: 12, color: '#16a34a', marginBottom: 4 },
    btnRow: { flexDirection: 'row', marginTop: 8 },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f1f5f9', marginRight: 8, alignItems: 'center' },
    cancelBtnText: { color: '#64748b', fontWeight: '600' },
    createBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#3b82f6', marginLeft: 8, alignItems: 'center' },
    createBtnText: { color: '#fff', fontWeight: '600' },
});

export default SiteManagementScreen;
