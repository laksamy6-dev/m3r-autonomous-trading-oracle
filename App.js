import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Must be used with Expo Router
function App() {
  return <ExpoRoot />;
}

registerRootComponent(App);
