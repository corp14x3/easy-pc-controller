import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

class APIClient {
  constructor() {
    this.baseURL = '';
    this.client = null;
  }

  async initialize() {
    const ip = await AsyncStorage.getItem('server_ip');
    const port = await AsyncStorage.getItem('server_port');
    
    if (ip && port) {
      this.baseURL = `http://${ip}:${port}`;
      this.client = axios.create({
        baseURL: this.baseURL,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }

  async setServer(ip, port) {
    await AsyncStorage.setItem('server_ip', ip);
    await AsyncStorage.setItem('server_port', port);
    await this.initialize();
  }

  // Health check
  async checkHealth() {
    try {
      const response = await this.client.get('/api/health');
      return response.data;
    } catch (error) {
      throw new Error('Sunucuya bağlanılamıyor');
    }
  }

  // Applications
  async getApplications() {
    const response = await this.client.get('/api/applications/list');
    return response.data;
  }

  async focusApplication(name) {
    const response = await this.client.post('/api/applications/focus', { name });
    return response.data;
  }

  async killApplication(pid) {
    const response = await this.client.post('/api/applications/kill', { pid });
    return response.data;
  }

  async getInstalledApplications() {
    const response = await this.client.get('/api/applications/installed');
    return response.data;
  }

  async launchApplication(path) {
    const response = await this.client.post('/api/applications/launch', { path });
    return response.data;
  }

  // Audio
  async getVolume() {
    const response = await this.client.get('/api/audio/volume/get');
    return response.data;
  }

  async setVolume(volume) {
    const response = await this.client.post('/api/audio/volume/set', { volume });
    return response.data;
  }

  async toggleMute() {
    const response = await this.client.post('/api/audio/mute/toggle');
    return response.data;
  }

  async getAudioDevices() {
    const response = await this.client.get('/api/audio/devices/list');
    return response.data;
  }

  async setAudioDevice(device_id, type) {
    const response = await this.client.post('/api/audio/device/set', { device_id, type });
    return response.data;
  }

  async controlMedia(action) {
    const response = await this.client.post('/api/media/control', { action });
    return response.data;
  }

  async getMediaInfo() {
    const response = await this.client.get('/api/media/info');
    return response.data;
  }

  // System
  async shutdownSystem() {
    const response = await this.client.post('/api/system/shutdown');
    return response.data;
  }

  async restartSystem() {
    const response = await this.client.post('/api/system/restart');
    return response.data;
  }

  async executeCommand(command, shell = 'cmd') {
    const response = await this.client.post('/api/terminal/execute', { command, shell });
    return response.data;
  }

  async getSystemInfo() {
    const response = await this.client.get('/api/system/info');
    return response.data;
  }

  // Config
  async getConfig() {
    const response = await this.client.get('/api/config/get');
    return response.data;
  }

  async saveConfig(config) {
    const response = await this.client.post('/api/config/save', config);
    return response.data;
  }
}

export default new APIClient();
