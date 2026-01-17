import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
    const navigation = useNavigation();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Staggered animations for a premium feel
        Animated.sequence([
            // 1. Fade in Logo
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ]),
            // 2. Fill Progress Bar
            Animated.timing(progressAnim, {
                toValue: 1,
                duration: 2500,
                useNativeDriver: false,
            }),
        ]).start();

        // Auto-redirect
        const timer = setTimeout(() => {
            navigation.navigate('Login' as never);
        }, 3800);

        return () => clearTimeout(timer);
    }, []);

    const widthInterpolation = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Decorative Top Right Circle */}
            <View style={styles.decorativeCircleTop} />

            {/* Decorative Bottom Left Circle */}
            <View style={styles.decorativeCircleBottom} />

            <View style={styles.contentContainer}>
                {/* Animated Logo Section */}
                <Animated.View style={[styles.centerSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.logoWrapper}>
                        <Image
                            source={require('../../assets/noor-builders-logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Brand Content */}
                    <Text style={styles.brandTitle}>NOOR BUILDERS</Text>
                    <Text style={styles.tagline}>Customer Satisfaction Is Our Priority</Text>

                    <View style={styles.divider} />

                    <Text style={styles.description}>
                    </Text>
                </Animated.View>

                {/* Progress Loader Section */}
                <View style={styles.bottomSection}>
                    <View style={styles.loaderWrapper}>
                        <View style={styles.progressBarBackground}>
                            <Animated.View
                                style={[
                                    styles.progressBarFill,
                                    { width: widthInterpolation }
                                ]}
                            />
                        </View>
                        <Text style={styles.loadingText}>Initializing Experience...</Text>
                    </View>
                    <Text style={styles.copyright}>© 2026 Noor Builders. All rights reserved.</Text>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
    },
    decorativeCircleTop: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: '#000000', // Solid Dark Black (Top Right)
    },
    decorativeCircleBottom: {
        position: 'absolute',
        bottom: -50,
        left: -50,
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: '#000000', // Solid Dark Black (Bottom Left)
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'space-between',
        paddingVertical: 60,
        paddingHorizontal: 30,
    },
    centerSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoWrapper: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 30,
    },
    logo: {
        width: 180,
        height: 180,
    },
    brandTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#0f172a',
        letterSpacing: 4,
        marginBottom: 8,
        textAlign: 'center',
    },
    tagline: {
        fontSize: 14,
        fontWeight: '700',
        color: '#8B0000',
        textTransform: 'uppercase',
        letterSpacing: 3,
        textAlign: 'center',
        marginBottom: 24,
    },
    divider: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E7EB', // Gray-200
        borderRadius: 2,
        marginBottom: 20,
    },
    description: {
        fontSize: 15,
        lineHeight: 24,
        color: '#4B5563', // Gray-600
        textAlign: 'center',
        maxWidth: 300,
        fontWeight: '400',
    },
    bottomSection: {
        alignItems: 'center',
        gap: 20,
    },
    loaderWrapper: {
        width: '100%',
        maxWidth: 240,
        alignItems: 'center',
        gap: 12,
    },
    progressBarBackground: {
        width: '100%',
        height: 4,
        backgroundColor: '#f1f5f9',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#8B0000',
        borderRadius: 2,
    },
    loadingText: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    copyright: {
        fontSize: 11,
        color: '#D1D5DB',
        marginTop: 10,
    },
});

export default HomeScreen;
