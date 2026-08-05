# Friend Time
## 2026 WDCC x SESA Hackathon 2nd Place
An app built to address the hackathon theme of "cognitive incline".
The purpose is to discourage phone use during meals with friends, by increasing proportion of bill paid based on phone usage.

## Run locally

```sh
npm install
npm start
```

`npm start` creates a standard web launch-page QR code over an Expo tunnel.
Unlike a raw `exp://` QR code, iOS can recognize this as usable web data. The
launch page then opens the project in Expo Go. If the tunnel is unavailable and
both devices are on the same non-guest Wi-Fi network, use `npm run start:lan`
instead.

Edit the `members` array in `src/GroupScoreScreen.tsx` to change the displayed names and percentages. The bars update from the same percentage values.

## Run on iPhone

On macOS with Xcode installed, run:

```sh
npm run ios
```

You can also open the project on a physical iPhone:

1. Install Expo Go from the App Store.
2. Run `npm start` and wait until the terminal says the tunnel is ready.
3. Scan the QR code with Apple's Camera app.
4. On the launch page, tap **Expo Go**.

The iOS configuration includes the motion-data privacy description required by
the phone stack detector.
