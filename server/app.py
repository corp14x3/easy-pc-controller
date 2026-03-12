from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess
import platform
import json
import os
import psutil
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Config dosyası
CONFIG_FILE = 'config.json'

def load_config():
    """Konfigürasyon dosyasını yükle"""
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {'port': 5000, 'os': platform.system()}

def save_config(config):
    """Konfigürasyon dosyasını kaydet"""
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=4)

config = load_config()

# OS detection
IS_WINDOWS = platform.system() == 'Windows'
IS_LINUX = platform.system() == 'Linux'

# ============================================
# UYGULAMALAR
# ============================================

@app.route('/api/applications/list', methods=['GET'])
def list_applications():
    """Açık uygulamaları listele"""
    try:
        apps = []
        for proc in psutil.process_iter(['pid', 'name', 'exe']):
            try:
                pinfo = proc.info
                if pinfo['name'] and pinfo['name'] not in ['System', 'Registry', 'Idle']:
                    # Windows için pencere kontrolü
                    if IS_WINDOWS:
                        try:
                            import win32gui
                            import win32process
                            
                            def callback(hwnd, windows):
                                if win32gui.IsWindowVisible(hwnd):
                                    _, pid = win32process.GetWindowThreadProcessId(hwnd)
                                    if pid == pinfo['pid']:
                                        windows.append({
                                            'pid': pinfo['pid'],
                                            'name': pinfo['name'],
                                            'exe': pinfo['exe'],
                                            'hwnd': hwnd
                                        })
                            
                            windows = []
                            win32gui.EnumWindows(callback, windows)
                            if windows:
                                apps.extend(windows)
                        except:
                            pass
                    else:
                        # Linux için basit liste
                        apps.append({
                            'pid': pinfo['pid'],
                            'name': pinfo['name'],
                            'exe': pinfo['exe']
                        })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # Duplicate'leri temizle
        unique_apps = {}
        for app in apps:
            if app['name'] not in unique_apps:
                unique_apps[app['name']] = app
        
        return jsonify({
            'status': 'success',
            'applications': list(unique_apps.values())
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/applications/focus', methods=['POST'])
def focus_application():
    """Uygulamayı ön plana getir"""
    try:
        data = request.json
        app_name = data.get('name')
        
        if IS_WINDOWS:
            ps_command = f"""
            $processes = Get-Process | Where-Object {{$_.ProcessName -like '*{app_name}*' -and $_.MainWindowHandle -ne 0}} | Select-Object -First 1
            if ($processes) {{
                Add-Type @"
                    using System;
                    using System.Runtime.InteropServices;
                    public class WinAPI {{
                        [DllImport("user32.dll")]
                        public static extern bool SetForegroundWindow(IntPtr hWnd);
                        [DllImport("user32.dll")]
                        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
                    }}
"@
                $handle = $processes.MainWindowHandle
                [WinAPI]::ShowWindow($handle, 9)
                [WinAPI]::SetForegroundWindow($handle)
            }}
            """
            subprocess.run(['powershell', '-ExecutionPolicy', 'Bypass', '-Command', ps_command])
        else:
            # Linux için wmctrl kullan
            subprocess.run(['wmctrl', '-a', app_name])
        
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/applications/kill', methods=['POST'])
def kill_application():
    """Uygulamayı sonlandır"""
    try:
        data = request.json
        pid = data.get('pid')
        
        process = psutil.Process(pid)
        process.kill()
        
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/applications/installed', methods=['GET'])
def list_installed_applications():
    """PC'deki kurulu programları listele"""
    try:
        apps = []
        
        if IS_WINDOWS:
            # Windows için registry ve Start Menu kontrolü
            import winreg
            
            paths = [
                r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
                r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
            ]
            
            for path in paths:
                try:
                    key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, path)
                    for i in range(winreg.QueryInfoKey(key)[0]):
                        try:
                            subkey_name = winreg.EnumKey(key, i)
                            subkey = winreg.OpenKey(key, subkey_name)
                            try:
                                name = winreg.QueryValueEx(subkey, "DisplayName")[0]
                                exe_path = winreg.QueryValueEx(subkey, "DisplayIcon")[0] if "DisplayIcon" in [winreg.EnumValue(subkey, j)[0] for j in range(winreg.QueryInfoKey(subkey)[1])] else None
                                apps.append({'name': name, 'path': exe_path})
                            except:
                                pass
                            winreg.CloseKey(subkey)
                        except:
                            pass
                    winreg.CloseKey(key)
                except:
                    pass
        else:
            # Linux için .desktop dosyalarını tara
            desktop_paths = [
                '/usr/share/applications',
                os.path.expanduser('~/.local/share/applications')
            ]
            
            for desktop_path in desktop_paths:
                if os.path.exists(desktop_path):
                    for file in os.listdir(desktop_path):
                        if file.endswith('.desktop'):
                            try:
                                with open(os.path.join(desktop_path, file), 'r') as f:
                                    content = f.read()
                                    name_line = [l for l in content.split('\n') if l.startswith('Name=')]
                                    exec_line = [l for l in content.split('\n') if l.startswith('Exec=')]
                                    if name_line and exec_line:
                                        apps.append({
                                            'name': name_line[0].replace('Name=', ''),
                                            'path': exec_line[0].replace('Exec=', '')
                                        })
                            except:
                                pass
        
        return jsonify({
            'status': 'success',
            'applications': apps[:100]  # İlk 100 uygulama
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/applications/launch', methods=['POST'])
def launch_application():
    """Uygulama başlat"""
    try:
        data = request.json
        app_path = data.get('path')
        
        if IS_WINDOWS:
            subprocess.Popen(app_path, shell=True)
        else:
            subprocess.Popen(app_path.split())
        
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ============================================
# SES KONTROLÜ
# ============================================

@app.route('/api/audio/volume/get', methods=['GET'])
def get_volume():
    """Sistem ses seviyesini al"""
    try:
        if IS_WINDOWS:
            from ctypes import cast, POINTER
            from comtypes import CLSCTX_ALL
            from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
            
            devices = AudioUtilities.GetSpeakers()
            interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
            volume = cast(interface, POINTER(IAudioEndpointVolume))
            
            current_volume = volume.GetMasterVolumeLevelScalar() * 100
            is_muted = volume.GetMute()
            
            return jsonify({
                'status': 'success',
                'volume': int(current_volume),
                'muted': bool(is_muted)
            })
        else:
            # Linux için amixer kullan
            result = subprocess.run(['amixer', 'get', 'Master'], capture_output=True, text=True)
            volume_line = [l for l in result.stdout.split('\n') if 'Playback' in l and '%' in l][0]
            volume = int(volume_line.split('[')[1].split('%')[0])
            is_muted = '[off]' in volume_line
            
            return jsonify({
                'status': 'success',
                'volume': volume,
                'muted': is_muted
            })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/audio/volume/set', methods=['POST'])
def set_volume():
    """Sistem ses seviyesini ayarla"""
    try:
        data = request.json
        volume = data.get('volume', 50)
        
        if IS_WINDOWS:
            from ctypes import cast, POINTER
            from comtypes import CLSCTX_ALL
            from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
            
            devices = AudioUtilities.GetSpeakers()
            interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
            volume_interface = cast(interface, POINTER(IAudioEndpointVolume))
            
            volume_interface.SetMasterVolumeLevelScalar(volume / 100, None)
        else:
            subprocess.run(['amixer', 'set', 'Master', f'{volume}%'])
        
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/audio/mute/toggle', methods=['POST'])
def toggle_mute():
    """Sesi aç/kapat"""
    try:
        if IS_WINDOWS:
            from ctypes import cast, POINTER
            from comtypes import CLSCTX_ALL
            from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
            
            devices = AudioUtilities.GetSpeakers()
            interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
            volume = cast(interface, POINTER(IAudioEndpointVolume))
            
            current_mute = volume.GetMute()
            volume.SetMute(not current_mute, None)
        else:
            subprocess.run(['amixer', 'set', 'Master', 'toggle'])
        
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/audio/devices/list', methods=['GET'])
def list_audio_devices():
    """Ses cihazlarını listele"""
    try:
        devices = {'output': [], 'input': []}
        
        if IS_WINDOWS:
            from pycaw.pycaw import AudioUtilities
            
            # Output devices
            for device in AudioUtilities.GetAllDevices():
                devices['output'].append({
                    'id': str(device.id),
                    'name': device.FriendlyName
                })
        else:
            # Linux için pactl kullan
            result = subprocess.run(['pactl', 'list', 'sinks', 'short'], capture_output=True, text=True)
            for line in result.stdout.split('\n'):
                if line:
                    parts = line.split('\t')
                    devices['output'].append({
                        'id': parts[0],
                        'name': parts[1]
                    })
        
        return jsonify({
            'status': 'success',
            'devices': devices
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/audio/device/set', methods=['POST'])
def set_audio_device():
    """Varsayılan ses cihazını değiştir"""
    try:
        data = request.json
        device_id = data.get('device_id')
        device_type = data.get('type', 'output')  # output veya input
        
        if IS_WINDOWS:
            # Windows için PolicyConfig kullanılabilir (kompleks)
            # Şimdilik basit bir çözüm
            pass
        else:
            if device_type == 'output':
                subprocess.run(['pactl', 'set-default-sink', device_id])
            else:
                subprocess.run(['pactl', 'set-default-source', device_id])
        
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/media/control', methods=['POST'])
def media_control():
    """Medya kontrolü (play, pause, next, previous)"""
    try:
        data = request.json
        action = data.get('action')  # play, pause, next, previous, stop
        
        if IS_WINDOWS:
            # Windows için media keys gönder
            import win32api
            import win32con
            
            keys = {
                'play': 0xB3,      # VK_MEDIA_PLAY_PAUSE
                'pause': 0xB3,
                'next': 0xB0,      # VK_MEDIA_NEXT_TRACK
                'previous': 0xB1,  # VK_MEDIA_PREV_TRACK
                'stop': 0xB2       # VK_MEDIA_STOP
            }
            
            if action in keys:
                win32api.keybd_event(keys[action], 0, 0, 0)
                win32api.keybd_event(keys[action], 0, win32con.KEYEVENTF_KEYUP, 0)
        else:
            # Linux için playerctl kullan
            actions = {
                'play': 'play',
                'pause': 'pause',
                'next': 'next',
                'previous': 'previous',
                'stop': 'stop'
            }
            
            if action in actions:
                subprocess.run(['playerctl', actions[action]])
        
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ============================================
# CMD / TERMINAL
# ============================================

@app.route('/api/system/shutdown', methods=['POST'])
def shutdown_system():
    """Bilgisayarı kapat"""
    try:
        if IS_WINDOWS:
            subprocess.run(['shutdown', '/s', '/t', '0'])
        else:
            subprocess.run(['sudo', 'shutdown', 'now'])
        
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/system/restart', methods=['POST'])
def restart_system():
    """Bilgisayarı yeniden başlat"""
    try:
        if IS_WINDOWS:
            subprocess.run(['shutdown', '/r', '/t', '0'])
        else:
            subprocess.run(['sudo', 'reboot'])
        
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/terminal/execute', methods=['POST'])
def execute_command():
    """Terminal komutu çalıştır"""
    try:
        data = request.json
        command = data.get('command')
        shell_type = data.get('shell', 'cmd')  # cmd veya powershell
        
        if IS_WINDOWS:
            if shell_type == 'powershell':
                result = subprocess.run(
                    ['powershell', '-Command', command],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
            else:
                result = subprocess.run(
                    command,
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
        else:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )
        
        return jsonify({
            'status': 'success',
            'output': result.stdout,
            'error': result.stderr,
            'returncode': result.returncode
        })
    except subprocess.TimeoutExpired:
        return jsonify({'status': 'error', 'message': 'Komut zaman aşımına uğradı'}), 500
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ============================================
# AYARLAR
# ============================================

@app.route('/api/config/get', methods=['GET'])
def get_config():
    """Konfigürasyonu al"""
    return jsonify({
        'status': 'success',
        'config': config
    })

@app.route('/api/config/save', methods=['POST'])
def save_config_endpoint():
    """Konfigürasyonu kaydet"""
    try:
        data = request.json
        global config
        config = data
        save_config(config)
        
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/system/info', methods=['GET'])
def system_info():
    """Sistem bilgilerini al"""
    return jsonify({
        'status': 'success',
        'info': {
            'os': platform.system(),
            'os_version': platform.version(),
            'hostname': platform.node(),
            'cpu': platform.processor(),
            'python_version': platform.python_version()
        }
    })

# ============================================
# HEALTH CHECK
# ============================================

@app.route('/api/health', methods=['GET'])
def health():
    """Server durumu kontrolü"""
    return jsonify({
        'status': 'ok',
        'version': '1.0.0',
        'os': platform.system()
    })

if __name__ == '__main__':
    port = config.get('port', 5000)
    print(f"🚀 PC Controller Server başlatılıyor...")
    print(f"📡 Port: {port}")
    print(f"💻 OS: {platform.system()}")
    print(f"🌐 Erişim: http://0.0.0.0:{port}")
    print(f"\n⚠️  Telefon için IP adresiniz: ipconfig (Windows) veya ifconfig (Linux) ile öğrenin")
    
    app.run(host='0.0.0.0', port=port, debug=True)
