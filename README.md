# Prompt Pro - AI Storyboard Generator

Modern AI prompt generator and storyboard creator built with React + Vite + Firebase.

## 🚀 Deployment (Vercel)

1. Connect this GitHub repository to Vercel.
2. Add the following **Environment Variables** in Vercel settings:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`
3. Click **Deploy**.

## 🛠️ Features

- **Dark Mode**: Toggle between light and dark themes.
- **Admin Dashboard**: Manage users, prompt templates, and monitor usage.
- **Role-based Access**: Admin and User roles with protected routes.
- **Firebase Integration**: Persistence for history, settings, and templates.
- **OpenRouter API**: Powered by advanced AI models.

## 📦 Setup

1. Clone the repository.
2. Install dependencies: `npm install`
3. Create a `.env` file with your Firebase credentials.
4. Run development server: `npm run dev`
