import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AchievementBannerProps {
    milestoneName: string;
    onDismiss: () => void;
}

const AchievementBanner: React.FC<AchievementBannerProps> = ({ milestoneName, onDismiss }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-50)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: -50,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => onDismiss());
    };

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.iconContainer}>
                <Ionicons name="trophy" size={24} color="#059669" />
            </View>
            <View style={styles.contentContainer}>
                <Text style={styles.title}>🏆 Achievement Unlocked!</Text>
                <Text style={styles.message}>
                    "<Text style={styles.highlight}>{milestoneName}</Text>" has been successfully completed.
                    Great work by the team.
                </Text>
            </View>
            <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
                <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#ECFDF5', // Soft green
        borderRadius: 12,
        padding: 16,
        margin: 16,
        marginBottom: 8,
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: '#10B981',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
    },
    iconContainer: {
        marginRight: 12,
        marginTop: 2,
    },
    contentContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#065F46',
        marginBottom: 4,
    },
    message: {
        fontSize: 14,
        color: '#064E3B',
        lineHeight: 20,
    },
    highlight: {
        fontWeight: '700',
    },
    closeButton: {
        marginLeft: 8,
        padding: 4,
    },
});

export default AchievementBanner;
