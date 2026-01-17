import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Image,
    SafeAreaView,
    Platform,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

declare const window: any;

interface ImageViewerModalProps {
    visible: boolean;
    images: { uri: string; id: string | number }[];
    initialIndex: number;
    onClose: () => void;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
    visible,
    images,
    initialIndex,
    onClose
}) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [scale, setScale] = useState(1);
    const [loading, setLoading] = useState(true);

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            setCurrentIndex(initialIndex);
            setScale(1);
            setLoading(true);
        }
    }, [visible, initialIndex]);

    // Handle ESC key for web
    useEffect(() => {
        if (Platform.OS === 'web') {
            const handleKeyDown = (e: any) => {
                if (e.key === 'Escape') {
                    onClose();
                }
                if (e.key === 'ArrowRight') {
                    handleNext();
                }
                if (e.key === 'ArrowLeft') {
                    handlePrev();
                }
            };
            (window as any).addEventListener('keydown', handleKeyDown);
            return () => (window as any).removeEventListener('keydown', handleKeyDown);
        }
    }, [currentIndex, visible]); // Re-bind if index changes to ensure fresh state closure if needed, though mostly stable

    const handleNext = () => {
        if (currentIndex < images.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setScale(1);
            setLoading(true);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setScale(1);
            setLoading(true);
        }
    };

    const handleZoomIn = () => {
        setScale(prev => Math.min(prev + 0.5, 3)); // Max zoom 3x
    };

    const handleZoomOut = () => {
        setScale(prev => Math.max(prev - 0.5, 1)); // Min zoom 1x
    };

    if (!visible || images.length === 0) return null;

    const currentImage = images[currentIndex];

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <SafeAreaView style={styles.safeArea}>
                    {/* Header: Close Button & Counter */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={28} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.counterText}>
                            {currentIndex + 1} / {images.length}
                        </Text>
                        <View style={{ width: 28 }} /> {/* Spacer for balance */}
                    </View>

                    {/* Main Image Area */}
                    <View style={styles.imageContainer}>
                        {loading && (
                            <ActivityIndicator
                                size="large"
                                color="#FFF"
                                style={styles.loader}
                            />
                        )}
                        <Image
                            source={{ uri: currentImage.uri }}
                            style={[
                                styles.image,
                                {
                                    transform: [{ scale: scale }],
                                    opacity: loading ? 0 : 1 // Hide until loaded
                                }
                            ]}
                            resizeMode="contain"
                            onLoadEnd={() => setLoading(false)}
                        />
                    </View>

                    {/* Footer: Controls */}
                    <View style={styles.footer}>

                        {/* Zoom Controls */}
                        <View style={styles.zoomControls}>
                            <TouchableOpacity onPress={handleZoomOut} disabled={scale <= 1}>
                                <Ionicons name="remove-circle-outline" size={32} color={scale <= 1 ? "#555" : "#FFF"} />
                            </TouchableOpacity>
                            <Text style={styles.zoomText}>{Math.round(scale * 100)}%</Text>
                            <TouchableOpacity onPress={handleZoomIn} disabled={scale >= 3}>
                                <Ionicons name="add-circle-outline" size={32} color={scale >= 3 ? "#555" : "#FFF"} />
                            </TouchableOpacity>
                        </View>

                        {/* Navigation Arrows (Absolute positioned or centered) */}
                        {images.length > 1 && (
                            <View style={styles.navigationOverlay}>
                                <TouchableOpacity
                                    onPress={handlePrev}
                                    disabled={currentIndex === 0}
                                    style={[styles.navButton, styles.navLeft, currentIndex === 0 && styles.navDisabled]}
                                >
                                    <Ionicons name="chevron-back" size={40} color={currentIndex === 0 ? "#555" : "#FFF"} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleNext}
                                    disabled={currentIndex === images.length - 1}
                                    style={[styles.navButton, styles.navRight, currentIndex === images.length - 1 && styles.navDisabled]}
                                >
                                    <Ionicons name="chevron-forward" size={40} color={currentIndex === images.length - 1 ? "#555" : "#FFF"} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
    },
    safeArea: {
        flex: 1,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 40, // Extra padding for status bar if not handled by SafeAreaView on some devices
        paddingBottom: 20,
        zIndex: 10,
    },
    closeButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
    },
    counterText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden', // Contain zoomed image
    },
    image: {
        width: Dimensions.get('window').width,
        height: '100%',
    },
    loader: {
        position: 'absolute',
        zIndex: 5,
    },
    footer: {
        paddingBottom: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
        zIndex: 10,
    },
    zoomControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 30,
    },
    zoomText: {
        color: '#FFF',
        fontSize: 14,
        width: 50,
        textAlign: 'center',
    },
    navigationOverlay: {
        position: 'absolute',
        top: -300, // Move up into image area
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        height: 100, // Area for buttons
        alignItems: 'center',
    },
    navButton: {
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 30,
    },
    navLeft: {

    },
    navRight: {

    },
    navDisabled: {
        opacity: 0.5
    }
});

export default ImageViewerModal;
