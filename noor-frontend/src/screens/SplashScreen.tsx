import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, Dimensions, TouchableOpacity } from 'react-native';

const { width } = Dimensions.get('window');

interface SplashProps {
    navigation?: any;
    onSkip?: () => void;
}

const SplashScreen = ({ navigation, onSkip }: SplashProps) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const lineAnim = useRef(new Animated.Value(0)).current;

    const handleNext = () => {
        if (navigation) {
            navigation.replace('Login');
        } else if (onSkip) {
            onSkip();
        }
    };

    useEffect(() => {
        // Auto-navigate after 3 seconds
        const timer = setTimeout(handleNext, 3000);

        // Logo and Text Animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1500,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
            })
        ]).start();

        // Loading Line Animation
        Animated.timing(lineAnim, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: false,
        }).start();

        return () => clearTimeout(timer);
    }, []);

    const lineWidth = lineAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    return (
        <TouchableOpacity style={styles.container} onPress={handleNext} activeOpacity={1}>
            <StatusBar barStyle="light-content" backgroundColor="#720e1e" />

            <View style={styles.contentContainer}>
                {/* Animated Logo & Text */}
                <Animated.View style={[styles.logoContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                    {/* Construction Icon Representation */}
                    <View style={styles.iconCircle}>
                        <Text style={styles.iconText}>🏗️</Text>
                    </View>

                    <Text style={styles.title}>NOOR</Text>
                    <Text style={styles.subtitle}>CONSTRUCTIONS</Text>

                    {/* Subtle Loading Line */}
                    <View style={styles.loaderContainer}>
                        <Animated.View style={[styles.loaderLine, { width: lineWidth }]} />
                    </View>
                </Animated.View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.tagline}>Building Trust. Delivering Quality.</Text>
                <Text style={styles.copy}>© 2026 Noor Constructions</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#8B0000', // Deep Red
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    iconText: {
        fontSize: 40,
    },
    title: {
        fontSize: 48,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 4,
        marginBottom: -5,
        includeFontPadding: false,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.9)',
        letterSpacing: 6,
        marginBottom: 40,
    },
    loaderContainer: {
        width: 120,
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 1,
        overflow: 'hidden',
    },
    loaderLine: {
        height: '100%',
        backgroundColor: '#FFFFFF',
    },
    footer: {
        position: 'absolute',
        bottom: 50,
        alignItems: 'center',
    },
    tagline: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 1,
        marginBottom: 8,
        opacity: 0.9,
    },
    copy: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        letterSpacing: 1,
    },
});

export default SplashScreen;
