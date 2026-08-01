import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as ExpoLinking from 'expo-linking';
import { captureRef } from 'react-native-view-shot';
import { initStripe, useStripe } from '@stripe/stripe-react-native';
import type { FinalBillPlayer } from './useStackLobby';
import { getLobbyServerUrl } from './lobbyServerUrl';

type Props = {
  activityTimeline?: number[];
  lobbyName?: string;
  onHome: () => void;
  players: FinalBillPlayer[];
  paymentUserId?: string;
  roomCode?: string;
  timelineLabels?: { start: string; end: string };
};

const TIMELINE_SEGMENTS = 36;

function makeTimelineBuckets(activityTimeline: number[]) {
  if (!activityTimeline.length) return Array.from({ length: TIMELINE_SEGMENTS }, () => 0);
  if (activityTimeline.length <= TIMELINE_SEGMENTS) {
    return Array.from({ length: TIMELINE_SEGMENTS }, (_, index) => activityTimeline[Math.min(activityTimeline.length - 1, Math.floor(index * activityTimeline.length / TIMELINE_SEGMENTS))]);
  }
  return Array.from({ length: TIMELINE_SEGMENTS }, (_, index) => {
    const start = Math.floor(index * activityTimeline.length / TIMELINE_SEGMENTS);
    const end = Math.max(start + 1, Math.floor((index + 1) * activityTimeline.length / TIMELINE_SEGMENTS));
    return Math.max(...activityTimeline.slice(start, end));
  });
}

