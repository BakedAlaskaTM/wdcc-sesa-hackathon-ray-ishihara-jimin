import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Props = {
  lobbyCode: string;
  isJoining?: boolean;
  error?: string | null;
  onBack: () => void;
  onJoin: (name: string) => void;
};

export function EnterNameScreen({ lobbyCode, isJoining = false, error, onBack, onJoin }: Props) {
  const [name, setName] = useState('');
  const isWeb = Platform.OS === 'web';
  const trimmedName = name.trim();
  const isDisabled = !trimmedName || isJoining;

  return (
    <SafeAreaView style={[styles.safeArea, isWeb && styles.webCanvas]}>
      <StatusBar barStyle="dark-content" backgroundColor="#AAB7E9" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.content, isWeb && styles.phoneFrame]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Pressable onPress={onBack}><Text style={styles.back}>← Back</Text></Pressable>
            <Text style={styles.headline}>what&apos;s your</Text>
            <Text style={styles.tagline}>player <Text style={styles.accent}>name</Text>?</Text>

            <Text style={styles.fieldLabel}>YOUR DISPLAY NAME</Text>
            <TextInput
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              editable={!isJoining}
              maxLength={24}
              onChangeText={setName}
              onSubmitEditing={() => { if (!isDisabled) onJoin(trimmedName); }}
              placeholder="e.g. Jordan"
              placeholderTextColor="rgba(21,18,31,0.4)"
              returnKeyType="done"
              style={styles.nameInput}
              value={name}
            />
            <Text style={styles.hint}>This name will show on the leaderboard.</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={[styles.buttonShadow, isDisabled && styles.buttonShadowDisabled]}>
              <Pressable
                accessibilityRole="button"
                disabled={isDisabled}
                onPress={() => onJoin(trimmedName)}
                style={({ pressed }) => [styles.joinButton, isDisabled && styles.joinButtonDisabled, pressed && styles.joinButtonPressed]}
              >
                {isJoining ? <ActivityIndicator color="#F5EFDA" /> : <Text style={[styles.joinText, isDisabled && styles.joinTextDisabled]}>JOIN LOBBY</Text>}
              </Pressable>
            </View>
          </View>

          <Text style={styles.lobbyCode}>LOBBY CODE: {lobbyCode.toUpperCase()}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { backgroundColor: '#EFEAF9', flex: 1 },
  webCanvas: { backgroundColor: '#AAB7E9' },
  phoneFrame: { alignSelf: 'center', borderColor: '#15121F', borderLeftWidth: 3, borderRightWidth: 3, maxWidth: '100%', minHeight: '100%', width: 390 },
  content: { flexGrow: 1, justifyContent: 'space-between', paddingBottom: 22, paddingHorizontal: 26, paddingTop: 52 },
  back: { color: '#15121F', fontSize: 13, fontWeight: '800', marginBottom: 20 },
  headline: { color: '#15121F', fontSize: 26, fontWeight: '800', lineHeight: 28 },
  tagline: { color: '#15121F', fontSize: 26, fontWeight: '700', lineHeight: 28, marginBottom: 24 },
  accent: { color: '#3E4AA0', fontWeight: '800' },
  fieldLabel: { color: '#15121F', fontSize: 11, fontWeight: '700', letterSpacing: 1.3, marginBottom: 8 },
  nameInput: { backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 20, borderWidth: 3, color: '#15121F', fontSize: 14, fontWeight: '800', minHeight: 56, paddingHorizontal: 18, paddingVertical: 14, width: '100%' },
  hint: { color: 'rgba(21,18,31,0.6)', fontSize: 12, fontWeight: '600', marginBottom: 22, marginTop: 8 },
  error: { color: '#761C2C', fontSize: 12, fontWeight: '700', marginBottom: 10, marginTop: -10 },
  buttonShadow: { backgroundColor: '#3E4AA0', borderRadius: 20, marginRight: -5, paddingBottom: 5, paddingRight: 5 },
  buttonShadowDisabled: { backgroundColor: 'transparent', marginRight: 0, paddingBottom: 0, paddingRight: 0 },
  joinButton: { alignItems: 'center', backgroundColor: '#15121F', borderColor: '#15121F', borderRadius: 20, borderWidth: 3, justifyContent: 'center', minHeight: 62, paddingHorizontal: 18, paddingVertical: 17 },
  joinButtonDisabled: { backgroundColor: 'rgba(21,18,31,0.15)' },
  joinButtonPressed: { opacity: 0.86, transform: [{ translateX: 2 }, { translateY: 2 }] },
  joinText: { color: '#F5EFDA', fontSize: 15, fontWeight: '800', letterSpacing: 0.45 },
  joinTextDisabled: { color: 'rgba(21,18,31,0.4)' },
  lobbyCode: { color: 'rgba(21,18,31,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 1.3, marginTop: 32 },
});
