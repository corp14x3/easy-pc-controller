import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from './../utils/api';

export default function ApplicationsScreen() {
  const [applications, setApplications] = useState([]);
  const [installedApps, setInstalledApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLauncher, setShowLauncher] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    try {
      await api.initialize();
      const response = await api.getApplications();
      if (response.status === 'success') {
        setApplications(response.applications);
      }
    } catch (error) {
      Alert.alert('Hata', 'Uygulamalar yüklenemedi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadInstalledApps = async () => {
    try {
      const response = await api.getInstalledApplications();
      if (response.status === 'success') {
        setInstalledApps(response.applications);
      }
    } catch (error) {
      Alert.alert('Hata', 'Yüklü uygulamalar getirilemedi');
    }
  };

  const focusApp = async (name) => {
    try {
      await api.focusApplication(name);
    } catch (error) {
      Alert.alert('Hata', 'Uygulama ön plana getirilemedi');
    }
  };

  const killApp = async (pid, name) => {
    Alert.alert(
      'Onay',
      `${name} uygulamasını sonlandırmak istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sonlandır',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.killApplication(pid);
              loadApplications();
              Alert.alert('Başarılı', 'Uygulama sonlandırıldı');
            } catch (error) {
              Alert.alert('Hata', 'Uygulama sonlandırılamadı');
            }
          },
        },
      ]
    );
  };

  const launchApp = async (path) => {
    try {
      await api.launchApplication(path);
      setShowLauncher(false);
      setTimeout(loadApplications, 2000);
      Alert.alert('Başarılı', 'Uygulama başlatıldı');
    } catch (error) {
      Alert.alert('Hata', 'Uygulama başlatılamadı');
    }
  };

  const openLauncher = async () => {
    setShowLauncher(true);
    await loadInstalledApps();
  };

  const renderApp = ({ item }) => (
    <View style={styles.appCard}>
      <TouchableOpacity
        style={styles.appInfo}
        onPress={() => focusApp(item.name)}
      >
        <Ionicons name="apps" size={24} color="#0099ff" />
        <Text style={styles.appName}>{item.name}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.killButton}
        onPress={() => killApp(item.pid, item.name)}
      >
        <Text style={styles.killButtonText}>Sonlandır</Text>
      </TouchableOpacity>
    </View>
  );

  const renderInstalledApp = ({ item }) => (
    <TouchableOpacity
      style={styles.installedAppCard}
      onPress={() => launchApp(item.path)}
    >
      <Ionicons name="rocket" size={20} color="#0099ff" />
      <Text style={styles.installedAppName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Açık Uygulamalar</Text>
        <TouchableOpacity style={styles.launchButton} onPress={openLauncher}>
          <Ionicons name="add-circle" size={28} color="#0099ff" />
          <Text style={styles.launchButtonText}>Aç</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={applications}
        renderItem={renderApp}
        keyExtractor={(item) => item.pid.toString()}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadApplications}
            tintColor="#0099ff"
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {loading ? 'Yükleniyor...' : 'Açık uygulama bulunamadı'}
          </Text>
        }
      />

      <Modal
        visible={showLauncher}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLauncher(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Uygulama Başlat</Text>
              <TouchableOpacity onPress={() => setShowLauncher(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {installedApps.map((app, index) => (
                <View key={index}>{renderInstalledApp({ item: app })}</View>
              ))}
              {installedApps.length === 0 && (
                <Text style={styles.emptyText}>Yüklü uygulama bulunamadı</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  launchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  launchButtonText: {
    color: '#0099ff',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  appName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  killButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  killButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 32,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalScroll: {
    padding: 16,
  },
  installedAppCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#252525',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  installedAppName: {
    color: '#fff',
    fontSize: 16,
  },
});
