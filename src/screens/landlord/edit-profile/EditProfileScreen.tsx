import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { Brand } from '@/constants/brand';
import { useAuth } from '@/store/auth';

import { styles } from './styles';

export function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');

  const canSave = name.trim().length > 0 && email.trim().length > 0;

  const saveProfile = async () => {
    if (!canSave || !user) return;

    try {
      await updateProfile({ name: name.trim(), email: email.trim() });
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save your profile.';
      Alert.alert('Save failed', message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={Brand.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.card}>
            <TextField
              label="Full Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              placeholder="Enter your full name"
            />
            <TextField
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              placeholder="Enter your email"
              textContentType="emailAddress"
              autoCapitalize="none"
              containerStyle={{ marginTop: 16 }}
            />
          </View>

          <View style={styles.actions}>
            <PrimaryButton label="Save Changes" onPress={saveProfile} disabled={!canSave} />
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default EditProfileScreen;
