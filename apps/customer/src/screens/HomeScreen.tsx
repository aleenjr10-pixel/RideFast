import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView, ImageBackground,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VEHICLE_OPTIONS, estimatePrice, ORDER_STATUS_LABELS, CURRENCY } from '@rideshare/shared';
import type { VehicleType, Address } from '@rideshare/shared';
import { useOrders } from '../hooks/useOrders';
import { useAuth } from '../hooks/useAuth';
import { useRates } from '../hooks/useRates';
import PaymentScreen from './PaymentScreen';

const GMAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY!;

const DEFAULT_REGION = {
  latitude: 44.3302, longitude: 23.7949,
  latitudeDelta: 0.01, longitudeDelta: 0.01,
};

type LatLng = { latitude: number; longitude: number };
type SelectMode = 'pickup' | 'dropoff' | null;

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

function formatAddress(components: any[]): string {
  const get = (type: string) => components.find((c: any) => c.types.includes(type))?.long_name ?? '';
  const street = get('route');
  const number = get('street_number');
  const city = get('locality') || get('administrative_area_level_2');
  const parts = [street && number ? `${street} ${number}` : street, city].filter(Boolean);
  return parts.join(', ');
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GMAPS_KEY}&language=ro`
    );
    const data = await res.json();
    const components = data.results?.[0]?.address_components;
    if (components) {
      const label = formatAddress(components);
      if (label) return label;
    }
    return data.results?.[0]?.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

// Approximate heights for map padding
const TOP_PANEL_HEIGHT = 130;
const BOTTOM_PANEL_HEIGHT = 300;

export default function HomeScreen() {
  const { session, signOut } = useAuth();
  const { activeOrder, loading, requestRide, cancelOrder } = useOrders(session?.user.id);
  const insets = useSafeAreaInsets();

  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('economy');
  const [error, setError] = useState('');
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);

  const [pickup, setPickup] = useState<Address | null>(null);
  const [dropoff, setDropoff] = useState<Address | null>(null);
  const [pickupKey, setPickupKey] = useState(0);
  const [dropoffKey, setDropoffKey] = useState(0);
  const [routePoints, setRoutePoints] = useState<LatLng[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);

  const [selectMode, setSelectMode] = useState<SelectMode>(null);
  const [pinLabel, setPinLabel] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapRef = useRef<MapView>(null);
  const pickupRef = useRef<any>(null);
  const dropoffRef = useRef<any>(null);

  const rates = useRates();
  const [showPayment, setShowPayment] = useState(false);
  const bothSelected = !!(pickup && dropoff);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);
      setRegion({ ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 });
    })();
  }, []);

  useEffect(() => {
    if (!pickup || !dropoff) { setRoutePoints([]); setRouteInfo(null); return; }
    fetchRoute(pickup, dropoff);
  }, [pickup, dropoff]);

  // Sync pickup/dropoff from active order (e.g. app restart with existing order)
  useEffect(() => {
    if (!activeOrder) return;
    if (!pickup) setPickup(activeOrder.pickup);
    if (!dropoff) setDropoff(activeOrder.dropoff);
  }, [activeOrder?.id]);

  // Fetch route when active order is loaded (e.g. app restart with existing order)
  useEffect(() => {
    if (!activeOrder) return;
    if (routePoints.length > 0) return; // already have it from the booking flow
    fetchRoute(activeOrder.pickup, activeOrder.dropoff);
  }, [activeOrder?.id]);

  // After cancel: restore address text in autocomplete inputs
  const hadActiveOrder = useRef(false);
  useEffect(() => {
    if (activeOrder) { hadActiveOrder.current = true; return; }
    if (!hadActiveOrder.current) return;
    hadActiveOrder.current = false;
    // Small delay to let the normal view mount before setting ref text
    setTimeout(() => {
      if (pickup) pickupRef.current?.setAddressText(pickup.label);
      if (dropoff) dropoffRef.current?.setAddressText(dropoff.label);
    }, 150);
  }, [activeOrder]);

  const fetchRoute = async (from: Address, to: Address) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&key=${GMAPS_KEY}`
      );
      const data = await res.json();
      if (data.routes?.length) {
        const leg = data.routes[0].legs[0];
        setRouteInfo({ distanceKm: leg.distance.value / 1000, durationMin: leg.duration.value / 60 });
        const points = decodePolyline(data.routes[0].overview_polyline.points);
        setRoutePoints(points);
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: {
            top: TOP_PANEL_HEIGHT + insets.top + 24,
            right: 24,
            bottom: BOTTOM_PANEL_HEIGHT + 24,
            left: 24,
          },
          animated: true,
        });
      }
    } catch (e) { console.warn('Route fetch failed', e); }
  };

  const enterSelectMode = (mode: SelectMode) => {
    setSelectMode(mode);
    setPinLabel('');
    const existing = mode === 'pickup' ? pickup : dropoff;
    const center = existing ? { latitude: existing.lat, longitude: existing.lng } : userLocation;
    if (center) mapRef.current?.animateToRegion({ ...center, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 400);
  };

  const onMapRegionChange = (r: Region) => {
    setRegion(r);
    if (!selectMode) return;
    setIsGeocoding(true);
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      const label = await reverseGeocode(r.latitude, r.longitude);
      setPinLabel(label);
      setIsGeocoding(false);
    }, 500);
  };

  const confirmMapSelection = async () => {
    if (!selectMode) return;
    setIsGeocoding(true);
    const label = pinLabel || await reverseGeocode(region.latitude, region.longitude);
    const addr: Address = { label, lat: region.latitude, lng: region.longitude };
    if (selectMode === 'pickup') {
      setPickup(addr);
      pickupRef.current?.setAddressText(label);
    } else {
      setDropoff(addr);
      dropoffRef.current?.setAddressText(label);
    }
    setIsGeocoding(false);
    setSelectMode(null);
  };

  const centerOnUser = () => {
    if (userLocation) mapRef.current?.animateToRegion({ ...userLocation, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 500);
  };

  const handleRequest = async () => {
    if (!pickup || !dropoff) return;
    setError('');
    const price = estimatePrice(selectedVehicle, routeInfo?.distanceKm ?? 14.3, routeInfo?.durationMin ?? 22, rates);
    try {
      await requestRide(pickup, dropoff, selectedVehicle, price);
      setShowPayment(false);
    } catch (e: any) {
      setError(e.message ?? 'Failed to request ride');
    }
  };

  const autocompleteProps = {
    fetchDetails: true,
    enablePoweredByContainer: false,
    query: { key: GMAPS_KEY, language: 'ro', components: 'country:ro' },
    styles: {
      container: { flex: 0 },
      textInput: inputStyle,
      listView: {
        backgroundColor: '#fff', borderRadius: 12, marginTop: 4,
        position: 'absolute' as const, top: 44, left: 0, right: 0, zIndex: 99,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
      },
      row: { padding: 12 },
      description: { fontSize: 14, color: '#111' },
    },
    nearbyPlacesAPI: 'GooglePlacesSearch' as const,
    debounce: 300,
  };

  // ── ACTIVE ORDER ──
  if (activeOrder) {
    return (
      <View style={styles.root}>
        <MapView ref={mapRef} style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE} region={region} showsUserLocation>
          <Marker coordinate={{ latitude: activeOrder.pickup.lat, longitude: activeOrder.pickup.lng }} pinColor="#22c55e" />
          <Marker coordinate={{ latitude: activeOrder.dropoff.lat, longitude: activeOrder.dropoff.lng }} pinColor="#ef4444" />
          {routePoints.length > 0 && (
            <Polyline coordinates={routePoints} strokeColor="#111" strokeWidth={4} />
          )}
        </MapView>

        {/* Top status badge */}
        <View style={[styles.topBar, { marginTop: insets.top + 12 }]} pointerEvents="none">
          <View style={styles.statusBadge}>
            {activeOrder.status === 'pending' && (
              <ActivityIndicator size="small" color="#111" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.statusBadgeText}>{ORDER_STATUS_LABELS[activeOrder.status]}</Text>
          </View>
        </View>

        {/* Bottom panel */}
        <View style={[styles.floatingPanel, styles.bottomFloating, { marginBottom: insets.bottom + 12 }]}>
          {/* Route */}
          <View style={styles.activeRouteRow}>
            <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.activeRouteText} numberOfLines={1}>{activeOrder.pickup.label}</Text>
          </View>
          <View style={styles.activeRouteLine} />
          <View style={styles.activeRouteRow}>
            <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.activeRouteText} numberOfLines={1}>{activeOrder.dropoff.label}</Text>
          </View>

          {/* Price + payment */}
          <View style={styles.activeMeta}>
            <Text style={styles.activePrice}>{activeOrder.estimated_price.toFixed(2)} {CURRENCY}</Text>
            <View style={styles.cashBadge}>
              <Text style={styles.cashBadgeText}>💵 Cash</Text>
            </View>
          </View>

          {activeOrder.status === 'pending' && (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => cancelOrder(activeOrder.id)}>
              <Text style={styles.cancelBtnText}>Anuleaza cursa</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        region={region}
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChangeComplete={onMapRegionChange}
      >
        {!selectMode && pickup && (
          <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} pinColor="#22c55e" />
        )}
        {!selectMode && dropoff && (
          <Marker coordinate={{ latitude: dropoff.lat, longitude: dropoff.lng }} pinColor="#ef4444" />
        )}
        {routePoints.length > 0 && !selectMode && (
          <Polyline coordinates={routePoints} strokeColor="#111" strokeWidth={4} />
        )}
      </MapView>

      {/* ── MAP SELECTION MODE ── */}
      {selectMode && (
        <>
          <View pointerEvents="none" style={styles.pinContainer}>
            <Text style={styles.pinEmoji}>{selectMode === 'pickup' ? '🟢' : '🔴'}</Text>
            <View style={styles.pinShadow} />
          </View>
          <View style={[styles.floatingPanel, styles.topFloating, { marginTop: insets.top + 12 }]}>
            <Text style={styles.selectBannerTitle}>
              {selectMode === 'pickup' ? 'Muta harta la locul de plecare' : 'Muta harta la destinatie'}
            </Text>
            {isGeocoding
              ? <ActivityIndicator size="small" color="#555" style={{ marginTop: 6 }} />
              : <Text style={styles.selectBannerAddr} numberOfLines={2}>{pinLabel}</Text>
            }
          </View>
          <View style={[styles.selectActions, { marginBottom: insets.bottom + 12 }]}>
            <TouchableOpacity style={styles.cancelSelectBtn} onPress={() => setSelectMode(null)}>
              <Text style={styles.cancelSelectText}>Anuleaza</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmSelectBtn, isGeocoding && { opacity: 0.6 }]}
              onPress={confirmMapSelection} disabled={isGeocoding}
            >
              <Text style={styles.confirmSelectText}>Confirma</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Payment modal */}
      {pickup && dropoff && (
        <PaymentScreen
          visible={showPayment}
          pickup={pickup}
          dropoff={dropoff}
          vehicleType={selectedVehicle}
          distanceKm={routeInfo?.distanceKm ?? 14.3}
          durationMin={routeInfo?.durationMin ?? 22}
          rates={rates}
          loading={loading}
          onConfirm={handleRequest}
          onCancel={() => setShowPayment(false)}
        />
      )}

      {/* ── NORMAL MODE ── */}
      {!selectMode && (
        <>
          {/* Sign out */}
          <TouchableOpacity
            style={[styles.signOutBtn, { top: insets.top + 12, right: 24 }]}
            onPress={signOut}
          >
            <Text style={styles.signOutText}>Iesi</Text>
          </TouchableOpacity>

          {/* Locate me */}
          {userLocation && !bothSelected && (
            <TouchableOpacity
              style={[styles.locateBtn, { bottom: insets.bottom + 24 }]}
              onPress={centerOnUser}
            >
              <Text style={styles.locateBtnText}>⊕</Text>
            </TouchableOpacity>
          )}

          {/* TOP floating panel — address inputs */}
          <View style={[styles.floatingPanel, styles.topFloating, { marginTop: insets.top + 12 }]}>
            <View style={styles.inputRow}>
              <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
              <View style={{ flex: 1, zIndex: 100 }}>
                <GooglePlacesAutocomplete
                  key={pickupKey} ref={pickupRef}
                  placeholder="Punct de plecare"
                  {...autocompleteProps}
                  onPress={(_, details) => {
                    if (!details) return;
                    const label = formatAddress(details.address_components) || details.formatted_address;
                    setPickup({ label, lat: details.geometry.location.lat, lng: details.geometry.location.lng });
                    pickupRef.current?.setAddressText(label);
                  }}
                  renderRightButton={() => (
                    <View style={styles.inputButtons}>
                      <TouchableOpacity onPress={() => enterSelectMode('pickup')} style={styles.mapPinBtn}>
                        <Text style={styles.mapPinBtnText}>📍</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setPickup(null); setPickupKey(k => k + 1); }} style={styles.clearBtn}>
                        <Text style={styles.clearBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.inputRow}>
              <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
              <View style={{ flex: 1, zIndex: 99 }}>
                <GooglePlacesAutocomplete
                  key={dropoffKey} ref={dropoffRef}
                  placeholder="Unde mergi?"
                  {...autocompleteProps}
                  onPress={(_, details) => {
                    if (!details) return;
                    const label = formatAddress(details.address_components) || details.formatted_address;
                    setDropoff({ label, lat: details.geometry.location.lat, lng: details.geometry.location.lng });
                    dropoffRef.current?.setAddressText(label);
                  }}
                  renderRightButton={() => (
                    <View style={styles.inputButtons}>
                      <TouchableOpacity onPress={() => enterSelectMode('dropoff')} style={styles.mapPinBtn}>
                        <Text style={styles.mapPinBtnText}>📍</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setDropoff(null); setDropoffKey(k => k + 1); }} style={styles.clearBtn}>
                        <Text style={styles.clearBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />
              </View>
            </View>
          </View>

          {/* BOTTOM floating panel — vehicle selection */}
          {bothSelected && (
            <View style={[styles.floatingPanel, styles.bottomFloating, { marginBottom: insets.bottom + 12 }]}>
              {routeInfo && (
                <Text style={styles.routeInfoText}>
                  {routeInfo.distanceKm.toFixed(1)} km · ~{Math.round(routeInfo.durationMin)} min
                </Text>
              )}
              <Text style={styles.sectionLabel}>Alege masina</Text>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {VEHICLE_OPTIONS.map((v) => {
                  const price = estimatePrice(v.type, routeInfo?.distanceKm ?? 14.3, routeInfo?.durationMin ?? 22, rates);
                  const isSelected = selectedVehicle === v.type;
                  return (
                    <TouchableOpacity
                      key={v.type}
                      style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}
                      onPress={() => setSelectedVehicle(v.type)}
                      activeOpacity={0.85}
                    >
                      <ImageBackground
                        source={{ uri: v.image }}
                        style={styles.vehicleCardBg}
                        imageStyle={styles.vehicleCardImg}
                      >
                        <View style={styles.vehicleCardOverlay}>
                          <View style={styles.vehicleCardLeft}>
                            <View>
                              <Text style={styles.vehicleName}>{v.label}</Text>
                              <Text style={styles.vehicleDesc}>{v.description}</Text>
                            </View>
                          </View>
                          <View style={styles.vehicleMeta}>
                            <Text style={styles.vehiclePrice}>{price.toFixed(0)} {CURRENCY}</Text>
                            <Text style={styles.vehicleEta}>{v.eta_minutes} min</Text>
                          </View>
                        </View>
                      </ImageBackground>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity style={styles.confirmBtn} onPress={() => setShowPayment(true)}>
                <Text style={styles.confirmBtnText}>Confirma cursa</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const inputStyle = {
  flex: 1, fontSize: 15, color: '#111',
  backgroundColor: 'transparent', paddingVertical: 6, height: 40,
};

const SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 8,
};

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Floating panel base
  floatingPanel: {
    position: 'absolute', left: 12, right: 12,
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 14,
    ...SHADOW,
  },
  topFloating: { top: 0 },
  bottomFloating: { bottom: 0 },

  // Sign out
  signOutBtn: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    ...SHADOW,
  },
  signOutText: { fontSize: 13, color: '#555', fontWeight: '600' },

  // Locate
  locateBtn: {
    position: 'absolute', right: 24,
    backgroundColor: '#fff', borderRadius: 28, width: 44, height: 44,
    justifyContent: 'center', alignItems: 'center', ...SHADOW,
  },
  locateBtnText: { fontSize: 22, color: '#111' },

  // Inputs
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  divider: { height: 1, backgroundColor: '#e8e8e8', marginVertical: 4, marginLeft: 18 },
  inputButtons: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 2 },
  mapPinBtn: { padding: 4 },
  mapPinBtnText: { fontSize: 18 },
  clearBtn: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center',
  },
  clearBtnText: { fontSize: 11, color: '#555', fontWeight: '700' },

  // Vehicle panel
  routeInfoText: { fontSize: 13, color: '#555', fontWeight: '500', marginBottom: 10, textAlign: 'center' },
  sectionLabel: { fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  vehicleCard: {
    borderRadius: 12, overflow: 'hidden',
    marginBottom: 6, borderWidth: 2, borderColor: 'transparent',
  },
  vehicleCardSelected: { borderColor: '#facc15' },
  vehicleCardBg: { width: '100%', height: 58 },
  vehicleCardImg: { borderRadius: 10 },
  vehicleCardOverlay: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 14,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  vehicleCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  vehicleSelectedDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff',
  },
  vehicleName: { fontSize: 14, fontWeight: '700', color: '#fff' },
  vehicleDesc: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  vehicleMeta: { alignItems: 'flex-end' },
  vehiclePrice: { fontSize: 14, fontWeight: '700', color: '#fff' },
  vehicleEta: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  error: { color: '#e53e3e', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  confirmBtn: {
    backgroundColor: '#111', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 4,
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Map selection
  pinContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  pinEmoji: { fontSize: 36, marginBottom: -4 },
  pinShadow: { width: 10, height: 4, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.2)' },
  selectBannerTitle: { fontSize: 13, color: '#888', fontWeight: '600' },
  selectBannerAddr: { fontSize: 14, color: '#111', marginTop: 4, fontWeight: '500' },
  selectActions: {
    position: 'absolute', bottom: 0, left: 12, right: 12,
    flexDirection: 'row', gap: 12,
  },
  cancelSelectBtn: {
    flex: 1, backgroundColor: '#f2f2f2', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  cancelSelectText: { fontSize: 15, fontWeight: '600', color: '#555' },
  confirmSelectBtn: {
    flex: 2, backgroundColor: '#111', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  confirmSelectText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Active order
  topBar: {
    position: 'absolute', top: 0, left: 12, right: 12,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, ...SHADOW,
  },
  statusBadgeText: { fontSize: 14, fontWeight: '700', color: '#111' },
  activeRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  activeRouteText: { flex: 1, fontSize: 14, color: '#111', fontWeight: '500' },
  activeRouteLine: { width: 1, height: 14, backgroundColor: '#ccc', marginLeft: 4, marginVertical: 4 },
  activeMeta: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  activePrice: { fontSize: 22, fontWeight: '800', color: '#111' },
  cashBadge: {
    backgroundColor: '#fefce8', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#fde68a',
  },
  cashBadgeText: { fontSize: 13, fontWeight: '600', color: '#92400e' },
  cancelBtn: {
    backgroundColor: '#fef2f2', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
    marginTop: 12, borderWidth: 1, borderColor: '#fecaca',
  },
  cancelBtnText: { fontSize: 15, color: '#ef4444', fontWeight: '600' },
});
