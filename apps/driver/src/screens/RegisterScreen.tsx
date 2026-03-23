import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@rideshare/shared';
import { useAuth } from '../hooks/useAuth';

type Step = 1 | 2 | 3;

export default function RegisterScreen({ navigation }: any) {
  const { signUp } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — Informatii personale
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2 — Despre masina
  const [vehicleType, setVehicleType] = useState<'economy' | 'comfort' | 'premium'>('economy');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');

  // Step 3 — Documente
  const [licenseUri, setLicenseUri] = useState<string | null>(null);
  const [idCardUri, setIdCardUri] = useState<string | null>(null);

  const validate = () => {
    setError('');
    if (step === 1) {
      if (!fullName || !email || !phone || !password || !confirmPassword) {
        setError('Completeaza toate campurile.'); return false;
      }
      if (password !== confirmPassword) {
        setError('Parolele nu coincid.'); return false;
      }
      if (password.length < 6) {
        setError('Parola trebuie sa aiba minim 6 caractere.'); return false;
      }
    }
    if (step === 2) {
      if (!vehicleModel || !vehicleColor || !vehiclePlate) {
        setError('Completeaza toate campurile.'); return false;
      }
    }
    if (step === 3) {
      if (!licenseUri || !idCardUri) {
        setError('Incarca ambele documente.'); return false;
      }
    }
    return true;
  };

  const pickImage = async (setter: (uri: string) => void) => {
    Alert.alert('Incarca document', 'Alege sursa', [
      {
        text: 'Galerie foto',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permisiune necesara', 'Avem nevoie de acces la galerie.'); return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8, allowsEditing: true, aspect: [4, 3],
          });
          if (!result.canceled) setter(result.assets[0].uri);
        },
      },
      {
        text: 'Camera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permisiune necesara', 'Avem nevoie de acces la camera.'); return;
          }
          const result = await ImagePicker.launchCameraAsync({
            quality: 0.8, allowsEditing: true, aspect: [4, 3],
          });
          if (!result.canceled) setter(result.assets[0].uri);
        },
      },
      { text: 'Anuleaza', style: 'cancel' },
    ]);
  };

  const uploadDocument = async (userId: string, uri: string, filename: string) => {
    const path = `${userId}/${filename}`;
    const { data: { session } } = await supabase.auth.getSession();
    const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/driver-documents/${path}`;
    const result = await FileSystem.uploadAsync(uploadUrl, uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true',
      },
    });
    if (result.status !== 200 && result.status !== 201) {
      throw new Error(`Upload esuat (${result.status})`);
    }
    return path;
  };

  const handleNext = () => {
    if (!validate()) return;
    setStep((s) => (s + 1) as Step);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      let authData = await signUp(email, password, fullName, phone, vehicleType, vehiclePlate, vehicleModel, vehicleColor).catch(async (e) => {
        if (e.message?.toLowerCase().includes('already registered')) {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw new Error('Contul exista deja dar parola este incorecta. Revino la pasul 1 si introdu aceeasi parola.');
          return data;
        }
        throw e;
      });
      const userId = authData.user?.id;
      if (!userId) throw new Error('Eroare la crearea contului.');

      const [licensePath, idCardPath] = await Promise.all([
        uploadDocument(authData.user!.id, licenseUri!, 'license.jpg'),
        uploadDocument(authData.user!.id, idCardUri!, 'id_card.jpg'),
      ]);

      await supabase.from('drivers')
        .update({ documents: { license_url: licensePath, id_card_url: idCardPath }, onboarding_complete: true })
        .eq('user_id', authData.user!.id);

      await supabase.auth.signOut();
      navigation.navigate('Login', { pendingApproval: true });
    } catch (e: any) {
      setError(e.message ?? 'Eroare la inregistrare.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepRow}>
      {([1, 2, 3] as Step[]).map((s, i) => (
        <React.Fragment key={s}>
          <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, step >= s && styles.stepDotTextActive]}>{s}</Text>
          </View>
          {i < 2 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
        </React.Fragment>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <>
      <Text style={styles.stepTitle}>Informatii personale</Text>
      <TextInput style={styles.input} placeholder="Nume complet" placeholderTextColor="#999" value={fullName} onChangeText={setFullName} />
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Numar de telefon" placeholderTextColor="#999" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <TextInput style={styles.input} placeholder="Parola" placeholderTextColor="#999" secureTextEntry value={password} onChangeText={setPassword} />
      <TextInput style={styles.input} placeholder="Confirma parola" placeholderTextColor="#999" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={styles.stepTitle}>Despre masina</Text>
      <Text style={styles.label}>Tip vehicul</Text>
      <View style={styles.typeRow}>
        {(['economy', 'comfort', 'premium'] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.typeBtn, vehicleType === t && styles.typeBtnActive]} onPress={() => setVehicleType(t)}>
            <Text style={[styles.typeBtnText, vehicleType === t && styles.typeBtnTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput style={styles.input} placeholder="Marca si model (ex: Toyota Corolla)" placeholderTextColor="#999" value={vehicleModel} onChangeText={setVehicleModel} />
      <TextInput style={styles.input} placeholder="Culoarea masinii (ex: Negru)" placeholderTextColor="#999" value={vehicleColor} onChangeText={setVehicleColor} />
      <TextInput style={styles.input} placeholder="Numar inmatriculare" placeholderTextColor="#999" autoCapitalize="characters" value={vehiclePlate} onChangeText={setVehiclePlate} />
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={styles.stepTitle}>Documente</Text>
      <Text style={styles.stepSubtitle}>Incarca o poza clara cu fiecare document.</Text>

      <Text style={styles.label}>Permis de conducere</Text>
      <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setLicenseUri)}>
        {licenseUri
          ? <Image source={{ uri: licenseUri }} style={styles.uploadPreview} />
          : <><Text style={styles.uploadIcon}>📄</Text><Text style={styles.uploadText}>Apasa pentru a incarca</Text></>}
      </TouchableOpacity>

      <Text style={styles.label}>Carte de identitate</Text>
      <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(setIdCardUri)}>
        {idCardUri
          ? <Image source={{ uri: idCardUri }} style={styles.uploadPreview} />
          : <><Text style={styles.uploadIcon}>🪪</Text><Text style={styles.uploadText}>Apasa pentru a incarca</Text></>}
      </TouchableOpacity>
    </>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>RideFast</Text>

        {renderStepIndicator()}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.navRow}>
          {step > 1 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep((s) => (s - 1) as Step)}>
              <Text style={styles.backBtnText}>Inapoi</Text>
            </TouchableOpacity>
          )}
          {step < 3 ? (
            <TouchableOpacity style={[styles.btn, step > 1 && styles.btnFlex]} onPress={handleNext}>
              <Text style={styles.btnText}>Continua</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.btn, styles.btnFlex]} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Creeaza cont</Text>}
            </TouchableOpacity>
          )}
        </View>

        {step === 1 && (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.link}>Ai deja cont? Conecteaza-te</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flexGrow: 1, paddingHorizontal: 28, paddingVertical: 40 },
  logo: { fontSize: 32, fontWeight: '700', color: '#111', textAlign: 'center', marginBottom: 28 },

  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 36 },
  stepDot: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 2, borderColor: '#e0e0e0',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#111', borderColor: '#111' },
  stepDotText: { fontSize: 13, fontWeight: '700', color: '#ccc' },
  stepDotTextActive: { color: '#fff' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e0e0e0', marginHorizontal: 6 },
  stepLineActive: { backgroundColor: '#111' },

  stepTitle: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 20 },
  stepSubtitle: { fontSize: 14, color: '#888', marginBottom: 20, marginTop: -12 },
  label: { fontSize: 12, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },

  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    marginBottom: 12, color: '#111', backgroundColor: '#fafafa',
  },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#111', borderColor: '#111' },
  typeBtnText: { fontSize: 13, color: '#555', fontWeight: '500' },
  typeBtnTextActive: { color: '#fff' },

  uploadBox: {
    borderWidth: 1.5, borderColor: '#e0e0e0', borderStyle: 'dashed',
    borderRadius: 12, height: 130, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, backgroundColor: '#fafafa', overflow: 'hidden',
  },
  uploadPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  uploadIcon: { fontSize: 32, marginBottom: 8 },
  uploadText: { fontSize: 14, color: '#888' },

  error: { color: '#e53e3e', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  navRow: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 8 },
  backBtn: { flex: 1, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  backBtnText: { color: '#555', fontWeight: '600', fontSize: 16 },
  btn: { backgroundColor: '#111', borderRadius: 12, paddingVertical: 15, alignItems: 'center', paddingHorizontal: 32 },
  btnFlex: { flex: 1 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { textAlign: 'center', marginTop: 16, color: '#555', fontSize: 14 },
});