export function SessionSummaryScreen({ activityTimeline = [], lobbyName, onHome, paymentUserId, players, roomCode, timelineLabels }: Props) {
  const [costInput, setCostInput] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'paid'>('idle');
  const [hostUserId, setHostUserId] = useState<string | null>(null);
  const [sharedMealTotalCents, setSharedMealTotalCents] = useState<number | null>(null);
  const [paidUserIds, setPaidUserIds] = useState<string[]>([]);
  const [activitySecondsByUser, setActivitySecondsByUser] = useState<Record<string, number>>({});
  const receiptRef = useRef<View>(null);
  const enteredCost = Number.parseFloat(costInput) || 0;
  const cost = roomCode && sharedMealTotalCents !== null ? sharedMealTotalCents / 100 : enteredCost;
  const sorted = [...players].sort((a, b) => b.billPercent - a.billPercent);
  const isWeb = Platform.OS === 'web';
  const timelineBuckets = makeTimelineBuckets(activityTimeline);
  const payingPlayer = players.find((player) => player.userId === paymentUserId) ?? players.find((player) => player.displayName === 'You') ?? players[0];
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const isHost = !roomCode || hostUserId === paymentUserId;
  const hasPaidPlayer = paidUserIds.length > 0;
  const isCurrentPlayerPaid = Boolean(payingPlayer && (paidUserIds.includes(payingPlayer.userId) || paymentStatus === 'paid'));
  const funStats = roomCode
    ? sorted.filter((player) => (activitySecondsByUser[player.userId] ?? 0) > 0).sort((a, b) => (activitySecondsByUser[b.userId] ?? 0) - (activitySecondsByUser[a.userId] ?? 0)).slice(0, 3)
    : sorted.slice(0, 3);

  useEffect(() => {
    if (!roomCode) return;
    let mounted = true;
    const loadSummary = async () => {
      try {
        const response = await fetch(`${getLobbyServerUrl()}/session/summary?roomCode=${encodeURIComponent(roomCode)}`);
        const summary = await response.json() as { hostUserId?: string; mealTotalCents?: number | null; paidUserIds?: string[]; activitySecondsByUser?: Record<string, number> };
        if (!mounted || !response.ok) return;
        setHostUserId(summary.hostUserId ?? null);
        setSharedMealTotalCents(summary.mealTotalCents ?? null);
        setPaidUserIds(summary.paidUserIds ?? []);
        setActivitySecondsByUser(summary.activitySecondsByUser ?? {});
        if (summary.mealTotalCents !== null && summary.mealTotalCents !== undefined) setShowReceipt(true);
      } catch { /* Keep the local summary usable while the lobby server reconnects. */ }
    };
    void loadSummary();
    const timer = setInterval(loadSummary, 2_000);
    return () => { mounted = false; clearInterval(timer); };
  }, [roomCode]);

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

  const submitMealTotal = async () => {
    if (enteredCost <= 0) return;
    if (!roomCode) { setShowReceipt(true); return; }
    setPaymentError(null);
    try {
      const response = await fetch(`${getLobbyServerUrl()}/session/meal-total`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, userId: paymentUserId, amountCents: Math.round(enteredCost * 100) }),
      });
      const summary = await response.json() as { error?: string; mealTotalCents?: number; paidUserIds?: string[] };
      if (!response.ok || summary.mealTotalCents === undefined) throw new Error(summary.error ?? 'Could not submit the meal total.');
      setSharedMealTotalCents(summary.mealTotalCents);
      setPaidUserIds(summary.paidUserIds ?? []);
      setShowReceipt(true);
    } catch (error) { setPaymentError(error instanceof Error ? error.message : 'Could not submit the meal total.'); }
  };

  const payMerchant = async () => {
    if (!payingPlayer || cost <= 0) return;
    setIsStartingCheckout(true);
    setPaymentError(null);
    try {
      const amountCents = Math.round(cost * payingPlayer.billPercent);
      if (!isWeb) {
        const intentResponse = await fetch(`${getLobbyServerUrl()}/payments/intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amountCents, payerName: payingPlayer.displayName, payerId: payingPlayer.userId, roomCode }),
        });
        const intentPayload = await intentResponse.json() as { clientSecret?: string; error?: string; publishableKey?: string };
        if (!intentResponse.ok || !intentPayload.clientSecret || !intentPayload.publishableKey) throw new Error(intentPayload.error ?? 'Could not prepare the in-app payment.');

        await initStripe({ publishableKey: intentPayload.publishableKey, urlScheme: ExpoLinking.createURL('/--/') });
        const { error: sheetError } = await initPaymentSheet({
          merchantDisplayName: 'Phone Time',
          paymentIntentClientSecret: intentPayload.clientSecret,
          returnURL: ExpoLinking.createURL('/--/'),
        });
        if (sheetError) throw new Error(sheetError.message);

        const { error: paymentSheetError } = await presentPaymentSheet();
        if (paymentSheetError) {
          if (paymentSheetError.code !== 'Canceled') throw new Error(paymentSheetError.message);
          return;
        }
        if (roomCode) {
          const confirmation = await fetch(`${getLobbyServerUrl()}/session/payment-confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomCode, payerId: payingPlayer.userId }) });
          const summary = await confirmation.json() as { error?: string; paidUserIds?: string[] };
          if (!confirmation.ok) throw new Error(summary.error ?? 'Stripe payment confirmation is pending.');
          setPaidUserIds(summary.paidUserIds ?? []);
        }
        setPaymentStatus('paid');
        return;
      }

      const response = await fetch(`${getLobbyServerUrl()}/payments/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents, payerName: payingPlayer.displayName, roomCode }),
      });
      const payload = await response.json() as { checkoutUrl?: string; error?: string; sessionId?: string };
      if (!response.ok || !payload.checkoutUrl || !payload.sessionId) throw new Error(payload.error ?? 'Could not start checkout.');
      setPaymentStatus('pending');
      void pollForPayment(payload.sessionId);
      await Linking.openURL(payload.checkoutUrl);
    } catch (error) {
      setPaymentStatus('idle');
      setPaymentError(error instanceof Error ? error.message : 'Could not start checkout.');
    } finally {
      setIsStartingCheckout(false);
    }
  };

  const pollForPayment = async (sessionId: string) => {
    for (let attempt = 0; attempt < 90; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      try {
        const response = await fetch(`${getLobbyServerUrl()}/payments/status?sessionId=${encodeURIComponent(sessionId)}`);
        const payload = await response.json() as { paymentStatus?: string };
        if (payload.paymentStatus === 'paid') {
          setPaymentStatus('paid');
          return;
        }
      } catch {
        // Keep polling while the browser payment flow is open or the app resumes.
      }
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
        {lobbyName ? <Text style={styles.lobbyName}>{lobbyName}</Text> : null}

        {showReceipt ? (
          <>
            <View ref={receiptRef} collapsable={false} style={styles.receiptCapture}>
              <Text style={styles.receiptBrand}>PHONE TIME</Text>
              <Text style={styles.receiptHeading}>{lobbyName || 'Shared bill receipt'}</Text>
              <Text style={styles.subtitle}>Meal total: ${cost.toFixed(2)}</Text>
              <View style={styles.card}>
                {sorted.map((player) => {
                  const isPaidPlayer = paidUserIds.includes(player.userId) || (paymentStatus === 'paid' && player.userId === payingPlayer?.userId);
                  return (
                  <View key={player.userId} style={[styles.receiptRow, isPaidPlayer && styles.paidReceiptRow]}>
                    <View>
                      <Text style={[styles.name, isPaidPlayer && styles.paidReceiptText]}>{player.displayName}{isPaidPlayer ? ' · PAID' : ''}</Text>
                      <Text style={[styles.share, isPaidPlayer && styles.paidReceiptText]}>{Math.round(player.billPercent)}% of the bill</Text>
                    </View>
                    <Text style={[styles.amount, isPaidPlayer && styles.paidReceiptText]}>${(cost * player.billPercent / 100).toFixed(2)}</Text>
                  </View>
                  );
                })}
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
            {payingPlayer ? <Pressable disabled={isStartingCheckout || paymentStatus !== 'idle' || isCurrentPlayerPaid} onPress={payMerchant} style={[styles.payButton, (isStartingCheckout || paymentStatus === 'pending') && styles.shareButtonDisabled, isCurrentPlayerPaid && styles.paidButton]}><Text style={[styles.payButtonText, paymentStatus === 'pending' && styles.shareButtonTextDisabled, isCurrentPlayerPaid && styles.paidButtonText]}>{isCurrentPlayerPaid ? 'PAID ✓' : paymentStatus === 'pending' ? 'AWAITING PAYMENT...' : isStartingCheckout ? 'OPENING CHECKOUT...' : `PAY $${(cost * payingPlayer.billPercent / 100).toFixed(2)} TO RESTAURANT`}</Text></Pressable> : null}
            {paymentError ? <Text style={styles.paymentError}>{paymentError}</Text> : null}
            {isHost ? <Pressable disabled={hasPaidPlayer} onPress={() => { setCostInput(cost.toFixed(2)); setShowReceipt(false); }} style={[styles.outlineButton, hasPaidPlayer && styles.shareButtonDisabled]}>
              <Text style={[styles.outlineText, hasPaidPlayer && styles.shareButtonTextDisabled]}>CHANGE MEAL TOTAL</Text>
            </Pressable> : null}
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>Review final shares, then enter the total below.</Text>
            <View style={styles.card}>
              {sorted.map((player, index) => {
                const isYou = player.userId === payingPlayer?.userId;
                return (
                  <View key={player.userId} style={[styles.playerCard, isYou && styles.winner]}>
                    <View style={styles.row}>
                      <Text style={[styles.rank, isYou && styles.winnerText]}>#{index + 1}</Text>
                      <Text numberOfLines={1} style={[styles.name, isYou && styles.winnerText]}>{player.displayName}</Text>
                      <Text style={[styles.percent, isYou && styles.winnerText]}>{Math.round(player.billPercent)}%</Text>
                    </View>
                    <View style={[styles.barTrack, isYou && styles.winnerTrack]}>
                      <View style={[styles.bar, { width: `${Math.max(2, Math.min(100, player.billPercent))}%` }, isYou && styles.winnerBar]} />
                    </View>
                  </View>
                );
              })}
            </View>
            {isHost ? <><View style={styles.costCard}>
              <Text style={styles.label}>MEAL TOTAL</Text>
              <View style={styles.costRow}>
                <Text style={styles.currency}>$</Text>
                <TextInput keyboardType="decimal-pad" onChangeText={(value) => setCostInput(value.replace(/[^0-9.]/g, ''))} placeholder="0.00" placeholderTextColor="rgba(21,18,31,0.35)" style={styles.costInput} value={costInput} />
              </View>
            </View>
            <Pressable disabled={enteredCost <= 0} onPress={submitMealTotal} style={[styles.primaryButton, enteredCost <= 0 && styles.disabledButton]}>
              <Text style={[styles.primaryText, enteredCost <= 0 && styles.disabledText]}>{roomCode ? 'SUBMIT MEAL TOTAL' : 'SHOW RECEIPT'}</Text>
            </Pressable></> : <Text style={styles.subtitle}>Waiting for the lobby creator to submit the meal total.</Text>}
          </>
        )}
        <View style={styles.timelineCard}>
          <View style={styles.timelineHeader}>
            <Text style={styles.timelineTitle}>TIMELINE</Text>
          </View>
          <View style={styles.timeline}>
            {timelineBuckets.map((activePeople, index) => {
              const intensity = Math.min(1, activePeople / Math.max(1, players.length));
              const color = activePeople === 0 ? '#7B86C5' : `rgba(155, 29, 48, ${0.25 + intensity * 0.75})`;
              return <View key={index} style={[styles.timelineSegment, { backgroundColor: color }]} />;
            })}
          </View>
          <View style={styles.timelineLabels}><Text style={styles.timelineLabel}>{timelineLabels?.start ?? 'START'}</Text><Text style={styles.timelineLabel}>{timelineLabels?.end ?? 'END'}</Text></View>
        </View>
        <View style={styles.funStatsCard}>
          <Text style={styles.timelineTitle}>PHONE MOMENTS</Text>
          {funStats.map((player, index) => {
            const seconds = roomCode ? activitySecondsByUser[player.userId] ?? 0 : [960, 720, 420][index] ?? 180;
            const duration = seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
            const equalShare = players.length ? cost / players.length : 0;
            const extraCost = Math.max(0, cost * player.billPercent / 100 - equalShare);
            return <Text key={player.userId} style={styles.funStatText}><Text style={styles.funStatName}>{player.displayName}</Text> used their phone for {duration}{extraCost > 0.005 ? <>, costing them an extra <Text style={styles.funStatAmount}>${extraCost.toFixed(2)}</Text>.</> : '.'}</Text>;
          })}
          {!funStats.length ? <Text style={styles.funStatText}>No phone-use moments were recorded this session.</Text> : null}
        </View>
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
  lobbyName: { color: '#3E4AA0', fontSize: 18, fontWeight: '800', marginTop: -12 },
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
  paidReceiptRow: { opacity: 0.58 },
  paidReceiptText: { color: '#38785D', textDecorationLine: 'line-through' },
  share: { color: 'rgba(21,18,31,0.6)', fontSize: 12, fontWeight: '700', marginTop: 2 },
  amount: { color: '#3E4AA0', fontSize: 20, fontVariant: ['tabular-nums'], fontWeight: '800' },
  totalRow: { alignItems: 'center', borderTopColor: '#15121F', borderTopWidth: 2, flexDirection: 'row', justifyContent: 'space-between', marginTop: 3, paddingHorizontal: 2, paddingTop: 14 },
  totalLabel: { color: '#15121F', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  totalAmount: { color: '#3E4AA0', fontSize: 24, fontVariant: ['tabular-nums'], fontWeight: '800' },
  shareButton: { alignItems: 'center', backgroundColor: '#3E4AA0', borderColor: '#15121F', borderRadius: 16, borderWidth: 2.5, justifyContent: 'center', minHeight: 52 },
  shareButtonText: { color: '#F5EFDA', fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  shareButtonDisabled: { backgroundColor: 'rgba(21,18,31,0.15)' },
  shareButtonTextDisabled: { color: 'rgba(21,18,31,0.5)' },
  payButton: { alignItems: 'center', backgroundColor: '#15121F', borderColor: '#15121F', borderRadius: 16, borderWidth: 2.5, justifyContent: 'center', minHeight: 52 },
  payButtonText: { color: '#F5EFDA', fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  paidButton: { backgroundColor: '#60D9A2' },
  paidButtonText: { color: '#15121F' },
  paymentError: { color: '#761C2C', fontSize: 12, fontWeight: '700', marginTop: -8, textAlign: 'center' },
  outlineButton: { alignItems: 'center', borderColor: '#15121F', borderRadius: 16, borderWidth: 2.5, justifyContent: 'center', minHeight: 52 },
  outlineText: { color: '#15121F', fontSize: 13, fontWeight: '800', letterSpacing: 0.4 },
  timelineCard: { backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 16, borderWidth: 2.5, gap: 12, padding: 15 },
  timelineHeader: { gap: 3 },
  timelineTitle: { color: '#15121F', fontSize: 12, fontWeight: '800', letterSpacing: 1.1 },
  timeline: { borderRadius: 999, flexDirection: 'row', height: 14, overflow: 'hidden', width: '100%' },
  timelineSegment: { flex: 1 },
  timelineLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -5 },
  timelineLabel: { color: 'rgba(21,18,31,0.58)', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  funStatsCard: { backgroundColor: '#F5EFDA', borderColor: '#15121F', borderRadius: 16, borderWidth: 2.5, gap: 10, padding: 15 },
  funStatText: { color: 'rgba(21,18,31,0.72)', fontSize: 13, fontWeight: '600', lineHeight: 19 },
  funStatName: { color: '#15121F', fontWeight: '800' },
  funStatAmount: { color: '#3E4AA0', fontWeight: '800' },
  homeButton: { alignItems: 'center', backgroundColor: '#15121F', borderColor: '#15121F', borderRadius: 20, borderWidth: 3, justifyContent: 'center', marginTop: 'auto', minHeight: 62 },
  homeText: { color: '#F5EFDA', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});
