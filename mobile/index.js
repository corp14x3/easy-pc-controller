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
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';

export default function ApplicationsScreen() {
  const [applications, setApplications] = useState([]);
  const [installedApps, setInstalledApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLauncher, setShowLauncher] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const focusApplication = async (name) => {
    try {
      await api.focusApplication(name);
    } catch (error) {
      Alert.alert('Hata', 'Uygulama odaklanamadı');
    }
  };

  const killApplication = (pid, name) => {
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
            console.log(`Killing PID: ${pid}`); // Debug log
            
            await api.initialize(); // ÖNEMLİ!
            const response = await api.killApplication(pid);
            
            console.log('Kill response:', response); // Debug log
            
            if (response.status === 'success') {
              await loadApplications(); // Listeyi yenile
              Alert.alert('Başarılı', 'Uygulama sonlandırıldı');
            } else {
              Alert.alert('Hata', 'Uygulama sonlandırılamadı');
            }
          } catch (error) {
            console.error('Kill error:', error); // Debug log
            Alert.alert('Hata', `Sonlandırma hatası: ${error.message}`);
          }
        },
      },
    ]
  );
};

  const openLauncher = () => {
    setSearchQuery(''); // Aramayı temizle
    setShowLauncher(true);
    loadInstalledApps();
  };

  const closeLauncher = () => {
    setShowLauncher(false);
    setSearchQuery(''); // Aramayı temizle
  };

  const launchApp = async (path) => {
    try {
      await api.launchApplication(path);
      closeLauncher();
      setTimeout(loadApplications, 1000);
    } catch (error) {
      Alert.alert('Hata', 'Uygulama başlatılamadı');
    }
  };

  // Modal içindeki uygulamaları filtrele
  const filteredInstalledApps = installedApps.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderApplication = ({ item }) => (
  <View style={styles.appCard}>
    <TouchableOpacity
      style={styles.appInfo}
      onPress={() => focusApplication(item.name)}
    >
      <Ionicons name="apps" size={24} color="#0099ff" />
      <Text style={styles.appName}>{item.name}</Text>
    </TouchableOpacity>
    
    <TouchableOpacity
      style={styles.killButton}
      onPress={(e) => {
        e.stopPropagation(); // Tıklamayı durdur
        killApplication(item.pid, item.name);
      }}
    >
      <Ionicons name="close-circle" size={24} color="#ff3b30" />
    </TouchableOpacity>
  </View>
);

  return (
    <View style={styles.container}>
      {/* Açık Uygulamalar Listesi */}
      <FlatList
        data={applications}
        renderItem={renderApplication}
        keyExtractor={(item) => item.pid.toString()}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadApplications} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="apps-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>Açık uygulama yok</Text>
          </View>
        }
      />

      {/* Uygulama Aç Butonu */}
      <TouchableOpacity style={styles.fab} onPress={openLauncher}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Launcher Modal */}
      <Modal
        visible={showLauncher}
        animationType="slide"
        transparent={true}
        onRequestClose={closeLauncher}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Uygulama Aç</Text>
              <TouchableOpacity onPress={closeLauncher}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Arama Kutusu */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Uygulama ara..."
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={true}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            {/* Uygulama Listesi */}
            <ScrollView style={styles.modalScroll}>
              {filteredInstalledApps.map((app, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.installedAppCard}
                  onPress={() => launchApp(app.path)}
                >
                  <Ionicons name="rocket" size={24} color="#0099ff" />
                  <Text style={styles.installedAppName}>{app.name}</Text>
                </TouchableOpacity>
              ))}
              {filteredInstalledApps.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'Uygulama bulunamadı' : 'Yüklü uygulama bulunamadı'}
                  </Text>
                </View>
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
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
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
    flex: 1,
  },
  killButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#0099ff',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252525',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
  },
  modalScroll: {
    padding: 16,
    paddingTop: 0,
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
    flex: 1,
  },
});
