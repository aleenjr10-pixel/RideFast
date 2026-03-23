import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';

export default function LoginScreen({ navigation, route }: any) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);

  useEffect(() => {
    if (route.params?.pendingApproval) setShowPendingModal(true);
  }, [route.params?.pendingApproval]);

  const handleLogin = async () => {
    if (!email || !password) { setError('Completeaza toate campurile.'); return; }
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
    } catch (e: any) {
      if (e.message === 'PENDING_APPROVAL') {
        setShowPendingModal(true);
      } else {
        setError(e.message ?? 'Eroare la autentificare.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.logo}>RideFast</Text>
        <Text style={styles.subtitle}>Driver</Text>

        <TextInput
          style={styles.input} placeholder="Email" placeholderTextColor="#999"
          autoCapitalize="none" keyboardType="email-address"
          value={email} onChangeText={setEmail}
        />
        <TextInput
          style={styles.input} placeholder="Parola" placeholderTextColor="#999"
          secureTextEntry value={password} onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Conecteaza-te</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Nu ai cont? Inregistreaza-te</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showPendingModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalIcon}>⏳</Text>
            <Text style={styles.modalTitle}>Cont in asteptare</Text>
            <Text style={styles.modalBody}>
              Contul tau trebuie aprobat de administrator inainte de a putea folosi aplicatia.
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setShowPendingModal(false)}>
              <Text style={styles.modalBtnText}>Am Inteles</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logo: { fontSize: 32, fontWeight: '700', color: '#111', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 40 },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    marginBottom: 12, color: '#111', backgroundColor: '#fafafa',
  },
  error: { color: '#e53e3e', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  btn: { backgroundColor: '#111', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { textAlign: 'center', marginTop: 20, color: '#555', fontSize: 14 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  modal: {
    backgroundColor: '#fff', borderRadius: 20, padding: 28,
    alignItems: 'center', width: '100%', maxWidth: 340,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  modalIcon: { fontSize: 44, marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 12, textAlign: 'center' },
  modalBody: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalBtn: { backgroundColor: '#111', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40, alignItems: 'center', width: '100%' },
  modalBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
