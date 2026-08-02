type PaymentSheetError = { code?: string; message: string };

// TypeScript's resolver uses this fallback, while Metro selects .native or .web.
export async function initStripe(_config: unknown) {}

export function useStripe() {
  return {
    initPaymentSheet: async (_options: unknown): Promise<{ error?: PaymentSheetError }> => ({}),
    presentPaymentSheet: async (): Promise<{ error?: PaymentSheetError }> => ({}),
  };
}
