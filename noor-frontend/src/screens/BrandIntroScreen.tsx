import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const BrandIntroScreen = ({ onComplete }: { onComplete?: () => void }) => {
    useEffect(() => {
        // Auto-navigate after 3 seconds if onComplete is provided
        if (onComplete) {
            const timer = setTimeout(onComplete, 3000);
            
            return () => clearTimeout(timer);
        }
    }, [onComplete]);

    return (
        <View style={styles.container}>
            {/* Subtle red accent line at top */}
            <View style={styles.accentLineTop} />

            {/* Logo centered */}
            <View style={styles.logoContainer}>
                <Image
                    source={require('../../assets/noor-builders-logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>

            {/* Subtle red accent line at bottom */}
            <View style={styles.accentLineBottom} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA', // Very light grey
        justifyContent: 'center',
        alignItems: 'center',
    },
    accentLineTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: '#E31E24', // Noor Builders red
        opacity: 0.3,
    },
    logoContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: width * 0.8,
        maxWidth: 500,
    },
    logo: {
        width: '100%',
        height: width * 0.8,
        maxHeight: 500,
    },
    accentLineBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: '#E31E24', // Noor Builders red
        opacity: 0.3,
    },
});

export default BrandIntroScreen;
