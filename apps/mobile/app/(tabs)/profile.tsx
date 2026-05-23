import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'

export default function ProfileScreen() {
  const { profile, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    router.replace('/(auth)/login')
  }

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <Text className="text-2xl font-bold mt-8 mb-6 text-gray-900">Profile</Text>

      {profile != null ? (
        <View className="mb-6 p-4 bg-gray-50 rounded-xl">
          <Text className="text-base font-medium text-gray-900">
            @{profile.anonymous_username}
          </Text>
          <Text className="text-sm text-gray-500 mt-1 capitalize">
            {profile.tier} tier
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            {profile.credits} credit{profile.credits !== 1 ? 's' : ''}
          </Text>
        </View>
      ) : (
        <View className="mb-6 p-4 bg-gray-50 rounded-xl">
          <Text className="text-sm text-gray-500">Loading profile…</Text>
        </View>
      )}

      <Pressable
        onPress={handleSignOut}
        className="bg-red-500 rounded-xl py-4 items-center"
      >
        <Text className="text-white font-semibold text-base">Sign Out</Text>
      </Pressable>
    </SafeAreaView>
  )
}
