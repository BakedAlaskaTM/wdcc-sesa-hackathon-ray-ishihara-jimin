# Ray Group Score

A basic Expo/React Native screen showing four members and their phone-use score shares.

## Run locally

```sh
npm install
npm start
```

`npm start` explicitly creates an Expo Go QR code over an Expo tunnel. This
prevents the QR code from using this app's custom native URL scheme, which an
iPhone cannot open unless a custom development build is already installed. If
the tunnel is unavailable and both devices are on the same non-guest Wi-Fi
network, use `npm run start:lan` instead.

Edit the `members` array in `src/GroupScoreScreen.tsx` to change the displayed names and percentages. The bars update from the same percentage values.

## Run on iPhone

On macOS with Xcode installed, run:

```sh
npm run ios
```

You can also open the project on a physical iPhone:

1. Install Expo Go from the App Store and open it once. This registers the
   `exp://` link used by the QR code with iOS.
2. Run `npm start` and wait until the terminal says the tunnel is ready.
3. Scan the QR code with Apple's Camera app, then tap the Expo Go banner.

Do not scan the code with the iPhone's Code Scanner control, which may reject
Expo's custom development URL. The iOS configuration includes the motion-data
privacy description required by the phone stack detector.
