import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from './../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TerminalScreen() {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState('');
  const [shellType, setShellType] = useState('cmd');
  const [osType, setOsType] = useState('Windows');
  const [availableShells, setAvailableShells] = useState(['cmd']);

  useEffect(() => {
    loadSystemInfo();
  }, []);

  const loadSystemInfo = async () => {
    try {
      // Önce AsyncStorage'dan kontrol et
      const savedOS = await AsyncStorage.getItem('os_type');
      const savedShell = await AsyncStorage.getItem('shell_type');
      
      if (savedOS && savedShell) {
        setOsType(savedOS);
        setShellType(savedShell);
        
        // Available shells'i ayarla
        if (savedOS === 'Windows') {
          setAvailableShells(['cmd', 'powershell']);
        } else {
          setAvailableShells(['bash']);
        }
      } else {
        // API'den al
        await api.initialize();
        const response = await api.getSystemInfo();
        if (response.status === 'success') {
          setOsType(response.info.os);
          setShellType(response.info.shell_type);
          setAvailableShells(response.info.available_shells || ['cmd']);
          
          // Kaydet
          await AsyncStorage.setItem('os_type', response.info.os);
          await AsyncStorage.setItem('shell_type', response.info.shell_type);
        }
      }
    } catch (error) {
      console.log('Sistem bilgisi alınamadı');
    }
  };

  const executeCommand = async () => {
    if (!command.trim()) return;

    try {
      await api.initialize();
      const response = await api.executeCommand(command, shellType);
      
      if (response.status === 'success') {
        const result = response.output || response.error || 'Komut çalıştırıldı';
        setOutput(prev => `${prev}\n\n$ ${command}\n${result}`);
        setCommand('');
      }
    } catch (error) {
      Alert.alert('Hata', 'Komut çalıştırılamadı: ' + error.message);
    }
  };

  const shutdownPC = () => {
    Alert.alert(
      'Onay Gerekli',
      'Bilgisayarı kapatmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Kapat',
          style: 'destructive',
          onPress: () => confirmShutdown(),
        },
      ]
    );
  };

  const confirmShutdown = () => {
    Alert.alert(
      '⚠️ SON ONAY',
      'Bu işlem geri alınamaz! Bilgisayar kapanacak.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'KAPAT',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.shutdownSystem();
              Alert.alert('✅', 'Bilgisayar kapatılıyor...');
            } catch (error) {
              Alert.alert('Hata', 'Bilgisayar kapatılamadı');
            }
          },
        },
      ]
    );
  };

  const restartPC = () => {
    Alert.alert(
      'Onay Gerekli',
      'Bilgisayarı yeniden başlatmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Yeniden Başlat',
          style: 'destructive',
          onPress: () => confirmRestart(),
        },
      ]
    );
  };

  const confirmRestart = () => {
    Alert.alert(
      '⚠️ SON ONAY',
      'Bu işlem geri alınamaz! Bilgisayar yeniden başlayacak.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'YENİDEN BAŞLAT',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.restartSystem();
              Alert.alert('✅', 'Bilgisayar yeniden başlatılıyor...');
            } catch (error) {
              Alert.alert('Hata', 'Bilgisayar yeniden başlatılamadı');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton} onPress={shutdownPC}>
          <Ionicons name="power" size={24} color="#ff3b30" />
          <Text style={styles.actionButtonText}>Kapat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={restartPC}>
          <Ionicons name="refresh" size={24} color="#ff9500" />
          <Text style={styles.actionButtonText}>Yeniden Başlat</Text>
        </TouchableOpacity>
      </View>

      {/* Shell Type Selector (sadece Windows için) */}
      {availableShells.length > 1 && (
        <View style={styles.shellSelector}>
          {availableShells.map((shell) => (
            <TouchableOpacity
              key={shell}
              style={[
                styles.shellButton,
                shellType === shell && styles.shellButtonActive,
              ]}
              onPress={() => setShellType(shell)}
            >
              <Text
                style={[
                  styles.shellButtonText,
                  shellType === shell && styles.shellButtonTextActive,
                ]}
              >
                {shell.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* System Info */}
      <View style={styles.systemInfo}>
        <Ionicons 
          name={osType === 'Windows' ? 'logo-windows' : 'logo-tux'} 
          size={16} 
          color="#0099ff" 
        />
        <Text style={styles.systemInfoText}>
          {osType} - {shellType}
        </Text>
      </View>

      {/* Output */}
      <ScrollView style={styles.output}>
        <Text style={styles.outputText}>
          {output || `Komut çıktısı burada görünecek...\n\nŞu an: ${osType} - ${shellType}`}
        </Text>
      </ScrollView>

      {/* Command Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={command}
          onChangeText={setCommand}
          placeholder={`${shellType} komutu girin...`}
          placeholderTextColor="#666"
          returnKeyType="send"
          onSubmitEditing={executeCommand}
        />
        <TouchableOpacity style={styles.sendButton} onPress={executeCommand}>
          <Ionicons name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.clearButton}
        onPress={() => setOutput('')}
      >
        <Text style={styles.clearButtonText}>Ekranı Temizle</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#252525',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  shellSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  shellButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  shellButtonActive: {
    backgroundColor: '#0099ff',
    borderColor: '#0099ff',
  },
  shellButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  shellButtonTextActive: {
    color: '#fff',
  },
  systemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  systemInfoText: {
    color: '#0099ff',
    fontSize: 12,
    fontWeight: '600',
  },
  output: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 16,
  },
  outputText: {
    color: '#00ff00',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  input: {
    flex: 1,
    backgroundColor: '#252525',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  sendButton: {
    backgroundColor: '#0099ff',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
  },
  clearButton: {
    margin: 16,
    marginTop: 0,
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
