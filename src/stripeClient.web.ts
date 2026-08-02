type PaymentSheetError = { code?: string; message: string };

export async function initStripe() {
  // Browser payments use the hosted Checkout flow in SessionSummaryScreen.
}

export function useStripe() {
  return {
    initPaymentSheet: async (): Promise<{ error?: PaymentSheetError }> => ({}),
    presentPaymentSheet: async (): Promise<{ error?: PaymentSheetError }> => ({}),
  };
}
