import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, PanResponder, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CURRENCY, VEHICLE_OPTIONS } from '@rideshare/shared';
import type { VehicleType, Address, RatesConfig } from '@rideshare/shared';

type PaymentMethod = 'cash' | 'card';

interface Props {
  visible: boolean;
  pickup: Address;
  dropoff: Address;
  vehicleType: VehicleType;
  distanceKm: number;
  durationMin: number;
  rates: RatesConfig;
  loading: boolean;
  onConfirm: (method: PaymentMethod) => void;
  onCancel: () => void;
}

export default function PaymentScreen({
  visible, pickup, dropoff, vehicleType,
  distanceKm, durationMin, rates, loading,
  onConfirm, onCancel,
}: Props) {
  const insets = useSafeAreaInsets();
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100 || g.vy > 0.5) {
          Animated.timing(translateY, { toValue: 600, duration: 200, useNativeDriver: true }).start(onCancel);
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const vehicle = VEHICLE_OPTIONS.find(v => v.type === vehicleType)!;
  const r = rates[vehicleType];
  const baseFare = r.base_fare;
  const kmCost = +(r.per_km * distanceKm).toFixed(2);
  const minCost = +(r.per_min * durationMin).toFixed(2);
  const total = +(baseFare + kmCost + minCost).toFixed(2);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onCancel} />
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 12, transform: [{ translateY }] }]}>

          {/* Drag handle */}
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={styles.handle} />
          </View>

          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onCancel}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Sumar cursa</Text>

          {/* Route */}
          <View style={styles.routeCard}>
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
              <Text style={styles.routeLabel} numberOfLines={1}>{pickup.label}</Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.routeLabel} numberOfLines={1}>{dropoff.label}</Text>
            </View>
          </View>

          {/* Vehicle + distance */}
          <View style={styles.metaRow}>
            <Text style={styles.vehicleLabel}>{vehicle.label}</Text>
            <Text style={styles.metaText}>{distanceKm.toFixed(1)} km · ~{Math.round(durationMin)} min</Text>
          </View>

          {/* Price breakdown */}
          <View style={styles.breakdownCard}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Tarif pornire</Text>
              <Text style={styles.breakdownValue}>{baseFare.toFixed(2)} {CURRENCY}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{distanceKm.toFixed(1)} km × {r.per_km} lei</Text>
              <Text style={styles.breakdownValue}>{kmCost.toFixed(2)} {CURRENCY}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{Math.round(durationMin)} min × {r.per_min} lei</Text>
              <Text style={styles.breakdownValue}>{minCost.toFixed(2)} {CURRENCY}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.totalLabel}>Total estimat</Text>
              <Text style={styles.totalValue}>{total.toFixed(2)} {CURRENCY}</Text>
            </View>
          </View>

          {/* Payment method */}
          <Text style={styles.sectionLabel}>Metoda de plata</Text>
          <View style={styles.methodRow}>
            <TouchableOpacity
              style={[styles.methodBtn, method === 'cash' && styles.methodBtnSelected]}
              onPress={() => setMethod('cash')}
            >
              <Text style={styles.methodIcon}>💵</Text>
              <Text style={[styles.methodText, method === 'cash' && styles.methodTextSelected]}>Cash</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.methodBtn, method === 'card' && styles.methodBtnSelected]}
              onPress={() => setMethod('card')}
            >
              <Text style={styles.methodIcon}>💳</Text>
              <Text style={[styles.methodText, method === 'card' && styles.methodTextSelected]}>Card</Text>
            </TouchableOpacity>
          </View>

          {method === 'card' && (
            <Text style={styles.cardNote}>Plata cu cardul va fi disponibila in curand.</Text>
          )}

          {/* Buttons */}
          <TouchableOpacity
            style={[styles.confirmBtn, (loading || method === 'card') && styles.confirmBtnDisabled]}
            onPress={() => onConfirm(method)}
            disabled={loading || method === 'card'}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.confirmBtnText}>Comanda cursa · {total.toFixed(2)} {CURRENCY}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Anuleaza</Text>
          </TouchableOpacity>

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 8,
  },
  handleArea: { alignItems: 'center', paddingVertical: 8 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0' },
  closeBtn: {
    position: 'absolute', top: 16, right: 16,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { fontSize: 11, color: '#555', fontWeight: '700' },
  title: { fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 12 },

  // Route
  routeCard: {
    backgroundColor: '#f8f8f8', borderRadius: 12, padding: 12, marginBottom: 10,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  routeLabel: { flex: 1, fontSize: 13, color: '#111', fontWeight: '500' },
  routeLine: { width: 1, height: 10, backgroundColor: '#ddd', marginLeft: 4, marginVertical: 3 },

  // Meta
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  vehicleLabel: { fontSize: 14, fontWeight: '600', color: '#111' },
  metaText: { fontSize: 12, color: '#888' },

  // Breakdown
  breakdownCard: {
    backgroundColor: '#f8f8f8', borderRadius: 12, padding: 12, marginBottom: 12,
  },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  breakdownLabel: { fontSize: 12, color: '#666' },
  breakdownValue: { fontSize: 12, color: '#111', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#e8e8e8', marginVertical: 6 },
  totalLabel: { fontSize: 13, fontWeight: '700', color: '#111' },
  totalValue: { fontSize: 13, fontWeight: '700', color: '#111' },

  // Payment
  sectionLabel: { fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  methodRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  methodBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: 12, borderRadius: 12, borderWidth: 2, borderColor: '#e8e8e8',
  },
  methodBtnSelected: { borderColor: '#facc15', backgroundColor: '#fefce8' },
  methodIcon: { fontSize: 18 },
  methodText: { fontSize: 13, fontWeight: '600', color: '#888' },
  methodTextSelected: { color: '#111' },
  cardNote: { fontSize: 11, color: '#f97316', textAlign: 'center', marginBottom: 6 },

  // Buttons
  confirmBtn: {
    backgroundColor: '#111', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
  },
  confirmBtnDisabled: { backgroundColor: '#ccc' },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: {
    backgroundColor: '#fef2f2', borderRadius: 14, paddingVertical: 13,
    alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#fecaca',
  },
  cancelBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },
});
