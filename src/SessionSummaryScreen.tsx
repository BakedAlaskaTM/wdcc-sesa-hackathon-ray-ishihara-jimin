import { useRef, useState } from 'react';
import { Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import type { FinalBillPlayer } from './useStackLobby';

type Props = {
  onHome: () => void;
  players: FinalBillPlayer[];
};

export function SessionSummaryScreen({ onHome, players }: Props) {
  const [costInput, setCostInput] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const receiptRef = useRef<View>(null);
  const cost = Number.parseFloat(costInput) || 0;
  const sorted = [...players].sort((a, b) => b.billPercent - a.billPercent);
  const isWeb = Platform.OS === 'web';

  const shareReceipt = async () => {
    if (isWeb || !receiptRef.current) return;

    setIsSharing(true);
    try {
      if (!(await Sharing.isAvailableAsync())) return;

      // Convert the rendered receipt into a PNG and pass its temporary file to
      // the iOS/Android native share sheet.
      const receiptImageUri = await captureRef(receiptRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      await Sharing.shareAsync(receiptImageUri, {
        dialogTitle: 'Share bill receipt',
        mimeType: 'image/png',
        UTI: 'public.png',
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#AAB7E9" barStyle="dark-content" />
      <ScrollView contentContainerStyle={[styles.content, isWeb && styles.phoneFrame]} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>{showReceipt ? 'PAYMENT RECEIPT' : 'SESSION COMPLETE'}</Text>
        <Text style={styles.title}>
          {showReceipt ? <>split the <Text style={styles.accent}>bill</Text></> : <>final <Text style={styles.accent}>bill</Text></>}
        </Text>

        {showReceipt ? (
          <>
            <View ref={receiptRef} collapsable={false} style={styles.receiptCapture}>
              <Text style={styles.receiptBrand}>PHONE FAIR</Text>
              <Text style={styles.receiptHeading}>Shared bill receipt</Text>
              <Text style={styles.subtitle}>Meal total: ${cost.toFixed(2)}</Text>
              <View style={styles.card}>
                {sorted.map((player) => (
                  <View key={player.userId} style={styles.receiptRow}>
                    <View>
                      <Text style={styles.name}>{player.displayName}</Text>
                      <Text style={styles.share}>{Math.round(player.billPercent)}% of the bill</Text>
                    </View>
                    <Text style={styles.amount}>${(cost * player.billPercent / 100).toFixed(2)}</Text>
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>TOTAL</Text>
                  <Text style={styles.totalAmount}>${cost.toFixed(2)}</Text>
                </View>
              </View>
            </View>
            <Pressable disabled={isSharing || isWeb} onPress={shareReceipt} style={[styles.shareButton, (isSharing || isWeb) && styles.shareButtonDisabled]}>
              <Text style={[styles.shareButtonText, (isSharing || isWeb) && styles.shareButtonTextDisabled]}>
                {isSharing ? 'PREPARING RECEIPT...' : isWeb ? 'SHARING AVAILABLE ON MOBILE' : 'SHARE RECEIPT'}
              </Text>
            </Pressable>
            <Pressable onPress={() => setShowReceipt(false)} style={styles.outlineButton}>
              <Text style={styles.outlineText}>← RE-ENTER COST</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>Review final shares, then enter the total below.</Text>
            <View style={styles.card}>
              {sorted.map((player, index) => {
                const isWinner = index === 0;
                return (
                  <View key={player.userId} style={[styles.playerCard, isWinner && styles.winner]}>
                    <View style={styles.row}>
                      <Text style={[styles.rank, isWinner && styles.winnerText]}>#{index + 1}</Text>
                      <Text numberOfLines={1} style={[styles.name, isWinner && styles.winnerText]}>{player.displayName}</Text>
                      <Text style={[styles.percent, isWinner && styles.winnerText]}>{Math.round(player.billPercent)}%</Text>
                    </View>
                    <View style={[styles.barTrack, isWinner && styles.winnerTrack]}>
                      <View style={[styles.bar, { width: `${Math.max(2, Math.min(100, player.billPercent))}%` }, isWinner && styles.winnerBar]} />
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={styles.costCard}>
              <Text style={styles.label}>MEAL TOTAL</Text>
              <View style={styles.costRow}>
                <Text style={styles.currency}>$</Text>
                <TextInput keyboardType="decimal-pad" onChangeText={(value) => setCostInput(value.replace(/[^0-9.]/g, ''))} placeholder="0.00" placeholderTextColor="rgba(21,18,31,0.35)" style={styles.costInput} value={costInput} />
              </View>
            </View>
            <Pressable disabled={cost <= 0} onPress={() => setShowReceipt(true)} style={[styles.primaryButton, cost <= 0 && styles.disabledButton]}>
              <Text style={[styles.primaryText, cost <= 0 && styles.disabledText]}>SHOW RECEIPT</Text>
            </Pressable>
          </>
        )}
        <Pressable onPress={onHome} style={styles.homeButton}><Text style={styles.homeText}>RETURN HOME</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#AAB7E9', flex: 1 },
  content: { flexGrow: 1, gap: 18, padding: 26, paddingTop: 52 },
  phoneFrame: { alignSelf: 'center', borderColor: '#15121F', borderLeftWidth: 3, borderRightWidth: 3, maxWidth: '100%', minHeight: '100%', width: 390 },
  eyebrow: { color: 'rgba(21,18,31,0.6)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#15121F', fontSize: 31, fontWeight: '800' },
  accent: { color: '#3E4AA0' },
  subtitle: { color: 'rgba(21,18,31,0.65)', fontSize: 14, fontWeight: '600', marginTop: -10 },
  receiptCapture: { backgroundColor: '#AAB7E9', gap: 14, padding: 2 },
  receiptBrand: { color: '#3E4AA0', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  receiptHeading: { color: '#15121F', fontSize: 25, fontWeight: '800' },
  card: { backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 20, borderWidth: 2.5, gap: 9, padding: 14 },
  playerCard: { borderColor: '#15121F', borderRadius: 14, borderWidth: 2, gap: 10, padding: 13 },
  winner: { backgroundColor: '#3E4AA0' },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  rank: { color: '#3E4AA0', fontSize: 15, fontWeight: '800', width: 28 },
  name: { color: '#15121F', flex: 1, fontSize: 16, fontWeight: '800' },
  percent: { color: '#15121F', fontSize: 19, fontVariant: ['tabular-nums'], fontWeight: '800' },
  winnerText: { color: '#F5EFDA' },
  barTrack: { backgroundColor: 'rgba(21,18,31,0.14)', borderColor: '#15121F', borderRadius: 7, borderWidth: 1, height: 12, overflow: 'hidden' },
  bar: { backgroundColor: '#76E5B1', borderRadius: 6, height: '100%' },
  winnerTrack: { backgroundColor: 'rgba(245,239,218,0.28)', borderColor: '#F5EFDA' },
  winnerBar: { backgroundColor: '#F5EFDA' },
  costCard: { backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 18, borderWidth: 2.5, gap: 8, padding: 16 },
  label: { color: '#15121F', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  costRow: { alignItems: 'center', flexDirection: 'row' },
  currency: { color: '#3E4AA0', fontSize: 32, fontWeight: '800', marginRight: 5 },
  costInput: { color: '#15121F', flex: 1, fontSize: 32, fontVariant: ['tabular-nums'], fontWeight: '800', paddingVertical: 4 },
  primaryButton: { alignItems: 'center', backgroundColor: '#15121F', borderColor: '#15121F', borderRadius: 18, borderWidth: 3, justifyContent: 'center', minHeight: 58 },
  primaryText: { color: '#F5EFDA', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  disabledButton: { backgroundColor: 'rgba(21,18,31,0.15)' },
  disabledText: { color: 'rgba(21,18,31,0.4)' },
  receiptRow: { alignItems: 'center', borderBottomColor: 'rgba(21,18,31,0.18)', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  share: { color: 'rgba(21,18,31,0.6)', fontSize: 12, fontWeight: '700', marginTop: 2 },
  amount: { color: '#3E4AA0', fontSize: 20, fontVariant: ['tabular-nums'], fontWeight: '800' },
  totalRow: { alignItems: 'center', borderTopColor: '#15121F', borderTopWidth: 2, flexDirection: 'row', justifyContent: 'space-between', marginTop: 3, paddingHorizontal: 2, paddingTop: 14 },
  totalLabel: { color: '#15121F', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  totalAmount: { color: '#3E4AA0', fontSize: 24, fontVariant: ['tabular-nums'], fontWeight: '800' },
  shareButton: { alignItems: 'center', backgroundColor: '#3E4AA0', borderColor: '#15121F', borderRadius: 16, borderWidth: 2.5, justifyContent: 'center', minHeight: 52 },
  shareButtonText: { color: '#F5EFDA', fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  shareButtonDisabled: { backgroundColor: 'rgba(21,18,31,0.15)' },
  shareButtonTextDisabled: { color: 'rgba(21,18,31,0.5)' },
  outlineButton: { alignItems: 'center', borderColor: '#15121F', borderRadius: 16, borderWidth: 2.5, justifyContent: 'center', minHeight: 52 },
  outlineText: { color: '#15121F', fontSize: 13, fontWeight: '800', letterSpacing: 0.4 },
  homeButton: { alignItems: 'center', backgroundColor: '#15121F', borderColor: '#15121F', borderRadius: 20, borderWidth: 3, justifyContent: 'center', marginTop: 'auto', minHeight: 62 },
  homeText: { color: '#F5EFDA', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});
