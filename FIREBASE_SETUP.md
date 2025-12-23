# Firebase Setup Instructions

## Step 1: Enable Firebase Services

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `adtrade-8839a`
3. Enable the following services:

### Authentication
1. Go to **Authentication** > **Get Started**
2. Click **Sign-in method**
3. Enable **Email/Password** provider
4. Click **Save**

### Firestore Database
1. Go to **Firestore Database** > **Create database**
2. Choose **Start in test mode** (we'll update rules later)
3. Select a location (choose closest to your users)
4. Click **Enable**

## Step 2: Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll down to **Your apps**
3. Click **Web** icon (`</>`)
4. Register app with nickname: `ADTrade Web`
5. Copy the `firebaseConfig` object

## Step 3: Update FirebaseService.js

Open `src/services/FirebaseService.js` and replace the placeholder config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "adtrade-8839a.firebaseapp.com",
  projectId: "adtrade-8839a",
  storageBucket: "adtrade-8839a.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
}
```

## Step 4: Deploy Firestore Rules

Run this command to deploy security rules:

```bash
firebase deploy --only firestore:rules
```

Or manually:
1. Go to **Firestore Database** > **Rules**
2. Copy contents from `firestore.rules`
3. Paste and click **Publish**

## Step 5: Test Authentication

1. Run `npm run dev`
2. Try signing up with a test email
3. Verify user appears in **Authentication** > **Users**

## Step 6: Verify Data Storage

1. After logging in, enter market data
2. Go to **Firestore Database** > **Data**
3. Verify collections: `marketData`, `activeTrades`, `tradeHistory`

---

## Troubleshooting

### "Permission denied" errors
- Check Firestore rules are deployed
- Verify user is authenticated
- Check rules match your user ID structure

### Authentication not working
- Verify Email/Password is enabled
- Check Firebase config is correct
- Check browser console for errors

### Data not saving
- Check Firestore is enabled
- Verify rules allow write access
- Check network tab for errors

