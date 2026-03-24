import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Pressable, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DRAWER_WIDTH = 280;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  driverName: string;
  driverStatus: string;
  onProfile: () => void;
  onTrips: () => void;
  onSignOut: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  online:  { label: 'Online',   color: '#22c55e' },
  offline: { label: 'Offline',  color: '#9ca3af' },
  in_ride: { label: 'In cursa', color: '#3b82f6' },
};

export default function Drawer({ visible, onClose, driverName, driverStatus, onProfile, onTrips, onSignOut }: Props) {
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -DRAWER_WIDTH, duration: 220, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const st = STATUS_LABELS[driverStatus] ?? STATUS_LABELS.offline;
  const initials = driverName?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        {/* Overlay */}
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        </Animated.View>

        {/* Drawer panel */}
        <Animated.View style={[styles.drawer, { transform: [{ translateX }], paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
          {/* Driver header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName} numberOfLines={1}>{driverName}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: st.color }]} />
              <Text style={styles.statusLabel}>{st.label}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Navigation items */}
        <TouchableOpacity style={styles.navItem} onPress={onClose}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Acasa</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => { onClose(); setTimeout(onProfile, 250); }}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Profil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => { onClose(); setTimeout(onTrips, 250); }}>
          <Text style={styles.navIcon}>📋</Text>
          <Text style={styles.navLabel}>Cursele mele</Text>
        </TouchableOpacity>

        {/* Sign out */}
        <View style={{ flex: 1 }} />
        <View style={styles.divider} />
        <TouchableOpacity style={styles.navItem} onPress={onSignOut}>
          <Text style={styles.navIcon}>🚪</Text>
          <Text style={[styles.navLabel, { color: '#ef4444' }]}>Deconectare</Text>
        </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawer: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    width: DRAWER_WIDTH, backgroundColor: '#fff',
    paddingHorizontal: 20,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#e0e7ff',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#4338ca' },
  driverName: { fontSize: 15, fontWeight: '700', color: '#111' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 12, color: '#666' },
  closeBtn: { padding: 6 },
  closeBtnText: { fontSize: 16, color: '#aaa' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 12 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 4 },
  navIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  navLabel: { fontSize: 15, fontWeight: '500', color: '#111' },
});
