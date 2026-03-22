import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CURRENCY, ORDER_STATUS_LABELS } from '@rideshare/shared';
import { useAuth } from '../hooks/useAuth';
import { useDriver } from '../hooks/useDriver';

const GMAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY!;

const DEFAULT_REGION = {
  latitude: 44.3302, longitude: 23.7949,
  latitudeDelta: 0.01, longitudeDelta: 0.01,
};

type LatLng = { latitude: number; longitude: number };

function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

export default function HomeScreen() {
  const { session, signOut } = useAuth();
  const {
    status, incomingOrder, activeOrder, dispatchSecondsLeft,
    goOnline, goOffline, acceptOrder, declineOrder,
    arrivedAtPickup, startRide, completeOrder,
  } = useDriver(session?.user.id);
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [routePoints, setRoutePoints] = useState<LatLng[]>([]);

  const isOnline = status !== 'offline';

  // Wave animation
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isOnline) { wave1.setValue(0); wave2.setValue(0); wave3.setValue(0); return; }
    const makeWave = (val: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(val, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]));
    const a1 = makeWave(wave1, 0);
    const a2 = makeWave(wave2, 600);
    const a3 = makeWave(wave3, 1200);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [status]);

  const waveStyle = (val: Animated.Value) => ({
    transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }],
    opacity: val.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.4, 0] }),
  });

  // Get user location
  useEffect(() => {
    (async () => {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    })();
  }, []);

  // Fetch route for incoming order (pickup → dropoff preview)
  useEffect(() => {
    if (!incomingOrder) return;
    fetchRoute(
      { lat: incomingOrder.pickup.lat, lng: incomingOrder.pickup.lng },
      { lat: incomingOrder.dropoff.lat, lng: incomingOrder.dropoff.lng }
    );
  }, [incomingOrder?.id]);

  // Fetch route based on active order status
  useEffect(() => {
    if (!activeOrder) { setRoutePoints([]); return; }

    if (activeOrder.status === 'accepted' || activeOrder.status === 'arriving') {
      if (!userLocation) return;
      fetchRoute(
        { lat: userLocation.latitude, lng: userLocation.longitude },
        { lat: activeOrder.pickup.lat, lng: activeOrder.pickup.lng }
      );
    } else if (activeOrder.status === 'in_progress') {
      fetchRoute(
        { lat: activeOrder.pickup.lat, lng: activeOrder.pickup.lng },
        { lat: activeOrder.dropoff.lat, lng: activeOrder.dropoff.lng }
      );
    } else {
      setRoutePoints([]);
    }
  }, [activeOrder?.status, userLocation]);

  const fetchRoute = async (
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
  ) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&key=${GMAPS_KEY}`
      );
      const data = await res.json();
      if (data.routes?.length) {
        const points = decodePolyline(data.routes[0].overview_polyline.points);
        setRoutePoints(points);
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: { top: 160, right: 24, bottom: 220, left: 24 },
          animated: true,
        });
      }
    } catch (e) { console.warn('[fetchRoute] failed:', e); }
  };

  // Action button config based on order status
  const getActionBtn = () => {
    if (!activeOrder) return null;
    switch (activeOrder.status) {
      case 'accepted':
        return { label: 'Am ajuns la client', color: '#f59e0b', onPress: () => arrivedAtPickup(activeOrder.id) };
      case 'arriving':
        return { label: 'Incepe cursa', color: '#3b82f6', onPress: () => startRide(activeOrder.id) };
      case 'in_progress':
        return { label: 'Finalizeaza cursa', color: '#22c55e', onPress: () => completeOrder(activeOrder.id, activeOrder.estimated_price) };
      default:
        return null;
    }
  };

  const actionBtn = getActionBtn();

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={userLocation
          ? { ...userLocation, latitudeDelta: 0.01, longitudeDelta: 0.01 }
          : DEFAULT_REGION}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {activeOrder && (
          <>
            <Marker
              coordinate={{ latitude: activeOrder.pickup.lat, longitude: activeOrder.pickup.lng }}
              pinColor="#22c55e"
            />
            <Marker
              coordinate={{ latitude: activeOrder.dropoff.lat, longitude: activeOrder.dropoff.lng }}
              pinColor="#ef4444"
            />
          </>
        )}
        {routePoints.length > 0 && (
          <Polyline coordinates={routePoints} strokeColor="#111" strokeWidth={4} />
        )}
      </MapView>

      {/* Top bar */}
      <View style={[styles.topBar, { marginTop: insets.top + 12 }]}>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#22c55e' : '#e0e0e0' }]} />
          <Text style={styles.statusText}>
            {status === 'offline' ? 'Offline' : status === 'online' ? 'Online' : 'In cursa'}
          </Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Iesi</Text>
        </TouchableOpacity>
      </View>

      {/* Incoming order card */}
      {incomingOrder && (
        <View style={[styles.floatingCard, { marginTop: insets.top + 70 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Cerere noua</Text>
            <View style={styles.cardHeaderRight}>
              <Text style={[styles.countdown, dispatchSecondsLeft <= 5 && styles.countdownUrgent]}>
                {dispatchSecondsLeft}s
              </Text>
              <Text style={styles.cardPrice}>{incomingOrder.estimated_price.toFixed(2)} {CURRENCY}</Text>
            </View>
          </View>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.routeText} numberOfLines={1}>{incomingOrder.pickup.label}</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.routeText} numberOfLines={1}>{incomingOrder.dropoff.label}</Text>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.declineBtn} onPress={declineOrder}>
              <Text style={styles.declineBtnText}>Refuza</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptOrder(incomingOrder.id)}>
              <Text style={styles.acceptBtnText}>Accepta</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Active order card */}
      {activeOrder && !incomingOrder && actionBtn && (
        <View style={[styles.floatingCard, styles.bottomCard, { marginBottom: insets.bottom + 12 }]}>
          <Text style={styles.statusLabel}>{ORDER_STATUS_LABELS[activeOrder.status]}</Text>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.routeText} numberOfLines={1}>{activeOrder.pickup.label}</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.routeText} numberOfLines={1}>{activeOrder.dropoff.label}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.cardPrice}>{activeOrder.estimated_price.toFixed(2)} {CURRENCY}</Text>
            <Text style={styles.cashLabel}>💵 Cash</Text>
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: actionBtn.color }]}
            onPress={actionBtn.onPress}
          >
            <Text style={styles.actionBtnText}>{actionBtn.label}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom — online/offline button (only when no active order) */}
      {!activeOrder && (
        <View style={styles.bottomBar}>
          {isOnline && (
            <>
              <Animated.View style={[styles.wave, waveStyle(wave1)]} />
              <Animated.View style={[styles.wave, waveStyle(wave2)]} />
              <Animated.View style={[styles.wave, waveStyle(wave3)]} />
            </>
          )}
          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: isOnline ? '#22c55e' : '#ef4444' }]}
            onPress={() => isOnline ? goOffline() : goOnline()}
            activeOpacity={0.85}
          >
            <Text style={styles.toggleBtnText}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const SHADOW = {
  shadowColor: '#000', shadowOpacity: 0.12,
  shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
};

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    position: 'absolute', top: 0, left: 12, right: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, ...SHADOW,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '600', color: '#111' },
  signOutBtn: {
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, ...SHADOW,
  },
  signOutText: { fontSize: 13, color: '#555', fontWeight: '600' },

  floatingCard: {
    position: 'absolute', left: 12, right: 12,
    backgroundColor: '#fff', borderRadius: 20,
    padding: 16, ...SHADOW,
  },
  bottomCard: { bottom: 0 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countdown: { fontSize: 13, fontWeight: '700', color: '#888', minWidth: 28, textAlign: 'right' },
  countdownUrgent: { color: '#ef4444' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  cardPrice: { fontSize: 18, fontWeight: '700', color: '#111' },
  statusLabel: { fontSize: 12, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  routeText: { flex: 1, fontSize: 13, color: '#333' },
  routeLine: { width: 1, height: 12, backgroundColor: '#ccc', marginLeft: 4, marginVertical: 4 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  cashLabel: { fontSize: 13, color: '#888' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  declineBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#e0e0e0', alignItems: 'center',
  },
  declineBtnText: { fontSize: 14, color: '#555', fontWeight: '600' },
  acceptBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#111', alignItems: 'center' },
  acceptBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  actionBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  bottomBar: {
    position: 'absolute', bottom: '16%',
    left: 0, right: 0, alignItems: 'center',
  },
  wave: {
    position: 'absolute',
    width: 110, height: 44,
    borderRadius: 22, backgroundColor: '#22c55e',
  },
  toggleBtn: {
    width: 140, borderRadius: 22, paddingVertical: 13,
    alignItems: 'center', ...SHADOW,
  },
  toggleBtnText: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 1.5 },
});
