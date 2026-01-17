import React, { useState, useEffect, useContext, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, StatusBar, Alert, ScrollView, Modal, TextInput, Platform, Image, KeyboardAvoidingView
} from 'react-native';
import ConfirmationModal from '../components/ConfirmationModal';
import ImageViewerModal from '../components/ImageViewerModal';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio, Video, ResizeMode } from 'expo-av';

import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

const GalleryAudioItem = ({ uri }: { uri: string }) => {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        return () => {
            if (sound) sound.unloadAsync();
        };
    }, [sound]);

    const handlePlayPause = async () => {
        if (isLoading) return;

        if (!sound) {
            setIsLoading(true);
            try {
                const { sound: newSound, status } = await Audio.Sound.createAsync(
                    { uri },
                    { shouldPlay: true },
                    onPlaybackStatusUpdate
                );
                setSound(newSound);
                setIsPlaying(true);
                if (status.isLoaded) {
                    setDuration(status.durationMillis || 0);
                }
            } catch (error) {
                console.error("Audio load error", error);
            } finally {
                setIsLoading(false);
            }
        } else {
            if (isPlaying) {
                await sound.pauseAsync();
                setIsPlaying(false);
            } else {
                await sound.playAsync();
                setIsPlaying(true);
            }
        }
    };

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setPosition(status.positionMillis);
            setDuration(status.durationMillis || 0);
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
                setIsPlaying(false);
                sound?.setPositionAsync(0);
            }
        }
    };

    const formatTime = (millis: number) => {
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEF2F2' }}>
            <TouchableOpacity onPress={handlePlayPause} disabled={isLoading} style={{ marginBottom: 6 }}>
                {isLoading ? (
                    <ActivityIndicator size="small" color="#B91C1C" />
                ) : (
                    <Ionicons name={isPlaying ? "pause-circle" : "play-circle"} size={44} color="#B91C1C" />
                )}
            </TouchableOpacity>

            <View style={{ width: '80%', height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginBottom: 4, overflow: 'hidden' }}>
                <View style={{
                    width: `${duration > 0 ? (position / duration) * 100 : 0}%`,
                    height: '100%',
                    backgroundColor: '#B91C1C'
                }} />
            </View>

            <Text style={{ fontSize: 10, color: '#991B1B', fontWeight: '600' }}>
                {formatTime(position)} / {formatTime(duration)}
            </Text>
        </View>
    );
};



