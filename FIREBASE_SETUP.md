# Firebase Setup

This app now supports Firestore as its database.

## 1. Create Firebase Web App

In Firebase Console:

1. Create or open a Firebase project.
2. Add a Web App.
3. Copy the Firebase config values.
4. Create a `.env` file from `.env.example`.

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

Restart the dev server after changing `.env`.

## 2. Firestore Collections

The app creates these collections automatically when empty:

- `users` - app login accounts such as admin and user1
- `promptTemplates` - editable Gem prompt templates
- `userSettings` - per-user API key, selected model, theme, and generation count
- `usageLogs` - token usage history for admin monitoring
- `generationHistory` - saved storyboard outputs for each user history tab

If Firebase env vars are missing, the app falls back to `localStorage`.

## Current Project Config

The included `.env` points to:

- Firebase project ID: `promptgen-6a8c9`
- Auth domain: `promptgen-6a8c9.firebaseapp.com`
- Storage bucket: `promptgen-6a8c9.firebasestorage.app`
- Measurement ID: `G-1DSM28YFXF`

The Admin Dashboard also shows the active database mode and Firestore collection names.

## 3. Important Security Note

The current login system is app-level username/password stored in the database. It is not Firebase Authentication.

For production, do not expose admin OpenRouter keys directly to browser clients. The secure path is:

- Use Firebase Authentication for users.
- Store admin/shared API keys in server-only config.
- Call OpenRouter through Firebase Cloud Functions.
- Lock Firestore rules to authenticated users.

The current implementation is suitable for local/internal testing and database migration, not secure public production use.
