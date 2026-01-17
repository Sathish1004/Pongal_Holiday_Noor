import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, TextInput, Alert, ActivityIndicator, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

interface Employee {
    id: number;
    name: string;
    email: string | null;
    phone: string;
    role: 'admin' | 'employee';
    status: 'Active' | 'Inactive';
    created_at: string;
    profile_image?: string;
}

const EmployeeManagementScreen = ({ navigation, route }: any) => {
    const { mode, taskId, taskName, projectName, phaseName } = route?.params || {};
    const isAssignmentMode = mode === 'ASSIGNMENT';

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState<'admin' | 'employee'>('employee');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchEmployees();
        if (isAssignmentMode && taskId) {
            fetchTaskAssignments();
        }
    }, [taskId]);

    const fetchTaskAssignments = async () => {
        try {
            const response = await api.get(`/tasks/${taskId}/details`);
            if (response.data.task && response.data.task.assignments) {
                setAssignedEmployeeIds(response.data.task.assignments.map((a: any) => a.id));
            }
        } catch (error) {
            console.error('Error fetching task assignments:', error);
        }
    };

    const fetchEmployees = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/employees');
            setEmployees(response.data.employees);
        } catch (error) {
            console.error('Error fetching employees:', error);
            Alert.alert('Error', 'Failed to load employees.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setIsEditing(false);
        setSelectedEmployeeId(null);
        setName('');
        setEmail('');
        setPhone('');
        setRole('employee');
        setPassword('');
        setStatus('Active');
        setModalVisible(true);
    };

    const handleOpenEdit = (emp: Employee) => {
        setIsEditing(true);
        setSelectedEmployeeId(emp.id);
        setName(emp.name);
        setEmail(emp.email || '');
        setPhone(emp.phone);
        setRole(emp.role);
        setPassword(''); // Don't show existing password
        setStatus(emp.status);
        setModalVisible(true);
    };

    const handleSubmit = async () => {
        // Validation
        if (!name || !phone || !role) {
            Alert.alert('Validation Error', 'Name, Phone, and Role are required.');
            return;
        }

        if (!isEditing && !password) {
            Alert.alert('Validation Error', 'Password is required for new employees.');
            return;
        }

        try {
            setIsSubmitting(true);
            const payload = {
                name,
                email: email || null,
                phone,
                role,
                status,
                password: password || undefined // Only send if provided
            };

            if (isEditing && selectedEmployeeId) {
                await api.put(`/employees/${selectedEmployeeId}`, payload);
                Alert.alert('Success', 'Employee updated successfully');
            } else {
                await api.post('/employees', payload);
                Alert.alert('Success', 'Employee created successfully');
            }

            setModalVisible(false);
            fetchEmployees();
        } catch (error: any) {
            console.error('Error saving employee:', error);
            const msg = error.response?.data?.message || 'Failed to save employee.';
            Alert.alert('Error', msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (id: number) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this employee? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/employees/${id}`);
                            Alert.alert('Success', 'Employee deleted.');
                            fetchEmployees();
                        } catch (error) {
                            console.error('Error deleting employee:', error);
                            Alert.alert('Error', 'Failed to delete employee.');
                        }
                    }
                }
            ]
        );
    };

    const handleToggleAssignment = async (employeeId: number) => {
        try {
            const response = await api.put(`/tasks/${taskId}/assign`, { employeeId });
            // Update local state based on response
            setAssignedEmployeeIds(response.data.assignments.map((a: any) => a.id));
        } catch (error) {
            console.error('Error toggling assignment:', error);
            Alert.alert('Error', 'Failed to update assignment.');
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isAssignmentMode ? 'Assign Employee' : 'Details Of Employees'}</Text>
                {!isAssignmentMode && (
                    <TouchableOpacity onPress={handleOpenCreate} style={styles.addButton}>
                        <Ionicons name="add" size={20} color="#fff" />
                        <Text style={styles.addButtonText}>Add Employee</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Assignment Banner */}
            {isAssignmentMode && (
                <View style={styles.assignmentBanner}>
                    <Text style={styles.bannerTitle}>Assigning to:</Text>
                    <Text style={styles.bannerProject}>
                        {projectName} {phaseName ? `> ${phaseName}` : ''}
                    </Text>
                    <Text style={styles.bannerTask} numberOfLines={1}>{taskName}</Text>
                </View>
            )}

            {/* List */}
            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#8B0000" />
                </View>
            ) : (
                <ScrollView style={styles.content}>
                    {employees.map((emp) => (
                        <View key={emp.id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={styles.avatar}>
                                    {emp.profile_image ? (
                                        <Image
                                            source={{ uri: `${api.defaults.baseURL?.replace('/api', '')}${emp.profile_image}` }}
                                            style={{ width: '100%', height: '100%', borderRadius: 24 }}
                                        />
                                    ) : (
                                        <Text style={styles.avatarText}>{emp.name.charAt(0).toUpperCase()}</Text>
                                    )}
                                </View>
                                <View style={styles.info}>
                                    <Text style={styles.name}>{emp.name}</Text>
                                    <View style={styles.roleContainer}>
                                        <Text style={[
                                            styles.roleText,
                                            emp.role === 'admin' ? styles.adminText : styles.empText
                                        ]}>{emp.role.toUpperCase()}</Text>
                                        <View style={[
                                            styles.statusBadge,
                                            emp.status === 'Inactive' ? styles.statusInactive : styles.statusActive
                                        ]}>
                                            <Text style={styles.statusText}>{emp.status}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.detailsRow}>
                                <View style={styles.detailItem}>
                                    <Ionicons name="call-outline" size={14} color="#6b7280" />
                                    <Text style={styles.detailText}>{emp.phone}</Text>
                                </View>
                                {emp.email && (
                                    <View style={styles.detailItem}>
                                        <Ionicons name="mail-outline" size={14} color="#6b7280" />
                                        <Text style={styles.detailText}>{emp.email}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.actions}>
                                {isAssignmentMode && (
                                    <TouchableOpacity
                                        style={[
                                            styles.assignBtn,
                                            assignedEmployeeIds.includes(emp.id) ? styles.assignedBtnActive : styles.assignBtnInactive
                                        ]}
                                        onPress={() => handleToggleAssignment(emp.id)}
                                    >
                                        <Text style={styles.assignBtnText}>
                                            {assignedEmployeeIds.includes(emp.id) ? 'Assigned' : 'Assign'}
                                        </Text>
                                        {assignedEmployeeIds.includes(emp.id) && (
                                            <Ionicons name="checkmark" size={16} color="#FFF" style={{ marginLeft: 4 }} />
                                        )}
                                    </TouchableOpacity>
                                )}

                                <View style={{ flexDirection: 'row', gap: 8, marginLeft: 8 }}>
                                    <TouchableOpacity onPress={() => handleOpenEdit(emp)} style={styles.actionBtn}>
                                        <Ionicons name="create-outline" size={20} color="#4b5563" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDelete(emp.id)} style={[styles.actionBtn, styles.deleteBtn]}>
                                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))}
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}

            {/* Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{isEditing ? 'Edit Employee' : 'Add Employee'}</Text>

                        <ScrollView>
                            <Text style={styles.label}>Name <Text style={styles.required}>*</Text></Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Full Name"
                            />

                            <Text style={styles.label}>Phone <Text style={styles.required}>*</Text></Text>
                            <TextInput
                                style={styles.input}
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="Phone Number"
                                keyboardType="phone-pad"
                            />

                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Email Address (Optional)"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            <Text style={styles.label}>Role <Text style={styles.required}>*</Text></Text>
                            <View style={styles.row}>
                                <TouchableOpacity
                                    style={[styles.radioBtn, role === 'employee' && styles.radioBtnActive]}
                                    onPress={() => setRole('employee')}
                                >
                                    <Text style={[styles.radioText, role === 'employee' && styles.radioTextActive]}>Employee</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.radioBtn, role === 'admin' && styles.radioBtnActive]}
                                    onPress={() => setRole('admin')}
                                >
                                    <Text style={[styles.radioText, role === 'admin' && styles.radioTextActive]}>Admin</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>Status</Text>
                            <View style={styles.row}>
                                <TouchableOpacity
                                    style={[styles.radioBtn, status === 'Active' && styles.radioBtnActive]}
                                    onPress={() => setStatus('Active')}
                                >
                                    <Text style={[styles.radioText, status === 'Active' && styles.radioTextActive]}>Active</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.radioBtn, status === 'Inactive' && styles.radioBtnActive]}
                                    onPress={() => setStatus('Inactive')}
                                >
                                    <Text style={[styles.radioText, status === 'Inactive' && styles.radioTextActive]}>Inactive</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>Password {isEditing && '(Leave blank to keep current)'} {!isEditing && <Text style={styles.required}>*</Text>}</Text>
                            <TextInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Password"
                                secureTextEntry
                            />
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSubmit}
                                style={[styles.saveBtn, isSubmitting && { opacity: 0.7 }]}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.saveText}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    center: {
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
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        paddingTop: 48, // Safe area
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8B0000',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
        marginLeft: 4,
    },
    content: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fef2f2',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#8B0000',
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    roleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
        marginRight: 8,
    },
    adminText: { color: '#8B0000' },
    empText: { color: '#6b7280' },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusActive: { backgroundColor: '#d1fae5' },
    statusInactive: { backgroundColor: '#f3f4f6' },
    statusText: {
        fontSize: 10,
        fontWeight: '500',
        color: '#065f46',
    },
    detailsRow: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 16,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailText: {
        fontSize: 13,
        color: '#6b7280',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f9fafb',
        paddingTop: 12,
        gap: 8,
    },
    actionBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
    },
    deleteBtn: {
        backgroundColor: '#fef2f2',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
        marginTop: 12,
    },
    required: {
        color: '#ef4444',
    },
    input: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        backgroundColor: '#fafafa',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    radioBtn: {
        flex: 1,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        alignItems: 'center',
    },
    radioBtnActive: {
        borderColor: '#8B0000',
        backgroundColor: '#fef2f2',
    },
    radioText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    radioTextActive: {
        color: '#8B0000',
        fontWeight: '600',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    cancelBtn: {
        flex: 1,
        padding: 14,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelText: {
        color: '#374151',
        fontWeight: '600',
    },
    saveBtn: {
        flex: 1,
        padding: 14,
        backgroundColor: '#8B0000',
        borderRadius: 8,
        alignItems: 'center',
    },
    saveText: {
        color: '#fff',
        fontWeight: '600',
    },
    // Assignment Styles
    assignmentBanner: {
        backgroundColor: '#FEF2F2',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#FEE2E2',
    },
    bannerTitle: {
        fontSize: 12,
        color: '#7F1D1D',
        fontWeight: '600',
        marginBottom: 2
    },
    bannerProject: {
        fontSize: 14,
        color: '#991B1B',
        fontWeight: 'bold'
    },
    bannerTask: {
        fontSize: 13,
        color: '#B91C1C',
    },
    assignBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    assignBtnInactive: {
        backgroundColor: '#8B0000',
    },
    assignedBtnActive: {
        backgroundColor: '#10B981',
    },
    assignBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
    }
});

export default EmployeeManagementScreen;
