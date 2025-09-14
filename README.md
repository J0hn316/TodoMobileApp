# 📱 React Native Todo App

A simple **Todo app** built with [Expo](https://expo.dev/), [React Native](https://reactnative.dev/), and [TypeScript](https://www.typescriptlang.org/).  
The app demonstrates **navigation, theming, local persistence, and gestures**

---

## ✨ Features

- **Bottom Tab Navigation** (`@react-navigation`)
- **Dark/Light Mode** (using React Navigation theme)
- **Todos**
  - Add, toggle, edit, delete
  - Swipe left → mark as done/undo
  - Swipe right → delete (with confirmation)
  - Long-press → edit modal
  - Clear completed todos
- **Persistent Storage** (`@react-native-async-storage/async-storage`)
- **Unique IDs** (`uuid` + polyfill)
- **Haptic Feedback** (`expo-haptics`)

---

## 📂 Project Structure

```
.
├── components/
│   └── TodoRow.tsx        # Individual todo row with swipe actions
├── screens/
│   └── TodosListScreen.tsx # Main screen for list + filters + edit modal
├── utils/
│   └── id.ts              # UUID generator helper
├── types/
│   └── models.ts          # Todo type definition
├── App.tsx                # Navigation + theming setup
├── babel.config.js        # Reanimated plugin
└── package.json
```

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

or with yarn:

```bash
yarn install
```

### 2. Start the Expo dev server

```bash
npm start
```

👉 I used `--tunnel` in the `package.json` script so you can scan the QR code even if your computer and phone are on different networks (e.g. VPN).

### 3. Run on device/emulator

- Scan the QR code with the **Expo Go** app (iOS / Android)
- Or press:
  - `a` → Android emulator
  - `i` → iOS simulator (Mac only)

---

## 📦 Key Dependencies

- [`expo`](https://docs.expo.dev/) — managed RN workflow
- [`react-native`](https://reactnative.dev/) — core framework
- [`@react-navigation/native`](https://reactnavigation.org/) — navigation
- [`@react-native-async-storage/async-storage`](https://react-native-async-storage.github.io/async-storage/) — persistence
- [`react-native-gesture-handler`](https://docs.swmansion.com/react-native-gesture-handler/) + [`react-native-reanimated`](https://docs.swmansion.com/react-native-reanimated/) — swipe gestures
- [`uuid`](https://www.npmjs.com/package/uuid) — ID generation
- [`expo-haptics`](https://docs.expo.dev/versions/latest/sdk/haptics/) — tactile feedback

---

## 🖼️ Screenshots

> Coming soon

---
