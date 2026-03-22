import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from './src/hooks/useAuth';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import {View, Text} from 'react-native'

const Stack = createNativeStackNavigator();

export default function App() {
  const { session, loading } = useAuth();

  if (loading) return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Se incarca...</Text></View>;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {session
            ? <Stack.Screen name="Home" component={HomeScreen} />
            : <>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
              </>}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
