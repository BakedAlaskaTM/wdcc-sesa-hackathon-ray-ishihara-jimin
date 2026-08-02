import { useRef } from 'react';
import { ActivityIndicator, Platform, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  code: string;
  error?: string | null;
  isLoading: boolean;
  onChangeCode: (value: string) => void;
  onCreate: () => void;
  onJoin: () => void;
  onDemo: () => void;
  onOpenHistory?: () => void;
};

const codeSlots = (code: string) => Array.from({ length: 4 }, (_, index) => code[index] ?? '');

export function CreateLobbyScreen({ code, error, isLoading, onChangeCode, onCreate, onDemo, onJoin, onOpenHistory }: Props) {
  const isWeb = Platform.OS === 'web';
  const codeInputRef = useRef<TextInput>(null);
  return <SafeAreaView style={[styles.safeArea, isWeb && styles.webCanvas]}>
    <StatusBar backgroundColor="#E6ECFB" barStyle="dark-content" />
    <View style={[styles.content, isWeb && styles.phoneFrame]}>
      <View>
        <View style={styles.header}>
          <View><Text style={styles.greeting}>hey there,</Text><Text style={styles.headline}>phones, together.</Text></View>
          <View style={styles.stacky}><View style={styles.stackyEyes}><View style={styles.eye} /><View style={styles.eye} /></View></View>
        </View>

        <Pressable disabled={isLoading} onPress={onCreate} style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}>
          <View style={styles.plus}><View style={styles.plusVertical} /><View style={styles.plusHorizontal} /></View>
          <View>{isLoading ? <ActivityIndicator color="#2E2A3A" /> : <><Text style={styles.createTitle}>create a stack</Text><Text style={styles.createCaption}>start a new lobby</Text></>}</View>
        </Pressable>

        <View style={styles.joinCard}>
          <Text style={styles.label}>JOIN WITH A CODE</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Enter lobby code" onPress={() => codeInputRef.current?.focus()} style={styles.slotRow}>{codeSlots(code).map((digit, index) => <View key={index} style={styles.slot}><Text style={styles.slotText}>{digit}</Text></View>)}</Pressable>
          <TextInput ref={codeInputRef} accessibilityLabel="Lobby code" editable={!isLoading} keyboardType="number-pad" maxLength={4} onChangeText={(value) => onChangeCode(value.replace(/\D/g, '').slice(0, 4))} style={styles.codeInput} value={code} />
          <Pressable disabled={isLoading || code.length !== 4} onPress={onJoin} style={({ pressed }) => [styles.joinButton, (isLoading || code.length !== 4) && styles.disabled, pressed && styles.pressed]}><Text style={styles.joinText}>join the stack</Text></Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>YOUR CREWS</Text>
        <Pressable disabled={!onOpenHistory} onPress={onOpenHistory} style={styles.crewCard}>
          <View style={styles.avatarStack}><View style={[styles.avatar, { backgroundColor: '#86CBA3' }]} /><View style={[styles.avatar, styles.avatarOverlap, { backgroundColor: '#F0908B' }]} /><View style={[styles.avatar, styles.avatarOverlap, { backgroundColor: '#B79DDD' }]} /></View>
          <View style={styles.crewCopy}><Text style={styles.crewName}>your crew</Text><Text style={styles.crewMeta}>friends · past stacks</Text></View><Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable onPress={onDemo} style={styles.demoButton}><Text style={styles.demoText}>try the live demo</Text></Pressable>
      </View>

      <View style={styles.nav}><Pressable disabled={!onOpenHistory} onPress={onOpenHistory} style={styles.navItem}><Text style={styles.navIcon}>⌂</Text></Pressable><View style={styles.navItem}><Text style={styles.navIcon}>▥</Text></View><View style={styles.navAdd}><Text style={styles.navAddText}>+</Text></View><Pressable disabled={!onOpenHistory} onPress={onOpenHistory} style={styles.navItem}><Text style={styles.navIcon}>◷</Text></Pressable><View style={styles.navItem}><Text style={styles.navIcon}>●</Text></View></View>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#EFEAF9', flex: 1 }, webCanvas: { backgroundColor: '#ECE7DF' }, phoneFrame: { alignSelf: 'center', backgroundColor: '#EFEAF9', borderColor: '#2E2A3A', borderLeftWidth: 2, borderRightWidth: 2, maxWidth: '100%', minHeight: '100%', width: 390 },
  content: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, greeting: { color: 'rgba(46,42,58,.62)', fontSize: 13, fontWeight: '600' }, headline: { color: '#2E2A3A', fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginTop: 1 }, stacky: { alignItems: 'center', backgroundColor: '#86CBA3', borderColor: '#2E2A3A', borderRadius: 12, borderWidth: 2, height: 40, justifyContent: 'center', width: 40 }, stackyEyes: { flexDirection: 'row', gap: 7 }, eye: { backgroundColor: '#2E2A3A', borderRadius: 3, height: 5, width: 5 },
  createButton: { alignItems: 'center', backgroundColor: '#F6C94B', borderColor: '#2E2A3A', borderRadius: 22, borderWidth: 2, flexDirection: 'row', gap: 14, marginTop: 19, paddingHorizontal: 17, paddingVertical: 13, shadowColor: '#2E2A3A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }, plus: { alignItems: 'center', backgroundColor: '#FFFDF9', borderColor: '#2E2A3A', borderRadius: 11, borderWidth: 2, height: 35, justifyContent: 'center', width: 35 }, plusVertical: { backgroundColor: '#2E2A3A', borderRadius: 1, height: 16, position: 'absolute', width: 2 }, plusHorizontal: { backgroundColor: '#2E2A3A', borderRadius: 1, height: 2, width: 16 }, createTitle: { color: '#2E2A3A', fontSize: 17, fontWeight: '800' }, createCaption: { color: 'rgba(46,42,58,.63)', fontSize: 12, fontWeight: '600' },
  joinCard: { backgroundColor: '#FFFDF9', borderColor: '#2E2A3A', borderRadius: 22, borderWidth: 2, marginTop: 16, padding: 15 }, label: { color: 'rgba(46,42,58,.56)', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginTop: 17 }, joinCardLabel: {}, slotRow: { flexDirection: 'row', gap: 9, marginTop: 10 }, slot: { alignItems: 'center', backgroundColor: '#EFEAF9', borderColor: '#2E2A3A', borderRadius: 15, borderWidth: 2, flex: 1, height: 64, justifyContent: 'center' }, slotText: { color: '#2E2A3A', fontSize: 27, fontWeight: '800' }, codeInput: { height: 1, opacity: 0, position: 'absolute', width: 1 }, joinButton: { alignItems: 'center', backgroundColor: '#2E2A3A', borderRadius: 14, justifyContent: 'center', marginTop: 11, minHeight: 45 }, joinText: { color: '#FFFDF9', fontSize: 14, fontWeight: '800' }, disabled: { opacity: .45 }, error: { color: '#B44D50', fontSize: 12, fontWeight: '700', marginTop: 9 },
  crewCard: { alignItems: 'center', backgroundColor: '#FFFDF9', borderColor: '#2E2A3A', borderRadius: 18, borderWidth: 2, flexDirection: 'row', marginTop: 9, padding: 12 }, avatarStack: { flexDirection: 'row', marginRight: 10 }, avatar: { borderColor: '#2E2A3A', borderRadius: 14, borderWidth: 2, height: 28, width: 28 }, avatarOverlap: { marginLeft: -10 }, crewCopy: { flex: 1 }, crewName: { color: '#2E2A3A', fontSize: 14, fontWeight: '800' }, crewMeta: { color: 'rgba(46,42,58,.55)', fontSize: 11, fontWeight: '600', marginTop: 1 }, chevron: { color: '#B79DDD', fontSize: 24, fontWeight: '800' }, demoButton: { alignSelf: 'center', padding: 11 }, demoText: { color: '#3E4AA0', fontSize: 12, fontWeight: '800' },
  nav: { alignItems: 'center', backgroundColor: '#FFFDF9', borderColor: '#2E2A3A', borderRadius: 24, borderWidth: 2, flexDirection: 'row', height: 56, justifyContent: 'space-around', marginBottom: 16, paddingHorizontal: 15 }, navItem: { alignItems: 'center', flex: 1, justifyContent: 'center' }, navIcon: { color: 'rgba(46,42,58,.58)', fontSize: 16, fontWeight: '800', lineHeight: 17 }, navText: { color: 'rgba(46,42,58,.58)', fontSize: 9, fontWeight: '800' }, navAdd: { alignItems: 'center', backgroundColor: '#F6C94B', borderColor: '#2E2A3A', borderRadius: 22, borderWidth: 2, height: 44, justifyContent: 'center', marginTop: -22, shadowColor: '#2E2A3A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0, width: 44 }, navAddText: { color: '#2E2A3A', fontSize: 24, fontWeight: '700', lineHeight: 27 }, pressed: { shadowOpacity: 0, transform: [{ translateY: 3 }] },
});
