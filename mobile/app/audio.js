import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import api from './../utils/api';

export default function AudioScreen() {
  const [volume, setVolume] = useState(50);
  const [muted, setMuted] = useState(false);
  const [devices, setDevices] = useState({ output: [], input: [] });

  useEffect(() => {
    loadAudioStatus();
    loadDevices();
  }, []);

  const loadAudioStatus = async () => {
    try {
      await api.initialize();
      const response = await api.getVolume();
      if (response.status === 'success') {
        setVolume(response.volume);
        setMuted(response.muted);
      }
    } catch (error) {
      Alert.alert('Hata', 'Ses durumu yüklenemedi');
    }
  };

  const loadDevices = async () => {
    try {
      const response = await api.getAudioDevices();
      if (response.status === 'success') {
        setDevices(response.devices);
      }
    } catch (error) {
      console.log('Cihazlar yüklenemedi');
    }
  };

  const handleVolumeChange = async (value) => {
    setVolume(value);
    try {
      await api.setVolume(Math.round(value));
    } catch (error) {
      console.log('Ses seviyesi değiştirilemedi');
    }
  };

  const toggleMute = async () => {
    try {
      await api.toggleMute();
      setMuted(!muted);
    } catch (error) {
      Alert.alert('Hata', 'Ses kapatılamadı');
    }
  };

  const controlMedia = async (action) => {
    try {
      await api.controlMedia(action);
    } catch (error) {
      Alert.alert('Hata', 'Medya kontrol edilemedi');
    }
  };

  const selectDevice = async (deviceId, type) => {
    try {
      await api.setAudioDevice(deviceId, type);
      Alert.alert('Başarılı', 'Cihaz değiştirildi');
    } catch (error) {
      Alert.alert('Hata', 'Cihaz değiştirilemedi');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Volume Control */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ses Seviyesi</Text>
        <View style={styles.volumeContainer}>
          <Ionicons
            name={muted ? 'volume-mute' : volume > 50 ? 'volume-high' : 'volume-medium'}
            size={32}
            color="#0099ff"
          />
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            value={volume}
            onValueChange={handleVolumeChange}
            minimumTrackTintColor="#0099ff"
            maximumTrackTintColor="#333"
            thumbTintColor="#0099ff"
          />
          <Text style={styles.volumeText}>{Math.round(volume)}%</Text>
        </View>
        <TouchableOpacity style={styles.muteButton} onPress={toggleMute}>
          <Ionicons
            name={muted ? 'volume-mute' : 'volume-high'}
            size={24}
            color="#fff"
          />
          <Text style={styles.muteButtonText}>
            {muted ? 'Sesi Aç' : 'Sessize Al'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Media Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medya Kontrolü</Text>
        <View style={styles.mediaControls}>
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => controlMedia('previous')}
          >
            <Ionicons name="play-skip-back" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mediaButton, styles.playButton]}
            onPress={() => controlMedia('play')}
          >
            <Ionicons name="play" size={32} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => controlMedia('pause')}
          >
            <Ionicons name="pause" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => controlMedia('next')}
          >
            <Ionicons name="play-skip-forward" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Output Devices */}
      {devices.output.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Çıkış Cihazları (Kulaklık/Hoparlör)</Text>
          {devices.output.map((device, index) => (
            <TouchableOpacity
              key={index}
              style={styles.deviceCard}
              onPress={() => selectDevice(device.id, 'output')}
            >
              <Ionicons name="headset" size={24} color="#0099ff" />
              <Text style={styles.deviceName}>{device.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Input Devices */}
      {devices.input.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giriş Cihazları (Mikrofon)</Text>
          {devices.input.map((device, index) => (
            <TouchableOpacity
              key={index}
              style={styles.deviceCard}
              onPress={() => selectDevice(device.id, 'input')}
            >
              <Ionicons name="mic" size={24} color="#0099ff" />
              <Text style={styles.deviceName}>{device.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  volumeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    width: 50,
    textAlign: 'center',
  },
  muteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ff3b30',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  muteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mediaControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  mediaButton: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#333',
  },
  playButton: {
    backgroundColor: '#0099ff',
    borderColor: '#0099ff',
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  deviceName: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
});
