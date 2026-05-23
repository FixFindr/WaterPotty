import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007aff',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          // TODO: Add map icon via expo/vector-icons in Phase 4
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          // TODO: Add person icon via expo/vector-icons in Phase 4
        }}
      />
    </Tabs>
  )
}
