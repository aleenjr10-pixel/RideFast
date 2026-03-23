import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@rideshare/shared';
import { useAuth } from '../hooks/useAuth';

interface DriverProfile {
  full_name: string;
  phone: string;
  vehicle_type: string;
  vehicle_model: string;
  vehicle_color: string;
  vehicle_plate: string;
  rating: number;
  total_trips: number;
  status: string;
  created_at: string;
}

export default function ProfileScreen({ navigation }: any) {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user.id) return;
    supabase
      .from('drivers')
      .select('full_name, phone, vehicle_type, vehicle_model, vehicle_color, vehicle_plate, rating, total_trips, status, created_at')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => { setProfile(data); setLoading(false); });
  }, [session?.user.id]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#111" />
      </View>
    );
  }

  if (!profile) return null;

  const initials = profile.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profilul meu</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{profile.full_name}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.rating?.toFixed(1)} ★</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.total_trips}</Text>
              <Text style={styles.statLabel}>Curse</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {new Date(profile.created_at).toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' })}
              </Text>
              <Text style={styles.statLabel}>Membru din</Text>
            </View>
          </View>
        </View>

        {/* Personal info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informatii personale</Text>
          <Row label="Telefon" value={profile.phone} />
          <Row label="Email" value={session?.user.email ?? '—'} />
        </View>

        {/* Vehicle info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicul</Text>
          <Row label="Tip" value={profile.vehicle_type} capitalize />
          <Row label="Model" value={profile.vehicle_model} />
          <Row label="Culoare" value={profile.vehicle_color} />
          <Row label="Nr. inmatriculare" value={profile.vehicle_plate} mono />
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, capitalize, mono }: { label: string; value: string; capitalize?: boolean; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, capitalize && { textTransform: 'capitalize' }, mono && { fontFamily: 'monospace', letterSpacing: 1 }]}>
        {value ?? '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 22, color: '#111' },

  content: { paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0e7ff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#4338ca' },
  name: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  statItem: { alignItems: 'center', paddingHorizontal: 24 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#111' },
  statLabel: { fontSize: 11, color: '#aaa', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#efefef' },

  section: {
    marginHorizontal: 20, marginBottom: 8,
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
});
