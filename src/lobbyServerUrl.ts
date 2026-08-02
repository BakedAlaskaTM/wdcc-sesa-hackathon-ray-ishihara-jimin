import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getLobbyServerUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_LOBBY_SERVER_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');
  // In production the Node server also serves the exported web app, so use the
  // current HTTPS origin for both the API and Socket.IO connection.
  if (Platform.OS === 'web') return globalThis.location?.origin || 'http://localhost:3001';

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const hostname = hostUri.replace(/^https?:\/\//, '').split(':')[0];
    return `http://${hostname}:3001`;
  }

  return 'http://localhost:3001';
}
