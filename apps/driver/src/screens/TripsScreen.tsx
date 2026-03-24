import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, CURRENCY } from '@rideshare/shared';
import { useAuth } from '../hooks/useAuth';

interface Trip {
  id: string;
  pickup: { label: string };
  dropoff: { label: string };
  final_price: number | null;
  estimated_price: number;
  completed_at: string;
  vehicle_type: string;
}

export default function TripsScreen({ navigation }: any) {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user.id) return;
    (async () => {
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', session.user.id)
        .single();
      if (!driver) { setLoading(false); return; }

      const { data } = await supabase
        .from('orders')
        .select('id, pickup, dropoff, final_price, estimated_price, completed_at, vehicle_type')
        .eq('driver_id', driver.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      setTrips((data as Trip[]) ?? []);
      setLoading(false);
    })();
  }, [session?.user.id]);

  const totalEarnings = trips.reduce((sum, t) => sum + (t.final_price ?? t.estimated_price), 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cursele mele</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111" />
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🚗</Text>
          <Text style={styles.emptyText}>Nicio cursa finalizata inca.</Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryBar}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{trips.length}</Text>
              <Text style={styles.summaryLabel}>Curse</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalEarnings.toFixed(2)} {CURRENCY}</Text>
              <Text style={styles.summaryLabel}>Total castigat</Text>
            </View>
          </View>

          <FlatList
            data={trips}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => {
              const price = item.final_price ?? item.estimated_price;
              const date = item.completed_at
                ? new Date(item.completed_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—';
              const time = item.completed_at
                ? new Date(item.completed_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
                : '';
              return (
                <View style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.dateText}>{date} · {time}</Text>
                    <Text style={styles.priceText}>{price.toFixed(2)} {CURRENCY}</Text>
                  </View>
                  <View style={styles.routeRow}>
                    <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
                    <Text style={styles.routeText} numberOfLines={1}>{item.pickup.label}</Text>
                  </View>
                  <View style={styles.routeLine} />
                  <View style={styles.routeRow}>
                    <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                    <Text style={styles.routeText} numberOfLines={1}>{item.dropoff.label}</Text>
                  </View>
                </View>
              );
            }}
          />
        </>
      )}
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

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#aaa' },

  summaryBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 24,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '800', color: '#111' },
  summaryLabel: { fontSize: 11, color: '#aaa', marginTop: 2 },
  summaryDivider: { width: 1, height: 36, backgroundColor: '#efefef' },

  list: { padding: 16 },
  separator: { height: 10 },
  card: {
    backgroundColor: '#fafafa', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#f0f0f0',
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  dateText: { fontSize: 12, color: '#888' },
  priceText: { fontSize: 16, fontWeight: '700', color: '#111' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  routeText: { flex: 1, fontSize: 13, color: '#333' },
  routeLine: { width: 1, height: 10, backgroundColor: '#ddd', marginLeft: 3, marginVertical: 3 },
});
