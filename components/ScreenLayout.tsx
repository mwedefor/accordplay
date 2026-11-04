import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from './AppHeader';
import SideDrawer from './SideDrawer';
import NavRail from './NavRail';

interface Props {
  navigation: any;
  activeKey?: string;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

export default function ScreenLayout({ navigation, activeKey, children, contentStyle }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <AppHeader navigation={navigation} />
      <View style={[styles.body, { paddingBottom: insets.bottom }]}>
        <NavRail navigation={navigation} activeKey={activeKey} />
        <View style={[styles.content, contentStyle]}>
          {children}
        </View>
      </View>
      <SideDrawer navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  body:    { flex: 1, flexDirection: 'row' },
  content: { flex: 1 },
});
