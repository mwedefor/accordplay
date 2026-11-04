import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './context/AuthContext';
import { DrawerProvider } from './context/DrawerContext';
import { UserProfileProvider } from './context/UserProfileContext';
import LoginScreen        from './screens/LoginScreen';
import HomeScreen         from './screens/HomeScreen';
import AccordionScreen    from './screens/AccordionScreen';
import PianoScreen        from './screens/PianoScreen';
import SongsPage          from './screens/SongsPage';
import SubscriptionScreen from './screens/SubscriptionScreen';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a0a2e' }}>
        <ActivityIndicator size="large" color="#c4b5fd" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!token ? (
        <Stack.Screen name="Login"     component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Home"         component={HomeScreen} />
          <Stack.Screen name="Accordion"    component={AccordionScreen} />
          <Stack.Screen name="Piano"        component={PianoScreen} />
          <Stack.Screen name="Songs"        component={SongsPage} />
          <Stack.Screen name="Subscription" component={SubscriptionScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <UserProfileProvider>
        <DrawerProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <RootNavigator />
          </NavigationContainer>
        </DrawerProvider>
      </UserProfileProvider>
    </AuthProvider>
  );
}
