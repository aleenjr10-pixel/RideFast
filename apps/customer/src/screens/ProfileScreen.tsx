import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import BottomNav, { BOTTOM_NAV_HEIGHT } from '../components/BottomNav';

export default function ProfileScreen({ navigation }: any) {
  const { session, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const user = session?.user;
  const meta = user?.user_metadata ?? {};

  const initials = meta.full_name
    ?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profilul meu</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{meta.full_name ?? '—'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informatii cont</Text>
          <Row label="Nume" value={meta.full_name ?? '—'} />
          <Row label="Email" value={user?.email ?? '—'} />
          <Row label="Telefon" value={meta.phone ?? '—'} />
        </View>

        <TouchableOpacity style={[styles.signOutBtn, { marginBottom: insets.bottom + BOTTOM_NAV_HEIGHT + 24 }]} onPress={signOut}>
          <Text style={styles.signOutText}>Deconectare</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomNav active="profile" navigation={navigation} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 22, color: '#111' },

  content: { paddingBottom: 16 },
  avatarSection: { alignItems: 'center', paddingVertical: 32 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0e7ff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#4338ca' },
  name: { fontSize: 22, fontWeight: '700', color: '#111' },

  section: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#fafafa', borderRadius: 16,
    borderWidth: 1, borderColor: '#f0f0f0', overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 11, color: '#aaa', textTransform: 'uppercase',
    letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  rowLabel: { fontSize: 14, color: '#666' },
  rowValue: { fontSize: 14, fontWeight: '500', color: '#111', textAlign: 'right', flex: 1, marginLeft: 16 },

  signOutBtn: {
    marginHorizontal: 20, marginTop: 8,
    backgroundColor: '#fef2f2', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#fecaca',
  },
  signOutText: { fontSize: 15, color: '#ef4444', fontWeight: '600' },
});
