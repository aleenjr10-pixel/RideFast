import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';

export default function RegisterScreen({ navigation }: any) {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleType, setVehicleType] = useState<'economy' | 'comfort' | 'premium'>('economy');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !phone || !password || !vehiclePlate || !vehicleModel) {
      setError('Fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signUp(email, password, fullName, phone, vehicleType, vehiclePlate, vehicleModel);
    } catch (e: any) {
      setError(e.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>RideFast</Text>
        <Text style={styles.subtitle}>Driver registration</Text>

        <Text style={styles.section}>Personal info</Text>
        <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#999" value={fullName} onChangeText={setFullName} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Phone number" placeholderTextColor="#999" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#999" secureTextEntry value={password} onChangeText={setPassword} />

        <Text style={styles.section}>Vehicle info</Text>
        <View style={styles.typeRow}>
          {(['economy', 'comfort', 'premium'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, vehicleType === t && styles.typeBtnActive]}
              onPress={() => setVehicleType(t)}
            >
              <Text style={[styles.typeBtnText, vehicleType === t && styles.typeBtnTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={styles.input} placeholder="Vehicle model (e.g. Toyota Corolla)" placeholderTextColor="#999" value={vehicleModel} onChangeText={setVehicleModel} />
        <TextInput style={styles.input} placeholder="License plate" placeholderTextColor="#999" autoCapitalize="characters" value={vehiclePlate} onChangeText={setVehiclePlate} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Create driver account</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  logo: { fontSize: 32, fontWeight: '700', color: '#111', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 32 },
  section: { fontSize: 12, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 8 },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    marginBottom: 12, color: '#111', backgroundColor: '#fafafa',
  },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#e0e0e0', alignItems: 'center',
  },
  typeBtnActive: { backgroundColor: '#111', borderColor: '#111' },
  typeBtnText: { fontSize: 13, color: '#555', fontWeight: '500' },
  typeBtnTextActive: { color: '#fff' },
  error: { color: '#e53e3e', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  btn: {
    backgroundColor: '#111', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 4,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { textAlign: 'center', marginTop: 20, color: '#555', fontSize: 14 },
});
