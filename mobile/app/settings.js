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
  const [osType, setOSType] = useState('Windows');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const ip = await AsyncStorage.getItem('server_ip');
      const port = await AsyncStorage.getItem('server_port');
      const os = await AsyncStorage.getItem('os_type');

      if (ip) setServerIP(ip);
      if (port) setServerPort(port);
      if (os) setOSType(os);

      // Check connection
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
      const response = await api.checkHealth();
      setIsConnected(response.status === 'ok');
    } catch (error) {
      setIsConnected(false);
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
      await AsyncStorage.setItem('os_type', osType);
      
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
        setIsConnected(true);
        Alert.alert('Başarılı', `Bağlantı başarılı!\nOS: ${response.os}`);
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

        {/* OS Selection */}
        <Text style={styles.label}>İşletim Sistemi</Text>
        <View style={styles.osSelector}>
          <TouchableOpacity
            style={[styles.osButton, osType === 'Windows' && styles.osButtonActive]}
            onPress={() => setOSType('Windows')}
          >
            <Ionicons 
              name="logo-windows" 
              size={24} 
              color={osType === 'Windows' ? '#fff' : '#666'} 
            />
            <Text style={[styles.osButtonText, osType === 'Windows' && styles.osButtonTextActive]}>
              Windows
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.osButton, osType === 'Linux' && styles.osButtonActive]}
            onPress={() => setOSType('Linux')}
          >
            <Ionicons 
              name="logo-tux" 
              size={24} 
              color={osType === 'Linux' ? '#fff' : '#666'} 
            />
            <Text style={[styles.osButtonText, osType === 'Linux' && styles.osButtonTextActive]}>
              Linux
            </Text>
          </TouchableOpacity>
        </View>

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
  osSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  osButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  osButtonActive: {
    backgroundColor: '#0099ff',
    borderColor: '#0099ff',
  },
  osButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  osButtonTextActive: {
    color: '#fff',
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
  aboutText: {
    color: '#666',
    fontSize: 14,
    marginBottom: 4,
  },
});
