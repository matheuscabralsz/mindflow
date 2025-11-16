import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MindFlow</Text>
      <Text style={styles.subtitle}>AI-Powered Journal App</Text>
      <Text style={styles.status}>✅ Frontend Setup Complete!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#fff',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  status: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 18,
    marginBottom: 32,
  },
  title: {
    color: '#6366F1',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});