const ChatAudioItem = ({ uri, isMe }: { uri: string, isMe: boolean }) => {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        return () => {
            if (sound) sound.unloadAsync();
        };
    }, [sound]);

    const handlePlayPause = async () => {
        if (isLoading) return;

        if (!sound) {
            setIsLoading(true);
            try {
                const { sound: newSound, status } = await Audio.Sound.createAsync(
                    { uri },
                    { shouldPlay: true },
                    onPlaybackStatusUpdate
                );
                setSound(newSound);
                setIsPlaying(true);
                if (status.isLoaded) {
                    setDuration(status.durationMillis || 0);
                }
            } catch (error) {
                console.error("Audio load error", error);
            } finally {
                setIsLoading(false);
            }
        } else {
            if (isPlaying) {
                await sound.pauseAsync();
                setIsPlaying(false);
            } else {
                await sound.playAsync();
                setIsPlaying(true);
            }
        }
    };

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setPosition(status.positionMillis);
            setDuration(status.durationMillis || 0);
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
                setIsPlaying(false);
                sound?.setPositionAsync(0);
            }
        }
    };

    const formatTime = (millis: number) => {
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const styles = {
        container: {
            flexDirection: 'row' as const,
            alignItems: 'center' as const,
            backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : '#E5E7EB',
            borderRadius: 12,
            padding: 8,
            minWidth: 150
        },
        icon: isMe ? "#111827" : "#374151",
        text: {
            color: isMe ? "#111827" : "#374151",
            fontSize: 11,
            fontWeight: '600' as const,
            marginLeft: 8
        },
        progressBarConfig: {
            bg: isMe ? 'rgba(0,0,0,0.1)' : '#D1D5DB',
            fill: isMe ? '#111827' : '#374151'
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={handlePlayPause} disabled={isLoading}>
                {isLoading ? (
                    <ActivityIndicator size="small" color={styles.icon} />
                ) : (
                    <Ionicons name={isPlaying ? "pause" : "play"} size={24} color={styles.icon} />
                )}
            </TouchableOpacity>

            <View style={{ flex: 1, marginLeft: 8 }}>
                <View style={{ height: 3, backgroundColor: styles.progressBarConfig.bg, borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                    <View style={{
                        width: `${duration > 0 ? (position / duration) * 100 : 0}%`,
                        height: '100%',
                        backgroundColor: styles.progressBarConfig.fill
                    }} />
                </View>
                <Text style={styles.text}>
                    {formatTime(position)} / {formatTime(duration)}
                </Text>
            </View>
        </View>
    );
};


const StageProgressScreen = ({ route, navigation }: any) => {
    const { phaseId, taskId, siteName } = route.params || {};
    const { user } = useContext(AuthContext);

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

    // Image Viewer State
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [viewerImages, setViewerImages] = useState<{ uri: string; id: string | number }[]>([]);
    const [initialImageIndex, setInitialImageIndex] = useState(0);

    const [phase, setPhase] = useState<any>(null);
    const [todos, setTodos] = useState<any[]>([]);
    const [subTasks, setSubTasks] = useState<any[]>([]);
    const [updates, setUpdates] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Todo Input
    const [todoText, setTodoText] = useState('');

    // Chat Input
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const [mediaUri, setMediaUri] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | null>(null);
    const [recording, setRecording] = useState<Audio.Recording | undefined>(undefined);
    const [cameraVisible, setCameraVisible] = useState(false);
    // Video state removed
    const [cameraRef, setCameraRef] = useState<any>(null); // Kept if needed or remove entirely? Remove entirely.
    // Actually, remove all lines 33-36


    // Update Modal
    const [updateModalVisible, setUpdateModalVisible] = useState(false);
    const [newProgress, setNewProgress] = useState('');
    const [updateMessage, setUpdateMessage] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'chat' | 'gallery'>('chat');

    // Image Description Modal
    const [imageUploadModalVisible, setImageUploadModalVisible] = useState(false);
    const [imageDescription, setImageDescription] = useState('');
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [playbackSound, setPlaybackSound] = useState<Audio.Sound | null>(null);
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);
    const recordingInterval = useRef<any>(null);

    // Change Request Modal
    const [changeRequestModalVisible, setChangeRequestModalVisible] = useState(false);
    const [changeRequestReason, setChangeRequestReason] = useState('');

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setMediaUri(result.assets[0].uri);
            setMediaType('image');
            setImageUploadModalVisible(true); // Open modal for images
        }
    };

    const handleSendImageWithDescription = async () => {
        // Temporarily set message text to description for sending, then clear it
        // Actually, handleSendMessage uses messageText state. 
        // We should update messageText state, then call handleSendMessage, but state update is async.
        // Better: refactor handleSendMessage to accept args, or just set it and valid manually.
        // Let's refactor handleSendMessage slightly to accept optional overrides.
        await handleSendMessage(imageDescription);
        setImageUploadModalVisible(false);
        setImageDescription('');
    };



    const startRecording = async () => {
        try {
            const { granted } = await Audio.requestPermissionsAsync();
            if (!granted) return;

            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(recording);

            // Start Timer
            setRecordingDuration(0);
            recordingInterval.current = setInterval(async () => {
                setRecordingDuration(prev => {
                    if (prev >= 30) {
                        stopRecording(); // Auto stop at 30s
                        return 30;
                    }
                    return prev + 1;
                });
            }, 1000);

        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        setRecording(undefined);
        if (recordingInterval.current) {
            clearInterval(recordingInterval.current);
            recordingInterval.current = null;
        }

        await recording?.stopAndUnloadAsync();
        const uri = recording?.getURI();
        if (uri) {
            setMediaUri(uri);
            setMediaType('audio');
            setImageUploadModalVisible(true); // Open modal for audio
        }
    };

    const playPreview = async () => {
        if (!mediaUri) return;

        try {
            if (playbackSound) {
                await playbackSound.unloadAsync();
            }

            const { sound } = await Audio.Sound.createAsync(
                { uri: mediaUri },
                { shouldPlay: true }
            );

            setPlaybackSound(sound);
            setIsPlayingPreview(true);

            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setIsPlayingPreview(false);
                }
            });
        } catch (error) {
            console.error('Error playing sound', error);
            Alert.alert("Error", "Could not play audio preview");
        }
    };



    const uploadMedia = async (uri: string, type: string) => {
        try {
            const formData = new FormData();
            const mimeType = type === 'image' ? 'image/jpeg' : type === 'video' ? 'video/mp4' : 'audio/m4a';
            const ext = type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : 'm4a';

            if (Platform.OS === 'web') {
                console.log('[Web Upload] Fetching URI:', uri);
                const response = await fetch(uri);
                const blob = await response.blob();
                console.log('[Web Upload] Blob:', blob);

                // Ensure blob has correct type
                const file = new File([blob], `upload.${ext}`, { type: mimeType });
                formData.append('file', file);
            } else {
                formData.append('file', {
                    uri,
                    name: `upload.${ext}`,
                    type: mimeType
                } as any);
            }

            console.log('[Upload] Sending FormData...');
            const response = await api.post('/upload', formData, {
                headers: {
                    'Content-Type': undefined, // Forces Axios/Browser to set correct multipart/form-data with boundary
                },
                transformRequest: (data, headers) => {
                    return data; // Prevent Axios from stringifying FormData
                }
            });

            return response.data.url;
        } catch (error) {
            console.error('[Upload Error]', error);
            throw error;
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            console.log('[StageProgress] useFocusEffect triggered');
            if (!phaseId && !taskId) {
                console.warn('[StageProgress] Missing phaseId and taskId');
                Alert.alert("Error", "Invalid Context");
                navigation.goBack();
                return;
            }
            fetchData();
        }, [phaseId, taskId])
    );

    // Add fallback useEffect for Modal scenarios where focus effect might not trigger
    useEffect(() => {
        if (phaseId || taskId) {
            console.log('[StageProgress] useEffect triggered for:', { phaseId, taskId });
            fetchData();
        }
    }, [phaseId, taskId]);

    const fetchData = async () => {
        try {
            console.log('[StageProgress] fetchData started');
            if (taskId) {
                // TASK MODE
                console.log(`[StageProgress] Fetching Task Details for ID: ${taskId}`);
                const response = await api.get(`/tasks/${taskId}`);
                console.log('[StageProgress] Response received for task:', response.data?.task?.id);
                const taskData = response.data.task;

                // Set Phase Data (Partial or Derived)
                setPhase({
                    id: taskData.phase_id,
                    name: `Stage: ${taskData.phase_name || 'Details'}`,
                    site_name: taskData.site_name,
                    start_date: taskData.start_date,
                    due_date: taskData.due_date,
                    status: taskData.status,
                    progress: taskData.phase_progress // Correctly inherit Phase progress
                });

                // Isolate Task
                setSubTasks([taskData]);
                setTodos(response.data.todos || []);

                // Filter out duplicate consecutive updates
                const allUpdates = [...(response.data.updates || []), ...(response.data.phase_updates || [])];
                const uniqueUpdates = allUpdates.filter((update, index, arr) => {
                    if (index === 0) return true;
                    const prev = arr[index - 1];
                    // Remove if same message and same progress values as previous
                    return !(update.message === prev.message &&
                        update.previous_progress === prev.previous_progress &&
                        update.new_progress === prev.new_progress);
                });
                setUpdates(uniqueUpdates);

                // ONE-TASK-ONE-CHAT: All users see the same chat for this task
                // Messages are loaded purely by taskId - no filtering by user
                const taskMessages = response.data.messages || [];
                const stageMessages = response.data.stage_messages || [];

                // Combine and sort by timestamp - everyone sees the same messages
                const combinedMessages = [...taskMessages, ...stageMessages].sort((a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );

                setMessages(combinedMessages);

            } else {
                // STAGE MODE (Legacy)
                console.log(`[StageProgress] Fetching Phase Details for ID: ${phaseId}`);
                const response = await api.get(`/phases/${phaseId}/details`);

                const phaseData = response.data.phase;
                const tasks = response.data.tasks || [];

                // Derive Dates if missing on Phase
                if (!phaseData.start_date && tasks.length > 0) {
                    const sortedStarts = tasks.map((t: any) => t.start_date).filter(Boolean).sort();
                    if (sortedStarts.length > 0) phaseData.start_date = sortedStarts[0];
                }
                if (!phaseData.due_date && tasks.length > 0) {
                    const sortedDues = tasks.map((t: any) => t.due_date).filter(Boolean).sort();
                    if (sortedDues.length > 0) phaseData.due_date = sortedDues[sortedDues.length - 1];
                }

                setPhase(phaseData);
                setTodos(response.data.todos);

                // Filter tasks to show only those assigned to the current user
                const myTasks = tasks.filter((task: any) => {
                    // Check if user is assigned to this task
                    return task.assignments && task.assignments.some((a: any) => String(a.id) === String(user?.id));
                });

                // SHOW ALL TASKS FOR DEBUGGING (Temporary)
                // setSubTasks(myTasks);
                setSubTasks(tasks);

                // Filter out duplicate consecutive updates
                const allUpdates = response.data.updates || [];
                const uniqueUpdates = allUpdates.filter((update: any, index: number, arr: any[]) => {
                    if (index === 0) return true;
                    const prev = arr[index - 1];
                    // Remove if same message and same progress values as previous
                    return !(update.message === prev.message &&
                        update.previous_progress === prev.previous_progress &&
                        update.new_progress === prev.new_progress);
                });
                setUpdates(uniqueUpdates);

                // ONE-TASK-ONE-CHAT: All users see the same messages
                setMessages(response.data.messages || []);
            }
        } catch (error) {
            console.error('Error fetching details:', error);
            Alert.alert("Error", "Failed to load details");
        } finally {
            setLoading(false);
            console.log('[StageProgress] fetchData finished. loading=false');
        }
    };

    const isAdmin = user?.role === 'admin' || user?.role === 'Admin';
    // Check if user is assigned to the PHASE itself OR any task in this phase
    const isAssigned = isAdmin
        || (user?.id && phase?.assigned_to && String(phase.assigned_to) === String(user.id))
        || (subTasks && subTasks.some(t => t.assignments && t.assignments.some((a: any) => String(a.id) === String(user?.id))));

    const handleCompleteTask = async (task: any) => {
        // STRICT PERMISSION CHECK: Only Assigned Employee or Admin
        const userIsAssigned = task.assignments && task.assignments.some((a: any) => String(a.id) === String(user?.id));

        if (!isAdmin && !userIsAssigned) {
            Alert.alert("Restricted Access", `This task is restricted to assigned employees only.`);
            return;
        }

        if (task.status === 'Completed' || task.status === 'waiting_for_approval') return; // Already done or pending

        confirmAction(
            "Confirm Completion",
            "Are you sure you want to mark this task as complete?",
            async () => {
                try {
                    // Submit progress as 100% to trigger approval workflow
                    await api.post(`/tasks/${task.id}/updates`, {
                        progress: 100,
                        note: 'Task marked as completed'
                    });

                    // Optimistic update
                    setSubTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'waiting_for_approval', progress: 100 } : t));

                    Alert.alert("Success", "Task submitted for admin approval");
                } catch (error) {
                    console.error('Error completing task:', error);
                    Alert.alert("Error", "Failed to submit task for approval");
                }
            }
        );
    };

    const handleApproveTask = async (task: any) => {
        confirmAction(
            "Confirm Approval",
            "Are you sure you want to approve this completed task?",
            async () => {
                try {
                    await api.put(`/tasks/${task.id}/approve`);
                    setSubTasks((prev: any[]) => prev.map(t => t.id === task.id ? { ...t, status: 'Completed' } : t));
                    // Also update main phase/task status for UI header
                    setPhase((prev: any) => ({ ...prev, status: 'Completed' }));
                    Alert.alert("Success", "Task approved and marked as completed.");
                } catch (error) {
                    console.error('Error approving task:', error);
                    Alert.alert("Error", "Failed to approve task");
                }
            }
        );
    };

    const handleRejectTask = async (task: any) => {
        confirmAction(
            "Confirm Rejection",
            "Are you sure you want to reject this completed task?",
            async () => {
                try {
                    await api.put(`/tasks/${task.id}/reject`, { reason: 'Admin requested changes' });
                    setSubTasks((prev: any[]) => prev.map(t => t.id === task.id ? { ...t, status: 'In Progress' } : t));
                    // Also update main phase/task status for UI header
                    setPhase((prev: any) => ({ ...prev, status: 'In Progress' }));
                    Alert.alert("Success", "Changes requested. Task reverted to In Progress.");
                } catch (error) {
                    console.error('Error rejecting task:', error);
                    Alert.alert("Error", "Failed to reject task");
                }
            }
        );
    };

    const handleMarkComplete = async () => {
        const currentPhaseId = phaseId || phase?.id;
        if (!currentPhaseId) {
            Alert.alert("Error", "Phase ID not found");
            return;
        }

        // Prevent multiple submissions
        if (submitLoading) return;

        confirmAction(
            "Confirm Completion",
            "Are you sure you want to mark this task as complete?",
            async () => {
                try {
                    setSubmitLoading(true);

                    if (taskId) {
                        // TASK MODE: Complete specific task
                        await api.put(`/tasks/${taskId}/complete`);
                    } else {
                        // PHASE MODE: Complete entire phase
                        // Submit as 100% complete for approval
                        await api.post(`/phases/${currentPhaseId}/updates`, {
                            progress: 100
                        });
                    }

                    setPhase((prev: any) => ({ ...prev, status: 'waiting_for_approval', progress: 100 }));
                    Alert.alert("Success", "Work submitted for admin approval");

                } catch (error) {
                    console.error('Error marking complete:', error);
                    Alert.alert("Error", "Failed to submit for approval");
                } finally {
                    setSubmitLoading(false);
                }
            }
        );
    };

    const handleApprove = async () => {
        const currentPhaseId = phaseId || phase?.id;

        confirmAction(
            "Confirm Approval",
            "Are you sure you want to approve this completed task?",
            async () => {
                try {
                    if (taskId) {
                        // TASK MODE
                        await api.put(`/tasks/${taskId}/approve`);
                        Alert.alert("Success", "Task approved and marked as completed");
                    } else {
                        // PHASE MODE
                        if (!currentPhaseId) {
                            Alert.alert("Error", "Phase ID not found");
                            return;
                        }
                        await api.put(`/phases/${currentPhaseId}/approve`);
                        Alert.alert("Success", "Phase approved and marked as completed");
                    }

                    // Common Success State Update
                    setPhase((prev: any) => ({ ...prev, status: 'Completed', progress: 100 }));
                    // Also update all subtasks to completed if needed/visual
                    fetchData();

                } catch (error) {
                    console.error('Error approving:', error);
                    Alert.alert("Error", "Failed to approve");
                }
            }
        );
    };

    const handleReject = () => {
        setChangeRequestModalVisible(true);
    };

    const submitReject = async () => {
        const currentPhaseId = phaseId || phase?.id;

        if (!changeRequestReason.trim()) {
            Alert.alert("Required", "Please enter a reason for requesting changes");
            return;
        }

        try {
            if (taskId) {
                // TASK MODE
                await api.put(`/tasks/${taskId}/reject`, { reason: changeRequestReason });
                Alert.alert("Success", "Changes requested. Task reverted to In Progress.");
            } else {
                // PHASE MODE
                if (!currentPhaseId) return;
                await api.put(`/phases/${currentPhaseId}/reject`, { reason: changeRequestReason });
                Alert.alert("Success", "Changes requested. Phase sent back for revisions");
            }

            // Common Success State Update
            setPhase((prev: any) => ({ ...prev, status: 'in_progress', progress: 0 }));
            setChangeRequestModalVisible(false);
            setChangeRequestReason('');
            fetchData();

        } catch (error) {
            console.error('Error rejecting:', error);
            Alert.alert("Error", "Failed to request changes");
        }
    };

    const handleAddTodo = async () => {
        if (!isAssigned) {
            Alert.alert("Action Restricted", "You must assign an employee to add todos.");
            return;
        }
        if (!todoText.trim()) return;
        try {
            await api.post(`/phases/${phaseId}/todos`, { content: todoText });
            setTodoText('');
            fetchData();
        } catch (error) {
            console.error('Error adding todo:', error);
        }
    };

    const handleToggleTodo = async (todoId: number) => {
        if (!isAssigned) {
            Alert.alert("Action Restricted", "You must assign an employee to update todos.");
            return;
        }
        try {
            await api.put(`/phases/todos/${todoId}/toggle`);
            // Optimistic update
            setTodos(prev => prev.map(t => t.id === todoId ? { ...t, is_completed: !t.is_completed } : t));
        } catch (error) {
            console.error('Error toggling todo:', error);
        }
    };




    const handleSubmitUpdate = async () => {
        if (!newProgress || !updateMessage.trim()) {
            Alert.alert("Error", "Please enter progress percentage and a message");
            return;
        }

        const prog = parseInt(newProgress);
        if (isNaN(prog) || prog < 0 || prog > 100) {
            Alert.alert("Error", "Progress must be between 0 and 100");
            return;
        }

        try {
            setSubmitLoading(true);
            await api.post(`/phases/${phaseId}/updates`, {
                progress: prog,
                message: updateMessage
            });

            // Optimistic Update
            setPhase((prev: any) => ({
                ...prev,
                progress: prog,
                status: prog === 100 ? 'waiting_for_approval' : (prog === 0 ? 'not_started' : 'in_progress')
            }));

            setUpdateModalVisible(false);
            setNewProgress('');
            setUpdateMessage('');
            fetchData();
        } catch (error) {
            console.error('Error adding update:', error);
            Alert.alert("Error", "Failed to submit update");
        } finally {
            setSubmitLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B0000" />
            </SafeAreaView>
        );
    }



    const handleSendMessage = async (customContent?: string) => {
        console.log('[StageProgress] handleSendMessage called', { customContent, messageText });
        const contentToSend = customContent !== undefined ? customContent : messageText;
        if (!contentToSend.trim() && !mediaUri && !recording) {
            console.log('[StageProgress] Nothing to send');
            return;
        }

        try {
            setSending(true);
            let uploadedUrl = null;
            if (mediaUri && mediaType) {
                console.log('[StageProgress] Uploading media...');
                uploadedUrl = await uploadMedia(mediaUri, mediaType);
            }

            const payload = {
                content: contentToSend,
                type: mediaType || 'text',
                mediaUrl: uploadedUrl
            };
            console.log('[StageProgress] Sending payload:', payload);

            if (taskId) {
                // TASK Chat
                console.log(`[StageProgress] POST /tasks/${taskId}/messages`);
                await api.post(`/tasks/${taskId}/messages`, payload);
            } else {
                // STAGE Chat
                console.log(`[StageProgress] POST /phases/${phaseId}/messages`);
                await api.post(`/phases/${phaseId}/messages`, payload);
            }
            console.log('[StageProgress] Message Sent Successfully');

            setMessageText('');
            setMediaUri(null);
            setMediaType(null);

            // Refresh
            await fetchData();
        } catch (error) {
            console.error('Error sending message:', error);
            Alert.alert("Error", "Failed to send message");
        } finally {
            setSending(false);
        }
    };

    // ... (rest of code)





    const getStatusColor = (status: string) => {
        if (status === 'Completed' || status === 'achieved' || status === 'Approved') return '#10B981'; // Green
        if (status === 'waiting_for_approval') return '#F59E0B'; // Yellow
        if (status === 'delayed' || status === 'change_required') return '#EF4444'; // Red
        if (status === 'Not Started' || status === 'not_started' || status === 'pending') return '#9CA3AF'; // Gray
        return '#3B82F6'; // Blue (In Progress)
    };

    const displayStatus = (status: string) => {
        if (status === 'waiting_for_approval') return 'Waiting for Approval';
        if (status === 'Completed' || status === 'Approved') return 'Completed';
        if (status === 'achieved') return 'Completed';
        if (status === 'change_required') return 'Change Required';
        if (status === 'Not Started' || status === 'not_started' || status === 'pending') return 'Not Started';
        return status?.replace('_', ' ') || 'In Progress';
    };

    const handleImageClick = (imageUrl: string) => {
        // Collect all images from the current feed (messages + updates if they have images)
        // For now, simpler to just filter from 'messages' state as updates typically don't have user images yet
        // If updates eventually have images, combine them.

        const allImagesInChat = messages
            .filter(m => m.type === 'image' && m.media_url)
            .map(m => ({
                id: m.id,
                uri: (api.defaults.baseURL?.replace('/api', '') || '') + m.media_url
            }));

        // Find index of clicked image
        const fullUri = (api.defaults.baseURL?.replace('/api', '') || '') + imageUrl;
        const index = allImagesInChat.findIndex(img => img.uri === fullUri);

        if (index !== -1) {
            setViewerImages(allImagesInChat);
            setInitialImageIndex(index);
            setImageViewerVisible(true);
        }
    };

    const renderFeed = () => {
        const feed = [
            ...updates.map(u => ({ ...u, itemType: 'update' })),
            ...messages.map(m => ({ ...m, itemType: 'message' }))
        ]
            .filter(item => {
                // Filter out "Work completed" messages and generic updates
                if (item.message && item.message.includes('Work completed - Ready for admin approval')) return false;
                if (item.content && item.content.includes('Work completed - Ready for admin approval')) return false;
                // Also filter out generic auto-generated updates if wanted
                if (item.itemType === 'update' && item.message === 'Progress Update') return false;
                return true;
            })
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        if (feed.length === 0) {
            return <Text style={styles.emptyTextSimple}>No activity yet</Text>;
        }

        return feed.map((item, idx) => {
            if (item.itemType === 'update') {
                return (
                    <View key={`u-${idx}`} style={styles.updateCard}>
                        <View style={styles.updateHeader}>
                            <Text style={styles.updateUser}>{item.employee_name || 'Employee'}</Text>
                            <Text style={styles.updateTime}>{new Date(item.created_at).toLocaleString()}</Text>
                        </View>
                        <View style={styles.progressChangeBadge}>
                            <Text style={styles.progressChangeText}>
                                {item.previous_progress}% → {item.new_progress}%
                            </Text>
                        </View>
                        <Text style={styles.updateMessage}>{item.message}</Text>
                    </View>
                );
            } else {
                const isMe = user && item.sender_id === user.id;
                return (
                    <View key={`m-${idx}`} style={[
                        styles.messageBubble,
                        isMe ? styles.myMessage : styles.otherMessage
                    ]}>
                        {!isMe && <Text style={styles.senderName}>{item.sender_name}</Text>}

                        {item.media_url ? (
                            <View>
                                <View style={{ borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                                    {item.type === 'image' && (
                                        <TouchableOpacity onPress={() => handleImageClick(item.media_url)}>
                                            <Image
                                                source={{ uri: (api.defaults.baseURL?.replace('/api', '') || '') + item.media_url }}
                                                style={{ width: 220, height: 220, backgroundColor: '#EEE' }}
                                                resizeMode="cover"
                                            />
                                        </TouchableOpacity>
                                    )}
                                    {item.type === 'video' && (
                                        <Video
                                            source={{ uri: (api.defaults.baseURL?.replace('/api', '') || '') + item.media_url }}
                                            style={{ width: 220, height: 220, backgroundColor: '#000' }}
                                            useNativeControls
                                            resizeMode={ResizeMode.CONTAIN}
                                            isLooping={false}
                                        />
                                    )}

                                    {item.content ? (
                                        <View style={{
                                            position: 'absolute', bottom: 0, left: 0, right: 0,
                                            backgroundColor: 'rgba(0,0,0,0.5)', padding: 8
                                        }}>
                                            <Text style={{ color: '#FFF', fontSize: 13 }}>{item.content}</Text>
                                        </View>
                                    ) : null}
                                </View>

                                {item.type === 'audio' && (
                                    <View style={{ marginTop: 4 }}>
                                        <ChatAudioItem
                                            uri={(api.defaults.baseURL?.replace('/api', '') || '') + item.media_url}
                                            isMe={!!isMe}
                                        />
                                    </View>
                                )}
                            </View>
                        ) : (
                            item.content ? (
                                <Text style={isMe ? styles.myMessageText : styles.otherMessageText}>
                                    {item.content}
                                </Text>
                            ) : null
                        )}

                        <Text style={styles.messageTime}>
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                );
            }
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{phase?.name || 'Stage Progress'}</Text>

                {/* HEADER ACTION BUTTONS */}
                {
                    // 1. ADMIN ACTIONS (Only when waiting for approval)
                    isAdmin && phase?.status === 'waiting_for_approval' ? (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                style={{ backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
                                onPress={handleApprove}
                            >
                                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>✓ Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
                                onPress={handleReject}
                            >
                                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>✗ Changes</Text>
                            </TouchableOpacity>
                        </View>
                    ) :
                        // 2. EMPLOYEE: APPROVED STATE (Disabled & Light Color)
                        (!isAdmin && (phase?.status === 'Completed' || phase?.status === 'completed' || phase?.status === 'Approved')) ? (
                            <TouchableOpacity
                                disabled={true}
                                style={{
                                    backgroundColor: '#D1FAE5', // Very light green
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 20,
                                    borderWidth: 1,
                                    borderColor: '#10B981',
                                    opacity: 0.7
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                                    <Text style={{ color: '#059669', fontWeight: '700', fontSize: 12 }}>Approved</Text>
                                </View>
                            </TouchableOpacity>
                        ) :
                            // 3. EMPLOYEE: WAITING FOR APPROVAL (Disabled & Light Gray)
                            (!isAdmin && phase?.status === 'waiting_for_approval') ? (
                                <TouchableOpacity
                                    disabled={true}
                                    style={{
                                        backgroundColor: '#F3F4F6', // Light Gray
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 20,
                                        borderWidth: 1,
                                        borderColor: '#D1D5DB'
                                    }}
                                >
                                    <Text style={{ color: '#6B7280', fontWeight: '700', fontSize: 12 }}>
                                        Waiting for Approval
                                    </Text>
                                </TouchableOpacity>
                            ) :
                                // 4. EMPLOYEE: ACTIVE STATE (In Progress / Change Required / Not Started)
                                (!isAdmin) ? (
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: submitLoading ? '#9CA3AF' : '#8B0000',
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            borderRadius: 20,
                                            opacity: submitLoading ? 0.6 : 1
                                        }}
                                        onPress={handleMarkComplete}
                                        disabled={submitLoading}
                                    >
                                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>
                                            {submitLoading ? 'Submitting...' : 'Mark Complete'}
                                        </Text>
                                    </TouchableOpacity>
                                ) :
                                    // 5. Default Admin View (Ellipsis)
                                    (
                                        <View style={{ flexDirection: 'row', gap: 12 }}>
                                            <TouchableOpacity>
                                                <Ionicons name="notifications-outline" size={24} color="#374151" />
                                            </TouchableOpacity>
                                            <TouchableOpacity>
                                                <Ionicons name="ellipsis-vertical" size={24} color="#374151" />
                                            </TouchableOpacity>
                                        </View>
                                    )
                }
                {/* END HEADER ACTION BUTTONS */}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Assigned Section */}
                <View style={styles.sectionCard}>
                    {/* Waiting for Approval Banner */}
                    {phase?.status === 'waiting_for_approval' && (
                        <View style={{
                            backgroundColor: '#FEF3C7',
                            padding: 12,
                            borderRadius: 8,
                            marginBottom: 12,
                            borderLeftWidth: 4,
                            borderLeftColor: '#F59E0B'
                        }}>
                            <Text style={{ color: '#92400E', fontWeight: '600', fontSize: 14 }}>
                                {isAdmin ? '⏳ Review Required' : '⏳ Submitted for Admin Approval'}
                            </Text>
                            <Text style={{ color: '#78350F', fontSize: 12, marginTop: 4 }}>
                                {isAdmin
                                    ? 'This stage has been completed and is waiting for your approval.'
                                    : 'Your work has been submitted and is waiting for admin review.'}
                            </Text>
                        </View>
                    )}

                    <View style={styles.assignedRow}>
                        {/* Phase Header - Removed Assignment Badge */}
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(phase?.status) + '20', alignSelf: 'flex-start' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(phase?.status) }]}>
                                {displayStatus(phase?.status)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.datesRow}>
                        <View>
                            <Text style={styles.label}>START DATE</Text>
                            <Text style={styles.value}>{phase?.start_date ? new Date(phase.start_date).toLocaleDateString() : 'N/A'}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.label}>DUE DATE</Text>
                            <Text style={styles.value}>{phase?.due_date ? new Date(phase.due_date).toLocaleDateString() : 'N/A'}</Text>
                        </View>
                    </View>


                </View>

                {/* Subtasks (Required Tasks) */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>STAGE TASKS</Text>
                    {subTasks.map((task, index) => {
                        const userIsAssigned = task.assignments && task.assignments.some((a: any) => a.id === user?.id);
                        const canComplete = isAdmin || userIsAssigned;

                        return (
                            <TouchableOpacity
                                key={index}
                                style={styles.todoItem}
                                onPress={() => {
                                    // Navigate to task-specific detail screen
                                    navigation.navigate('StageProgress', {
                                        taskId: task.id,
                                        siteName: phase?.site_name || siteName
                                    });
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.todoText, task.status === 'Completed' && styles.todoTextDone]}>
                                        {task.name}
                                    </Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                        {task.assignments && task.assignments.length > 0 ? (
                                            task.assignments.map((assignee: any) => (
                                                <View key={assignee.id} style={{
                                                    backgroundColor: '#EFF6FF',
                                                    paddingHorizontal: 6,
                                                    paddingVertical: 2,
                                                    borderRadius: 4,
                                                }}>
                                                    <Text style={{ color: '#1E40AF', fontSize: 10, fontWeight: '500' }}>
                                                        {assignee.name}
                                                    </Text>
                                                </View>
                                            ))
                                        ) : (
                                            <Text style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>Unassigned</Text>
                                        )}
                                    </View>
                                </View>

                                {/* Task Action Button / Status Badge */}
                                {
                                    // 1. Admin Actions (Approve/Reject)
                                    isAdmin && task.status === 'waiting_for_approval' ? (
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <TouchableOpacity
                                                style={{ backgroundColor: '#FEE2E2', padding: 8, borderRadius: 20, borderWidth: 1, borderColor: '#EF4444' }}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    handleRejectTask(task);
                                                }}
                                            >
                                                <Ionicons name="close" size={16} color="#EF4444" />
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={{ backgroundColor: '#D1FAE5', padding: 8, borderRadius: 20, borderWidth: 1, borderColor: '#10B981' }}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    handleApproveTask(task);
                                                }}
                                            >
                                                <Ionicons name="checkmark" size={16} color="#10B981" />
                                            </TouchableOpacity>
                                        </View>
                                    ) :
                                        // 2. Waiting Badge
                                        task.status === 'waiting_for_approval' ? (
                                            <View style={{
                                                backgroundColor: '#FEF3C7',
                                                paddingHorizontal: 12,
                                                paddingVertical: 6,
                                                borderRadius: 20,
                                                borderWidth: 1,
                                                borderColor: '#F59E0B'
                                            }}>
                                                <Text style={{ color: '#92400E', fontWeight: '700', fontSize: 10 }}>Waiting</Text>
                                            </View>
                                        ) :
                                            // 3. Completed/Approved Badge
                                            task.status === 'Completed' || task.status === 'Approved' ? (
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                                </View>
                                            ) :
                                                // 4. Mark Complete Button (Default)
                                                (
                                                    <TouchableOpacity
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            handleCompleteTask(task);
                                                        }}
                                                        style={{
                                                            backgroundColor: canComplete ? '#10B981' : '#E5E7EB',
                                                            paddingHorizontal: 12,
                                                            paddingVertical: 6,
                                                            borderRadius: 20
                                                        }}
                                                        disabled={!canComplete}
                                                    >
                                                        <Text style={{
                                                            color: canComplete ? '#FFF' : '#9CA3AF',
                                                            fontWeight: '700',
                                                            fontSize: 12
                                                        }}>
                                                            Done
                                                        </Text>
                                                    </TouchableOpacity>
                                                )
                                }
                            </TouchableOpacity>
                        );
                    })}
                    {subTasks.length === 0 && <Text style={styles.emptyTextSimple}>No tasks defined</Text>}
                </View>



                {/* Unified Activity Feed */}
                <View style={styles.feedContainer}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Text style={styles.sectionTitle}>ACTIVITY & UPDATES</Text>
                    </View>

                    {renderFeed()}
                </View>

            </ScrollView>

            {/* Bottom Input Area or Unassigned Banner */}
            {/* Show Input if User is Admin OR Assigned to at least one task */}
            {/* Show Input for any logged in user (Admin or Employee) */}
            {
                (user) ? (
                    <>
                        {mediaUri && (
                            <View style={styles.mediaPreview}>
                                <Text style={{ fontSize: 12, color: '#6B7280' }}>Attached: {mediaType}</Text>
                                <TouchableOpacity onPress={() => { setMediaUri(null); setMediaType(null); }}>
                                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        )}

                        <KeyboardAvoidingView
                            behavior={Platform.OS === "ios" ? "padding" : "height"}
                            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
                            style={{ flexShrink: 1 }} // Allow it to take available space but shrink if needed
                        >
                            <View style={styles.inputArea}>
                                {!isAdmin && (
                                    <TouchableOpacity
                                        style={styles.addProgressButton}
                                        onPress={() => setUpdateModalVisible(true)}
                                    >
                                        <Ionicons name="add" size={20} color="#FFF" />
                                        <Text style={styles.addProgressText}>Add Progress</Text>
                                    </TouchableOpacity>
                                )}

                                {/* Message Input or Recording Visualizer */}
                                {recording ? (
                                    <View style={[styles.messageInputContainer, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEF2F2' }]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            {[1, 2, 3, 4, 5, 6, 7].map((bar, idx) => (
                                                <View
                                                    key={idx}
                                                    style={{
                                                        width: 4,
                                                        height: 8 + (Math.random() * 16), // Simple fake visualizer
                                                        backgroundColor: '#DC2626',
                                                        borderRadius: 2
                                                    }}
                                                />
                                            ))}
                                        </View>
                                        <Text style={{ marginLeft: 12, color: '#DC2626', fontWeight: '600', fontSize: 12 }}>
                                            Recording... {recordingDuration}s / 30s
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={styles.messageInputContainer}>
                                        <TextInput
                                            style={styles.messageInput}
                                            placeholder="Message..."
                                            value={messageText}
                                            onChangeText={setMessageText}
                                            multiline
                                        />
                                        <TouchableOpacity onPress={pickImage}>
                                            <Ionicons name="image-outline" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                                        </TouchableOpacity>

                                    </View>
                                )}

                                {/* Mic / Send Button */}
                                <TouchableOpacity
                                    style={[styles.micButton, recording && { backgroundColor: '#FEE2E2' }]}
                                    onPress={() => {
                                        if (messageText.trim() || mediaUri) {
                                            handleSendMessage();
                                        } else if (recording) {
                                            stopRecording();
                                        } else {
                                            startRecording();
                                        }
                                    }}
                                    onLongPress={!messageText.trim() && !mediaUri ? startRecording : undefined}
                                    disabled={loading || sending || (!!mediaUri && !mediaType)}
                                >
                                    {(loading || sending) && (messageText || mediaUri) ? ( // visual feedback if sending
                                        <ActivityIndicator size="small" color="#8B0000" />
                                    ) : (
                                        <Ionicons
                                            name={messageText.trim() || mediaUri ? "send" : (recording ? "stop" : "mic")}
                                            size={20}
                                            color={recording ? "#EF4444" : "#6B7280"}
                                        />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>


                    </>
                ) : (
                    <View style={{ padding: 20, backgroundColor: '#FEF2F2', borderTopWidth: 1, borderTopColor: '#FECACA', alignItems: 'center' }}>
                        <Ionicons name="alert-circle-outline" size={24} color="#DC2626" style={{ marginBottom: 4 }} />
                        <Text style={{ color: '#DC2626', fontWeight: '600', fontSize: 14 }}>Assign an employee to start progress</Text>
                    </View>
                )
            }

            {/* Add Progress Modal */}
            <Modal
                transparent={true}
                visible={updateModalVisible}
                onRequestClose={() => setUpdateModalVisible(false)}
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Progress Update</Text>

                        <Text style={styles.modalLabel}>New Progress (%)</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g. 50"
                            keyboardType="numeric"
                            value={newProgress}
                            onChangeText={setNewProgress}
                        />

                        <Text style={styles.modalLabel}>Message</Text>
                        <TextInput
                            style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                            placeholder="Describe what was done..."
                            multiline
                            value={updateMessage}
                            onChangeText={setUpdateMessage}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setUpdateModalVisible(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalSaveBtn, submitLoading && styles.disabledBtn]}
                                onPress={handleSubmitUpdate}
                                disabled={submitLoading}
                            >
                                <Text style={styles.modalSaveText}>
                                    {submitLoading ? 'Submitting...' : 'Submit Update'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Image Upload Description Modal */}
            <Modal
                transparent={true}
                visible={imageUploadModalVisible}
                onRequestClose={() => setImageUploadModalVisible(false)}
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Image Description</Text>

                        {mediaUri && (
                            <View style={{ width: '100%', height: 200, borderRadius: 8, marginBottom: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                {(mediaType === 'image' || (!mediaType && !recording)) && (
                                    <Image
                                        source={{ uri: mediaUri }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                    />
                                )}

                                {mediaType === 'audio' && (
                                    <View style={{ gap: 8, alignItems: 'center' }}>
                                        <TouchableOpacity
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isPlayingPreview ? '#DCFCE7' : '#E5E7EB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}
                                            onPress={playPreview}
                                        >
                                            <Ionicons name={isPlayingPreview ? "pause" : "play"} size={16} color={isPlayingPreview ? "#047857" : "#374151"} />
                                            <Text style={{ fontSize: 12, color: isPlayingPreview ? "#047857" : '#374151' }}>
                                                {isPlayingPreview ? 'Playing...' : 'Play Preview'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}

                        <Text style={styles.modalLabel}>Add a caption (optional)</Text>
                        <TextInput
                            style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                            placeholder="Describe this image..."
                            multiline
                            value={imageDescription}
                            onChangeText={setImageDescription}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => {
                                    setImageUploadModalVisible(false);
                                    setMediaUri(null); // Cancel selection
                                    setMediaType(null);
                                }}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalSaveBtn}
                                onPress={handleSendImageWithDescription}
                            >
                                <Text style={styles.modalSaveText}>Send</Text>
                            </TouchableOpacity>
                        </View>
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

            <ImageViewerModal
                visible={imageViewerVisible}
                images={viewerImages}
                initialIndex={initialImageIndex}
                onClose={() => setImageViewerVisible(false)}
            />

            {/* Change Request Modal */}
            <Modal
                visible={changeRequestModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setChangeRequestModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Request Changes</Text>
                        <Text style={styles.modalSubtitle}>Please provide a reason for requesting changes:</Text>

                        <TextInput
                            style={styles.changeRequestInput}
                            placeholder="Enter reason for changes..."
                            value={changeRequestReason}
                            onChangeText={setChangeRequestReason}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setChangeRequestModalVisible(false);
                                    setChangeRequestReason('');
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.submitButton]}
                                onPress={submitReject}
                            >
                                <Text style={styles.submitButtonText}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </SafeAreaView >
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
        flex: 1,
        marginLeft: 12,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 80,
    },
    sectionCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    assignedRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center', // Centered vertically
        marginBottom: 20,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#8B0000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    label: {
        fontSize: 10,
        color: '#6B7280',
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    value: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    datesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    progressSection: {
        marginBottom: 4,
    },
    progressValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
    progressBarBg: {
        height: 10,
        backgroundColor: '#F3F4F6',
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#10B981', // Green
        borderRadius: 5,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    addTodoRow: {
        marginBottom: 12,
    },
    todoInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#111827'
    },
    todoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    todoText: {
        fontSize: 15,
        color: '#374151',
    },
    todoTextDone: {
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
    },
    emptyTextSimple: {
        fontSize: 13,
        color: '#9CA3AF',
        fontStyle: 'italic',
        marginTop: 8,
        textAlign: 'center',
    },
    feedContainer: {
        marginTop: 24,
        paddingBottom: 20
    },
    inputArea: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        alignItems: 'center',
        gap: 8
    },
    addProgressButton: {
        backgroundColor: '#7C3AED', // Purple-ish from user image
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 4
    },
    addProgressText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 12
    },
    messageInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        backgroundColor: '#FFF',
        height: 40
    },
    messageInput: {
        flex: 1,
        height: '100%',
        fontSize: 14,
        color: '#111827'
    },
    micButton: {
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center'
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 24,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
        color: '#111827',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalCancelBtn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
    },
    modalSaveBtn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: '#8B0000',
        borderRadius: 8,
    },
    modalCancelText: {
        color: '#4B5563',
        fontWeight: '600',
    },
    modalSaveText: {
        color: '#FFF',
        fontWeight: '600',
    },
    // Restored Styles
    updateCard: {
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#10B981', // Green accent
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    updateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    updateUser: {
        fontWeight: '700',
        fontSize: 14,
        color: '#111827',
    },
    updateTime: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    progressChangeBadge: {
        backgroundColor: '#ECFDF5',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 8,
    },
    progressChangeText: {
        color: '#047857',
        fontSize: 12,
        fontWeight: '700',
    },
    updateMessage: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#DCFCE7', // Light green
        borderBottomRightRadius: 2,
    },
    otherMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFF',
        borderBottomLeftRadius: 2,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    myMessageText: {
        color: '#111827', // Black/Dark for readability
    },
    otherMessageText: {
        color: '#1F2937',
    },
    senderName: {
        fontSize: 10,
        color: '#6B7280',
        marginBottom: 4,
        fontWeight: '600',
    },
    messageTime: {
        fontSize: 9,
        color: '#9CA3AF',
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    mediaPreview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        padding: 8,
        marginHorizontal: 16,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    disabledBtn: {
        opacity: 0.7,
        backgroundColor: '#9CA3AF'
    },
    changeRequestInput: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#111827',
        minHeight: 100,
        marginVertical: 16
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center'
    },
    cancelButton: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#D1D5DB'
    },
    submitButton: {
        backgroundColor: '#EF4444'
    },
    cancelButtonText: {
        color: '#374151',
        fontWeight: '600',
        fontSize: 14
    },
    submitButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8
    }
});

export default StageProgressScreen;
