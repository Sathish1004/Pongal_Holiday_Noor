import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, StyleSheet, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const LoginScreen = ({ navigation }: any) => {
    const { login } = useContext(AuthContext);
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!identifier || !password) {
            setError('Please enter email/phone and password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login', { identifier, password });
            const { token, user } = response.data;
            login(token, user);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Login Card */}
                    <View style={styles.loginCard}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.logoContainer}>
                                <Image
                                    source={require('../../assets/noor-logo.png')}
                                    style={styles.logoImage}
                                    resizeMode="contain"
                                />
                            </View>
                            <Text style={styles.title}>Welcome</Text>
                            <Text style={styles.subtitle}>Sign in to your account</Text>
                        </View>

                        {/* Login Form */}
                        <View style={styles.formContainer}>
                            {error ? (
                                <View style={styles.errorContainer}>
                                    <Ionicons name="alert-circle-outline" size={20} color="#D32F2F" />
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            ) : null}

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Email or Phone</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="person-outline" size={20} color="#1A1A1A" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter email or phone"
                                        placeholderTextColor="#999"
                                        value={identifier}
                                        onChangeText={setIdentifier}
                                        keyboardType="default"
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Password</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="lock-closed-outline" size={20} color="#1A1A1A" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter your password"
                                        placeholderTextColor="#999"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        style={styles.eyeButton}
                                    >
                                        <Ionicons
                                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                                            size={20}
                                            color="#666"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                                onPress={handleLogin}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#ffffff" size="small" />
                                ) : (
                                    <Text style={styles.loginButtonText}>LOGIN</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            NOOR <Text style={styles.brandName}>BUILDERS</Text>
                        </Text>
                        <Text style={styles.copyright}>© 2026 All Rights Reserved</Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 40,
        alignItems: 'center',
        minHeight: '100%',
    },
    loginCard: {
        width: '90%',
        maxWidth: 400,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingVertical: 45,
        paddingHorizontal: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
        width: '100%',
    },
    logoContainer: {
        marginBottom: 20,
        alignItems: 'center',
    },
    logoImage: {
        width: 180,
        height: 180,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#000000',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#666666',
        letterSpacing: 0.5,
    },
    formContainer: {
        width: '100%',
        marginBottom: 20,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef2f2',
        padding: 14,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#fee2e2',
    },
    errorText: {
        color: '#991b1b',
        fontSize: 14,
        marginLeft: 10,
        flex: 1,
        fontWeight: '500',
    },
    inputGroup: {
        marginBottom: 24,
    },
    inputLabel: {
        color: '#475569',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    inputIcon: {
        marginRight: 12,
        opacity: 0.7,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#0f172a',
        paddingVertical: 8,
        fontWeight: '500',
    },
    eyeButton: {
        padding: 8,
    },
    loginButton: {
        backgroundColor: '#FFB6C1',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 24,
        shadowColor: '#FFC0CB',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    loginButtonDisabled: {
        opacity: 0.6,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    footer: {
        alignItems: 'center',
        marginTop: 'auto',
    },
    footerText: {
        color: '#000000',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 2,
        marginBottom: 4,
    },
    brandName: {
        color: '#3B82F6',
        fontWeight: '800',
    },
    copyright: {
        color: '#999999',
        fontSize: 12,
    },
});

export default LoginScreen;
