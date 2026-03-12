import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './../utils/api';

export default function SettingsScreen() {
  const [serverIP, setServerIP] = useState('');
  const [serverPort, setServerPort] = useState('5000');
  const [isConnected, setIsConnected] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const ip = await AsyncStorage.getItem('server_ip');
      const port = await AsyncStorage.getItem('server_port');

      if (ip) setServerIP(ip);
      if (port) setServerPort(port);

      // Check connection and get system info
      if (ip && port) {
        checkConnection();
      }
    } catch (error) {
      console.log('Ayarlar yüklenemedi');
    }
  };

  const checkConnection = async () => {
    try {
      await api.initialize();
      const healthResponse = await api.checkHealth();
      setIsConnected(healthResponse.status === 'ok');
      
      // Get system info (OS, shell type)
      const infoResponse = await api.getSystemInfo();
      if (infoResponse.status === 'success') {
        setSystemInfo(infoResponse.info);
        // OS bilgisini kaydet
        await AsyncStorage.setItem('os_type', infoResponse.info.os);
        await AsyncStorage.setItem('shell_type', infoResponse.info.shell_type);
      }
    } catch (error) {
      setIsConnected(false);
      setSystemInfo(null);
    }
  };

  const saveSettings = async () => {
    if (!serverIP || !serverPort) {
      Alert.alert('Hata', 'IP adresi ve port girilmelidir');
      return;
    }

    try {
      await AsyncStorage.setItem('server_ip', serverIP);
      await AsyncStorage.setItem('server_port', serverPort);
      
      await api.setServer(serverIP, serverPort);
      await checkConnection();

      Alert.alert('Başarılı', 'Ayarlar kaydedildi');
    } catch (error) {
      Alert.alert('Hata', 'Ayarlar kaydedilemedi');
    }
  };

  const testConnection = async () => {
    if (!serverIP || !serverPort) {
      Alert.alert('Hata', 'Önce ayarları kaydedin');
      return;
    }

    try {
      await api.initialize();
      const response = await api.checkHealth();
      
      if (response.status === 'ok') {
        await checkConnection();
        Alert.alert(
          'Başarılı', 
          `Bağlantı başarılı!\n\nİşletim Sistemi: ${systemInfo?.os || 'Bilinmiyor'}\nShell: ${systemInfo?.shell_type || 'Bilinmiyor'}`
        );
      }
    } catch (error) {
      setIsConnected(false);
      Alert.alert('Hata', 'Sunucuya bağlanılamadı. IP ve portu kontrol edin.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sunucu Bağlantısı</Text>

        {/* Connection Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, isConnected && styles.statusDotConnected]} />
            <Text style={styles.statusText}>
              {isConnected ? 'Bağlı' : 'Bağlantı Yok'}
            </Text>
          </View>
          {systemInfo && isConnected && (
            <View style={styles.systemInfoContainer}>
              <View style={styles.systemInfoRow}>
                <Ionicons 
                  name={systemInfo.os === 'Windows' ? 'logo-windows' : 'logo-tux'} 
                  size={20} 
                  color="#0099ff" 
                />
                <Text style={styles.systemInfoText}>
                  {systemInfo.os} ({systemInfo.shell_type})
                </Text>
              </View>
              <Text style={styles.systemInfoSubText}>
                {systemInfo.hostname}
              </Text>
            </View>
          )}
        </View>

        {/* Server IP */}
        <Text style={styles.label}>Sunucu IP Adresi</Text>
        <TextInput
          style={styles.input}
          value={serverIP}
          onChangeText={setServerIP}
          placeholder="192.168.1.100"
          placeholderTextColor="#666"
          keyboardType="numeric"
        />
        <Text style={styles.hint}>
          💡 PC'nizde ipconfig (Windows) veya ifconfig (Linux) komutunu çalıştırarak IP adresinizi öğrenebilirsiniz
        </Text>

        {/* Server Port */}
        <Text style={styles.label}>Port</Text>
        <TextInput
          style={styles.input}
          value={serverPort}
          onChangeText={setServerPort}
          placeholder="5000"
          placeholderTextColor="#666"
          keyboardType="numeric"
        />

        {/* Buttons */}
        <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
          <Ionicons name="save" size={24} color="#fff" />
          <Text style={styles.saveButtonText}>Ayarları Kaydet</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={testConnection}>
          <Ionicons name="sync" size={24} color="#0099ff" />
          <Text style={styles.testButtonText}>Bağlantıyı Test Et</Text>
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nasıl Kullanılır?</Text>
        <View style={styles.instructionCard}>
          <Text style={styles.instructionStep}>1️⃣ PC'nizde server'ı başlatın (start_windows.bat veya start_linux.sh)</Text>
          <Text style={styles.instructionStep}>2️⃣ PC'nizin IP adresini öğrenin</Text>
          <Text style={styles.instructionStep}>3️⃣ Yukarıdaki ayarlara IP ve port'u girin</Text>
          <Text style={styles.instructionStep}>4️⃣ "Ayarları Kaydet" butonuna basın</Text>
          <Text style={styles.instructionStep}>5️⃣ "Bağlantıyı Test Et" ile kontrol edin</Text>
          <Text style={styles.instructionNote}>
            ℹ️ İşletim sistemi ve shell tipi otomatik olarak algılanır
          </Text>
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hakkında</Text>
        <Text style={styles.aboutText}>PC Controller v1.0.0</Text>
        <Text style={styles.aboutText}>Bilgisayarınızı telefonunuzdan kontrol edin</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff3b30',
  },
  statusDotConnected: {
    backgroundColor: '#34c759',
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  systemInfoContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  systemInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  systemInfoText: {
    color: '#0099ff',
    fontSize: 14,
    fontWeight: '600',
  },
  systemInfoSubText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  hint: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0099ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#0099ff',
  },
  testButtonText: {
    color: '#0099ff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  instructionCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  instructionStep: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  instructionNote: {
    color: '#0099ff',
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
  },
  aboutText: {
    color: '#666',
    fontSize: 14,
    marginBottom: 4,
  },
});
