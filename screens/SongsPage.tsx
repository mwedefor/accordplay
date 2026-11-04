import React from 'react';
import ScreenLayout from '../components/ScreenLayout';
import SongsGrid from '../components/SongsGrid';
import { useSongs } from '../hooks/useSongs';

export default function SongsPage({ navigation }: { navigation: any }) {
  const { songs, loading, error, refresh } = useSongs();

  return (
    <ScreenLayout navigation={navigation} activeKey="Library">
      <SongsGrid
        songs={songs}
        loading={loading}
        error={error}
        onRefresh={refresh}
        navigation={navigation}
      />
    </ScreenLayout>
  );
}
