import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const BOTTOM_NAV_HEIGHT = 64;

type ActiveTab = 'home' | 'profile' | 'trips';

interface Props {
  active: ActiveTab;
  navigation: any;
  onMapPress?: () => void;
}

export default function BottomNav({ active, navigation, onMapPress }: Props) {
  const insets = useSafeAreaInsets();

  const goHome = () => {
    if (onMapPress) { onMapPress(); return; }
    navigation.navigate('Home');
  };

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom, height: BOTTOM_NAV_HEIGHT + insets.bottom }]}>
      <TouchableOpacity
        style={styles.navBtn}
        onPress={() => navigation.navigate('Profile')}
      >
        <Text style={[styles.navBtnIcon, active === 'profile' && styles.activeIcon]}>👤</Text>
        <Text style={[styles.navBtnLabel, active === 'profile' && styles.activeLabel]}>Profil</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navBtnCenter} onPress={goHome}>
        <Text style={styles.navBtnCenterIcon}>⊕</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navBtn}
        onPress={() => navigation.navigate('Trips')}
      >
        <Text style={[styles.navBtnIcon, active === 'trips' && styles.activeIcon]}>📋</Text>
        <Text style={[styles.navBtnLabel, active === 'trips' && styles.activeLabel]}>Curse</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
    shadowOffset: { width: 0, height: -3 }, elevation: 10,
  },
  navBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8,
  },
  navBtnIcon: { fontSize: 22, marginBottom: 2, opacity: 0.4 },
  navBtnLabel: { fontSize: 10, fontWeight: '600', color: '#bbb' },
  activeIcon: { opacity: 1 },
  activeLabel: { color: '#111' },
  navBtnCenter: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#111', alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  navBtnCenterIcon: { fontSize: 24, color: '#fff' },
});
