import { ActivityIndicator, Platform, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  code: string;
  error?: string | null;
  isLoading: boolean;
  onChangeCode: (value: string) => void;
  onCreate: () => void;
  onJoin: () => void;
  onOpenHistory?: () => void;
};

/** Native implementation of the supplied lobby-app mockup. */
export function CreateLobbyScreen({ code, error, isLoading, onChangeCode, onCreate, onJoin, onOpenHistory }: Props) {
  const isWeb = Platform.OS === 'web';
  return (
    <SafeAreaView style={[styles.safeArea, isWeb && styles.webCanvas]}>
      <StatusBar backgroundColor="#AAB7E9" barStyle="dark-content" />
      <View style={[styles.content, isWeb && styles.phoneFrame]}>
        <View>
          <Text style={styles.headline}>phone time</Text>
          <Text style={styles.tagline}>or <Text style={styles.accent}>friend</Text> time?</Text>

          <View style={styles.buttonShadow}>
            <Pressable disabled={isLoading} onPress={onCreate} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              {isLoading ? <ActivityIndicator color="#F5EFDA" /> : <Text style={styles.primaryText}>+ CREATE LOBBY</Text>}
            </Pressable>
          </View>

          <Text style={styles.dividerLabel}>OR JOIN A FRIEND</Text>
          <TextInput
            editable={!isLoading}
            keyboardType="number-pad"
            maxLength={4}
            onChangeText={(value) => onChangeCode(value.replace(/\D/g, '').slice(0, 4))}
            placeholder="0000"
            placeholderTextColor="rgba(245,239,218,0.5)"
            style={styles.codeInput}
            value={code}
          />
          <Pressable disabled={isLoading || code.length !== 4} onPress={onJoin} style={({ pressed }) => [styles.secondaryButton, (isLoading || code.length !== 4) && styles.disabledButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryText}>JOIN WITH CODE</Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.nav}>
          {onOpenHistory ? <Pressable onPress={onOpenHistory} style={styles.navLink}><Text style={styles.navText}>Leaderboard</Text><Text style={styles.chevron}>›</Text></Pressable> : null}
          <View style={styles.navLink}><Text style={styles.navText}>Options</Text><Text style={styles.chevron}>›</Text></View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#AAB7E9', flex: 1 },
  webCanvas: { backgroundColor: '#AAB7E9' },
  phoneFrame: { alignSelf: 'center', borderColor: '#15121F', borderLeftWidth: 3, borderRightWidth: 3, maxWidth: '100%', minHeight: '100%', width: 390 },
  content: { flex: 1, justifyContent: 'space-between', paddingBottom: 22, paddingHorizontal: 26, paddingTop: 52 },
  headline: { color: '#15121F', fontSize: 26, fontWeight: '800', lineHeight: 28 },
  tagline: { color: '#15121F', fontSize: 26, fontWeight: '700', lineHeight: 28, marginBottom: 24 },
  accent: { color: '#3E4AA0', fontWeight: '800' },
  buttonShadow: { backgroundColor: '#3E4AA0', borderRadius: 20, marginRight: -5, paddingBottom: 5, paddingRight: 5 },
  primaryButton: { alignItems: 'center', backgroundColor: '#15121F', borderColor: '#15121F', borderRadius: 20, borderWidth: 3, justifyContent: 'center', minHeight: 62, paddingHorizontal: 18 },
  primaryText: { color: '#F5EFDA', fontSize: 15, fontWeight: '800', letterSpacing: 0.45 },
  dividerLabel: { color: '#15121F', fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 8, marginTop: 22 },
  codeInput: { backgroundColor: '#15121F', borderColor: '#15121F', borderRadius: 12, borderWidth: 2, color: '#F5EFDA', fontSize: 20, fontWeight: '800', letterSpacing: 12, minHeight: 58, paddingHorizontal: 18, textAlign: 'center' },
  secondaryButton: { alignItems: 'center', backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 16, borderWidth: 2.5, justifyContent: 'center', marginTop: 12, minHeight: 52, paddingHorizontal: 18 },
  secondaryText: { color: '#15121F', fontSize: 13, fontWeight: '800', letterSpacing: 0.35 },
  disabledButton: { opacity: 0.5 },
  pressed: { opacity: 0.86, transform: [{ translateX: 2 }, { translateY: 2 }] },
  error: { color: '#761C2C', fontSize: 12, fontWeight: '700', marginTop: 10 },
  nav: { gap: 10 },
  navLink: { alignItems: 'center', backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 16, borderWidth: 2.5, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  navText: { color: '#15121F', fontSize: 13, fontWeight: '800' },
  chevron: { color: 'rgba(21,18,31,0.5)', fontSize: 22, fontWeight: '700', lineHeight: 18 },
});
