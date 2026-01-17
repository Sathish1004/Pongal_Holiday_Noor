import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Image, KeyboardAvoidingView, Platform, Alert, FlatList, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const EmployeeTaskDetailScreen = ({ route, navigation }: any) => {
    const { taskId } = route.params;
    const { user } = useContext(AuthContext);
    const [task, setTask] = useState<any>(null);
    const [updates, setUpdates] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [todos, setTodos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'updates' | 'chat'>('updates');

    // Inputs
    const [messageText, setMessageText] = useState('');
    const [progressNote, setProgressNote] = useState('');
    const [progressValue, setProgressValue] = useState('');
    const [todoContent, setTodoContent] = useState('');

    const [showUpdateForm, setShowUpdateForm] = useState(false);

    // Image Upload State
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        fetchTaskDetails();
    }, [taskId]);

    useEffect(() => {
        if (activeTab === 'chat' && flatListRef.current && messages.length > 0) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages, activeTab]);

    const fetchTaskDetails = async () => {
        try {
            const response = await api.get(`/tasks/${taskId}/details`);
            setTask(response.data.task);
            setUpdates(response.data.updates);
            setMessages(response.data.messages);
            setTodos(response.data.todos);
        } catch (error) {
            console.error('Error fetching task details:', error);
            Alert.alert('Error', 'Failed to load task details');
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images, // Restricted to images for now as per req
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled) {
                setSelectedImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const uploadImage = async (uri: string) => {
        const formData = new FormData();
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        if (Platform.OS === 'web') {
            // For web, we need to convert the URI to a blob/file
            const response = await fetch(uri);
            const blob = await response.blob();
            const file = new File([blob], filename || 'upload.jpg', { type });
            formData.append('file', file);
        } else {
            formData.append('file', { uri, name: filename || 'upload.jpg', type } as any);
        }

        try {
            const response = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                transformRequest: (data, headers) => {
                    return data; // Prevent Axios from stringifying FormData
                }
            });
            return response.data.url;
        } catch (error) {
            console.error('Image upload failed:', error);
            throw error;
        }
    };

    const handleSendMessage = async () => {
        if (!messageText.trim() && !selectedImage) return;

        try {
            setUploading(true);
            let mediaUrl = null;

            if (selectedImage) {
                mediaUrl = await uploadImage(selectedImage);
            }

            await api.post(`/tasks/${taskId}/messages`, {
                content: messageText,
                type: mediaUrl ? 'image' : 'text',
                mediaUrl: mediaUrl
            });
            setMessageText('');
            setSelectedImage(null);
            // Optimistic update or refetch
            fetchTaskDetails();
        } catch (error) {
            console.error('Error sending message:', error);
            Alert.alert('Error', 'Failed to send message');
        } finally {
            setUploading(false);
        }
    };

    const handleAddUpdate = async () => {
        if (!progressValue || !progressNote) {
            Alert.alert('Error', 'Please enter progress percentage and a note');
            return;
        }

        const progressNum = parseInt(progressValue);
        if (isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
            Alert.alert('Error', 'Progress must be between 0 and 100');
            return;
        }

        try {
            await api.post(`/tasks/${taskId}/updates`, {
                progress: progressNum,
                note: progressNote
            });
            setShowUpdateForm(false);
            setProgressNote('');
            setProgressValue('');
            fetchTaskDetails();
            Alert.alert('Success', 'Progress updated');
        } catch (error) {
            console.error('Error adding update:', error);
            Alert.alert('Error', 'Failed to add update');
        }
    };

    const handleAddTodo = async () => {
        if (!todoContent.trim()) return;
        try {
            await api.post(`/tasks/${taskId}/todos`, { content: todoContent });
            setTodoContent('');
            fetchTaskDetails();
        } catch (error) {
            console.error('Error adding todo:', error);
        }
    };

    const toggleTodo = async (todoId: number) => {
        try {
            await api.put(`/todos/${todoId}`);
            // Optimistic update
            setTodos(prev => prev.map(t => t.id === todoId ? { ...t, is_completed: !t.is_completed } : t));
        } catch (error) {
            console.error('Error toggling todo:', error);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading Task...</Text>
            </View>
        );
    }

    if (!task) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Task not found.</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{task.name}</Text>
                <TouchableOpacity>
                    <Ionicons name="ellipsis-vertical" size={24} color="#000" />
                </TouchableOpacity>
            </View>

            {/* Split Layout: Top Half - Details */}
            <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                    <View>
                        <Text style={styles.label}>Assigned To</Text>
                        <View style={styles.assigneeBadge}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {task.assigned_employee_name ? task.assigned_employee_name.charAt(0).toUpperCase() : 'U'}
                                </Text>
                            </View>
                            <Text style={styles.assigneeName}>{task.assigned_employee_name || 'Unassigned'}</Text>
                        </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.label}>Status</Text>
                        <View style={[styles.statusBadge,
                        {
                            backgroundColor: task.status === 'completed' ? '#DCFCE7' :
                                task.status === 'waiting_for_approval' ? '#FEF9C3' : '#FEF3C7'
                        }
                        ]}>
                            <Text style={[styles.statusText,
                            {
                                color: task.status === 'completed' ? '#166534' :
                                    task.status === 'waiting_for_approval' ? '#854D0E' : '#D97706'
                            }
                            ]}>
                                {task.status === 'completed' ? 'Completed' :
                                    task.status === 'waiting_for_approval' ? 'Approval Pending' : 'Ongoing'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.datesRow}>
                    <View>
                        <Text style={styles.label}>Start Date</Text>
                        <Text style={styles.dateText}>{task.start_date ? new Date(task.start_date).toLocaleDateString() : 'N/A'}</Text>
                    </View>
                    <View>
                        <Text style={styles.label}>Due Date</Text>
                        <Text style={styles.dateText}>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</Text>
                    </View>
                </View>



                <View style={styles.todoSection}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={styles.label}>To-Do List</Text>
                        <TouchableOpacity onPress={handleAddTodo}>
                            <Ionicons name="add-circle" size={20} color="#8B0000" />
                        </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                        <TextInput
                            style={styles.todoInput}
                            placeholder="Add item..."
                            value={todoContent}
                            onChangeText={setTodoContent}
                        />
                    </View>
                    <View style={{ maxHeight: 100 }}>
                        <ScrollView nestedScrollEnabled>
                            {todos.map(todo => (
                                <TouchableOpacity key={todo.id} style={styles.todoItem} onPress={() => toggleTodo(todo.id)}>
                                    <Ionicons
                                        name={todo.is_completed ? "checkbox" : "square-outline"}
                                        size={20}
                                        color={todo.is_completed ? "#166534" : "#666"}
                                    />
                                    <Text style={[styles.todoText, todo.is_completed && styles.todoTextDone]}>
                                        {todo.content}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </View>

            {/* Split Layout: Bottom Half - Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'updates' && styles.activeTab]}
                    onPress={() => setActiveTab('updates')}
                >
                    <Text style={[styles.tabText, activeTab === 'updates' && styles.activeTabText]}>Updates</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
                    onPress={() => setActiveTab('chat')}
                >
                    <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>Chat</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.bottomContent}>
                {activeTab === 'updates' ? (
                    <View style={{ flex: 1 }}>
                        {task.status === 'waiting_for_approval' ? (
                            <View style={{ margin: 16, padding: 16, backgroundColor: '#FEF9C3', borderRadius: 8, borderWidth: 1, borderColor: '#FDE047', alignItems: 'center' }}>
                                <Ionicons name="time-outline" size={32} color="#854D0E" style={{ marginBottom: 8 }} />
                                <Text style={{ color: '#854D0E', fontWeight: 'bold', fontSize: 16 }}>Work Submitted</Text>
                                <Text style={{ color: '#A16207', textAlign: 'center', marginTop: 4 }}>Waiting for admin approval. You cannot make changes until reviewed.</Text>
                            </View>
                        ) : task.status !== 'completed' && (
                            <TouchableOpacity style={styles.addUpdateBtn} onPress={() => setShowUpdateForm(!showUpdateForm)}>
                                <Text style={styles.addUpdateBtnText}>+ Add Progress Update</Text>
                            </TouchableOpacity>
                        )}

                        {showUpdateForm && (
                            <View style={styles.updateForm}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Progress % (e.g. 50)"
                                    keyboardType="numeric"
                                    value={progressValue}
                                    onChangeText={setProgressValue}
                                />
                                <TextInput
                                    style={[styles.input, { height: 60 }]}
                                    placeholder="Note..."
                                    multiline
                                    value={progressNote}
                                    onChangeText={setProgressNote}
                                />
                                <TouchableOpacity style={styles.submitUpdateBtn} onPress={handleAddUpdate}>
                                    <Text style={styles.submitUpdateBtnText}>Submit Update</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <FlatList
                            data={updates}
                            keyExtractor={item => item.id.toString()}
                            renderItem={({ item }) => (
                                <View style={styles.updateItem}>
                                    <View style={styles.updateHeader}>
                                        <Text style={styles.updateUser}>{item.employee_name}</Text>
                                        <Text style={styles.updateTime}>{new Date(item.created_at).toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.updateBadge}>
                                        <Text style={styles.updateBadgeText}>{item.previous_progress}% → {item.new_progress}%</Text>
                                    </View>
                                    <Text style={styles.updateNote}>{item.note}</Text>
                                </View>
                            )}
                            contentContainerStyle={{ padding: 16 }}
                        />
                    </View>
                ) : (
                    /* Chat UI */
                    <View style={{ flex: 1 }}>
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={item => item.id.toString()}
                            renderItem={({ item }) => {
                                const isMe = user ? item.sender_id === user.id : false;
                                return (
                                    <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}>
                                        {!isMe && <Text style={styles.messageUser}>{item.sender_name}</Text>}

                                        {item.media_url && (
                                            <Image
                                                source={{ uri: (api.defaults.baseURL?.replace('/api', '') || '') + item.media_url }}
                                                style={styles.messageImage}
                                                resizeMode="cover"
                                            />
                                        )}

                                        {item.content ? <Text style={styles.messageText}>{item.content}</Text> : null}
                                        <Text style={styles.messageTime}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    </View>
                                );
                            }}
                            contentContainerStyle={{ padding: 16 }}
                        />
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
                            <View style={styles.chatInputContainer}>
                                <View style={styles.inputWrapper}>
                                    {selectedImage && (
                                        <View style={styles.imagePreviewContainer}>
                                            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                                            <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelectedImage(null)}>
                                                <Ionicons name="close-circle" size={24} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    <View style={styles.chatInputRow}>
                                        <TouchableOpacity style={styles.attachBtn} onPress={pickImage} disabled={uploading}>
                                            <Ionicons name="image" size={24} color="#666" />
                                        </TouchableOpacity>
                                        <TextInput
                                            style={styles.chatInput}
                                            placeholder="Type a message..."
                                            value={messageText}
                                            onChangeText={setMessageText}
                                            editable={!uploading}
                                        />
                                        <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage} disabled={uploading}>
                                            {uploading ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={20} color="#FFF" />}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
    detailsContainer: { padding: 16, backgroundColor: '#F9FAFB' },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    label: { fontSize: 12, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: 'bold' },
    assigneeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
    avatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#8B0000', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    avatarText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
    assigneeName: { fontSize: 14, fontWeight: '500', color: '#374151' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: 'bold' },
    datesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    dateText: { fontSize: 14, fontWeight: '600', color: '#111827' },
    progressContainer: { marginBottom: 16 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    progressText: { fontWeight: 'bold' },
    progressBarBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4 },
    progressBarFill: { height: 8, backgroundColor: '#10B981', borderRadius: 4 },
    todoSection: { marginTop: 8 },
    todoInput: { backgroundColor: '#FFF', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#E5E7EB', flex: 1 },
    todoItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    todoText: { marginLeft: 8, fontSize: 14, color: '#374151' },
    todoTextDone: { textDecorationLine: 'line-through', color: '#9CA3AF' },

    tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    activeTab: { borderBottomWidth: 2, borderBottomColor: '#8B0000' },
    tabText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
    activeTabText: { color: '#8B0000', fontWeight: 'bold' },
    bottomContent: { flex: 1, backgroundColor: '#F3F4F6' },
    addUpdateBtn: { margin: 16, backgroundColor: '#FFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#8B0000', alignItems: 'center', borderStyle: 'dashed' },
    addUpdateBtnText: { color: '#8B0000', fontWeight: '600' },
    updateForm: { margin: 16, marginTop: 0, padding: 16, backgroundColor: '#FFF', borderRadius: 8 },
    input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, marginBottom: 12, backgroundColor: '#FAFAFA' },
    submitUpdateBtn: { backgroundColor: '#8B0000', padding: 12, borderRadius: 8, alignItems: 'center' },
    submitUpdateBtnText: { color: '#FFF', fontWeight: 'bold' },
    updateItem: { backgroundColor: '#FFF', padding: 16, marginHorizontal: 16, marginBottom: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#10B981' },
    updateHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    updateUser: { fontWeight: 'bold', fontSize: 14 },
    updateTime: { fontSize: 12, color: '#9CA3AF' },
    updateBadge: { backgroundColor: '#ECFDF5', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 8 },
    updateBadgeText: { color: '#047857', fontSize: 12, fontWeight: '600' },
    updateNote: { color: '#374151' },

    // Chat Styles
    messageBubble: { padding: 12, borderRadius: 12, maxWidth: '80%', marginBottom: 12 },
    myMessage: { alignSelf: 'flex-end', backgroundColor: '#DCFCE7' },
    otherMessage: { alignSelf: 'flex-start', backgroundColor: '#FFF' },
    messageUser: { fontSize: 10, color: '#6B7280', marginBottom: 2 },
    messageText: { fontSize: 14, color: '#1F2937' },
    messageTime: { fontSize: 10, color: '#9CA3AF', alignSelf: 'flex-end', marginTop: 4 },

    messageImage: { width: 200, height: 150, borderRadius: 8, marginBottom: 4 },
    chatInputContainer: { padding: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
    inputWrapper: { flexDirection: 'column' },
    chatInputRow: { flexDirection: 'row', alignItems: 'center' },
    imagePreviewContainer: { flexDirection: 'row', marginBottom: 8, alignItems: 'center' },
    imagePreview: { width: 60, height: 60, borderRadius: 8, marginRight: 8 },
    removeImageBtn: { padding: 4 },
    attachBtn: { padding: 8 },
    chatInput: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 8, maxHeight: 80 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#8B0000', alignItems: 'center', justifyContent: 'center' },
});

export default EmployeeTaskDetailScreen;
