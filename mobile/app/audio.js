import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Modal,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import api from './../utils/api';

export default function AudioScreen() {
  const [volume, setVolume] = useState(50);
  const [muted, setMuted] = useState(false);
  const [devices, setDevices] = useState({ output: [], input: [] });
  const [mediaInfo, setMediaInfo] = useState(null);
  const [showOutputMenu, setShowOutputMenu] = useState(false);
  const [showInputMenu, setShowInputMenu] = useState(false);

  useEffect(() => {
    loadAudioStatus();
    loadDevices();
    loadMediaInfo();
    
    // Her 3 saniyede bir medya bilgisini güncelle
    const interval = setInterval(loadMediaInfo, 3000);
    return () => clearInterval(interval);
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

  const loadMediaInfo = async () => {
    try {
      const response = await api.getMediaInfo();
      if (response.status === 'success') {
        setMediaInfo(response.media);
      }
    } catch (error) {
      console.log('Medya bilgisi alınamadı');
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
      // Medya bilgisini hemen güncelle
      setTimeout(loadMediaInfo, 500);
    } catch (error) {
      Alert.alert('Hata', 'Medya kontrol edilemedi');
    }
  };

  const selectDevice = async (deviceId, type) => {
    try {
      await api.setAudioDevice(deviceId, type);
      setShowOutputMenu(false);
      setShowInputMenu(false);
      Alert.alert('Başarılı', 'Cihaz değiştirildi');
    } catch (error) {
      Alert.alert('Hata', 'Cihaz değiştirilemedi');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Now Playing */}
      {mediaInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Şu An Çalıyor</Text>
          <View style={styles.mediaCard}>
            {mediaInfo.thumbnail && (
              <Image 
                source={{ uri: mediaInfo.thumbnail }} 
                style={styles.mediaThumbnail}
              />
            )}
            <View style={styles.mediaInfo}>
              <Text style={styles.mediaTitle} numberOfLines={1}>
                {mediaInfo.title || 'Bilinmeyen'}
              </Text>
              <Text style={styles.mediaArtist} numberOfLines={1}>
                {mediaInfo.artist || 'Bilinmeyen Sanatçı'}
              </Text>
              {mediaInfo.album && (
                <Text style={styles.mediaAlbum} numberOfLines={1}>
                  {mediaInfo.album}
                </Text>
              )}
            </View>
            <View style={styles.mediaStatus}>
              <Ionicons 
                name={mediaInfo.is_playing ? 'play-circle' : 'pause-circle'} 
                size={24} 
                color="#0099ff" 
              />
            </View>
          </View>
        </View>
      )}

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

      {/* Audio Devices */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ses Cihazları</Text>
        
        {/* Output Device */}
        <TouchableOpacity 
          style={styles.deviceSelector}
          onPress={() => setShowOutputMenu(true)}
        >
          <Ionicons name="headset" size={24} color="#0099ff" />
          <Text style={styles.deviceSelectorText}>Hoparlör / Kulaklık</Text>
          <Ionicons name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>

        {/* Input Device */}
        <TouchableOpacity 
          style={styles.deviceSelector}
          onPress={() => setShowInputMenu(true)}
        >
          <Ionicons name="mic" size={24} color="#0099ff" />
          <Text style={styles.deviceSelectorText}>Mikrofon</Text>
          <Ionicons name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Output Device Modal */}
      <Modal
        visible={showOutputMenu}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOutputMenu(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hoparlör / Kulaklık</Text>
              <TouchableOpacity onPress={() => setShowOutputMenu(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
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
              {devices.output.length === 0 && (
                <Text style={styles.emptyText}>Cihaz bulunamadı</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Input Device Modal */}
      <Modal
        visible={showInputMenu}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInputMenu(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mikrofon</Text>
              <TouchableOpacity onPress={() => setShowInputMenu(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
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
              {devices.input.length === 0 && (
                <Text style={styles.emptyText}>Cihaz bulunamadı</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  mediaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  mediaThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  mediaInfo: {
    flex: 1,
  },
  mediaTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  mediaArtist: {
    color: '#999',
    fontSize: 14,
    marginBottom: 2,
  },
  mediaAlbum: {
    color: '#666',
    fontSize: 12,
  },
  mediaStatus: {
    padding: 8,
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
  deviceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  deviceSelectorText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
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
    maxHeight: '70%',
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
  deviceCard: {
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
  deviceName: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 32,
  },
});
