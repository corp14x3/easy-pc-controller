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

def install_audio_module():
    """AudioDeviceCmdlets modülünü otomatik kur"""
    if IS_WINDOWS:
        try:
            # Modül kurulu mu kontrol et
            check_cmd = "Get-Module -ListAvailable -Name AudioDeviceCmdlets"
            result = subprocess.run(['powershell', '-Command', check_cmd], 
                                   capture_output=True, text=True,
                                   encoding='utf-8', errors='ignore')
            
            if 'AudioDeviceCmdlets' not in result.stdout:
                print("⏳ AudioDeviceCmdlets modülü kuruluyor...")
                install_cmd = "Install-Module -Name AudioDeviceCmdlets -Force -Scope CurrentUser"
                subprocess.run(['powershell', '-Command', install_cmd], 
                             capture_output=True, encoding='utf-8', errors='ignore')
                print("✅ AudioDeviceCmdlets modülü kuruldu!")
            else:
                print("✅ AudioDeviceCmdlets modülü zaten kurulu")
        except Exception as e:
            print(f"⚠️ Modül kurulum hatası (devam ediliyor): {e}")

# Uygulama başlarken modülü kur
install_audio_module()

# ============================================
# UYGULAMALAR
# ============================================

@app.route('/api/applications/list', methods=['GET'])
def list_applications():
    """Açık uygulamaları listele"""
    try:
        apps = []
        # Steam oyunlarını ve sistem süreçlerini filtrele
        excluded_names = ['steam', 'steamwebhelper', 'steamerrorrepor', 'steamservice', 
                         'System', 'Registry', 'Idle', 'svchost', 'csrss', 'wininit']
        
        for proc in psutil.process_iter(['pid', 'name', 'exe']):
            try:
                pinfo = proc.info
                if pinfo['name']:
                    # Filtreleme
                    name_lower = pinfo['name'].lower()
                    if any(excluded in name_lower for excluded in excluded_names):
                        continue
                    
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
    """Uygulamayı ön plana getir - AGRESİF YÖNTEM"""
    try:
        data = request.json
        app_name = data.get('name')
        
        if IS_WINDOWS:
            # PowerShell ile pencereyi zorla ön plana getir
            ps_script = f"""
$processName = "{app_name}".Replace('.exe', '')
$processes = Get-Process -Name $processName -ErrorAction SilentlyContinue

Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    public class WinAPI {{
        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);
        
        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        
        [DllImport("user32.dll")]
        public static extern bool IsIconic(IntPtr hWnd);
        
        [DllImport("user32.dll")]
        public static extern bool BringWindowToTop(IntPtr hWnd);
        
        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();
        
        [DllImport("user32.dll")]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, IntPtr ProcessId);
        
        [DllImport("user32.dll")]
        public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
    }}
"@

if ($processes) {{
    foreach ($process in $processes) {{
        if ($process.MainWindowHandle -ne 0) {{
            $handle = $process.MainWindowHandle
            
            # 1. Minimize ise restore et
            if ([WinAPI]::IsIconic($handle)) {{
                [WinAPI]::ShowWindow($handle, 9) | Out-Null
            }}
            
            # 2. Göster
            [WinAPI]::ShowWindow($handle, 5) | Out-Null
            
            # 3. Thread input'ları birleştir (AGRESİF)
            $foregroundWindow = [WinAPI]::GetForegroundWindow()
            $foregroundThread = [WinAPI]::GetWindowThreadProcessId($foregroundWindow, [IntPtr]::Zero)
            $targetThread = [WinAPI]::GetWindowThreadProcessId($handle, [IntPtr]::Zero)
            
            if ($foregroundThread -ne $targetThread) {{
                [WinAPI]::AttachThreadInput($foregroundThread, $targetThread, $true)
                [WinAPI]::BringWindowToTop($handle) | Out-Null
                [WinAPI]::SetForegroundWindow($handle) | Out-Null
                [WinAPI]::AttachThreadInput($foregroundThread, $targetThread, $false)
            }} else {{
                [WinAPI]::BringWindowToTop($handle) | Out-Null
                [WinAPI]::SetForegroundWindow($handle) | Out-Null
            }}
            
            # 4. Tekrar göster (emin olmak için)
            [WinAPI]::ShowWindow($handle, 5) | Out-Null
            
            Write-Output "Focused: $($process.ProcessName)"
            break
        }}
    }}
}}
"""
            
            result = subprocess.run(
                ['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps_script],
                capture_output=True,
                text=True,
                timeout=5,
                encoding='utf-8',
                errors='ignore'
            )
            
            print(f"[FOCUS] {app_name} → {result.stdout.strip()}")
            
            return jsonify({'status': 'success'})
        else:
            # Linux
            subprocess.run(['wmctrl', '-a', app_name])
            return jsonify({'status': 'success'})
            
    except Exception as e:
        print(f"[FOCUS ERROR] {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500



@app.route('/api/applications/kill', methods=['POST'])
def kill_application():
    """Uygulamayı sonlandır - TASKKILL"""
    try:
        data = request.json
        pid = data.get('pid')
        
        if IS_WINDOWS:
            # CMD taskkill komutu - EN GÜVENİLİR
            cmd = f"taskkill /F /PID {pid}"
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='ignore'
            )
            
            print(f"[KILL] PID {pid}")
            print(f"[KILL OUTPUT] {result.stdout}")
            print(f"[KILL ERROR] {result.stderr}")
            
            return jsonify({'status': 'success'})
        else:
            # Linux
            subprocess.run(['kill', '-9', str(pid)])
            return jsonify({'status': 'success'})
            
    except Exception as e:
        print(f"[KILL EXCEPTION] {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/applications/installed', methods=['GET'])
def get_installed_applications():
    """Yüklü uygulamaları listele - STEAM OYUNLARI DAHİL"""
    try:
        apps = []
        
        if IS_WINDOWS:
            import winreg
            
            found_apps = {}
            
            # 1. NORMAL UYGULAMALAR (Registry)
            registry_paths = [
                r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
                r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
            ]
            
            for reg_path in registry_paths:
                try:
                    key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, reg_path)
                    
                    for i in range(0, winreg.QueryInfoKey(key)[0]):
                        try:
                            subkey_name = winreg.EnumKey(key, i)
                            subkey = winreg.OpenKey(key, subkey_name)
                            
                            try:
                                name = winreg.QueryValueEx(subkey, "DisplayName")[0]
                                install_location = None
                                
                                try:
                                    install_location = winreg.QueryValueEx(subkey, "InstallLocation")[0]
                                except:
                                    pass
                                
                                exe_path = None
                                if install_location and os.path.exists(install_location):
                                    possible_names = [
                                        f"{name}.exe",
                                        f"{name.split()[0]}.exe",
                                        "app.exe",
                                        "main.exe",
                                        "launcher.exe"
                                    ]
                                    
                                    for exe_name in possible_names:
                                        exe_full_path = os.path.join(install_location, exe_name)
                                        if os.path.exists(exe_full_path):
                                            exe_path = exe_full_path
                                            break
                                    
                                    if not exe_path:
                                        for file in os.listdir(install_location):
                                            if file.endswith('.exe') and not file.lower().startswith('unins'):
                                                exe_path = os.path.join(install_location, file)
                                                break
                                
                                # Filtreleme
                                skip_keywords = [
                                    'update', 'uninstall', 'installer', 'setup', 'redist',
                                    'runtime', 'service', 'driver', 'microsoft visual',
                                    'microsoft .net', 'directx', 'vcredist', 'framework',
                                    'redistributable', 'components', 'tools', 'sdk'
                                ]
                                
                                name_lower = name.lower()
                                if any(keyword in name_lower for keyword in skip_keywords):
                                    continue
                                
                                if name and exe_path:
                                    found_apps[name] = {
                                        'name': name,
                                        'path': exe_path,
                                        'type': 'app'
                                    }
                                
                            except:
                                pass
                            
                            winreg.CloseKey(subkey)
                        except:
                            pass
                    
                    winreg.CloseKey(key)
                except:
                    pass
            
            # 2. STEAM OYUNLARI
            try:
                # Steam registry'den oyunları bul
                steam_key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam")
                steam_path = winreg.QueryValueEx(steam_key, "SteamPath")[0]
                winreg.CloseKey(steam_key)
                
                # steamapps klasörünü kontrol et
                steamapps_path = os.path.join(steam_path, "steamapps")
                
                if os.path.exists(steamapps_path):
                    # .acf dosyalarını oku (her oyun için bir tane)
                    for file in os.listdir(steamapps_path):
                        if file.startswith("appmanifest_") and file.endswith(".acf"):
                            acf_path = os.path.join(steamapps_path, file)
                            
                            try:
                                with open(acf_path, 'r', encoding='utf-8') as f:
                                    content = f.read()
                                    
                                    # Oyun adını bul
                                    name_match = content.split('"name"')[1].split('"')[1]
                                    # App ID'yi bul
                                    appid_match = content.split('"appid"')[1].split('"')[1]
                                    
                                    if name_match and appid_match:
                                        # Steam URL ile başlat
                                        steam_url = f"steam://rungameid/{appid_match}"
                                        
                                        found_apps[f"🎮 {name_match}"] = {
                                            'name': f"🎮 {name_match}",
                                            'path': steam_url,
                                            'type': 'steam'
                                        }
                            except Exception as e:
                                print(f"Error reading {file}: {e}")
                                pass
            except Exception as e:
                print(f"Steam games error: {e}")
                pass
            
            # Alfabetik sırala
            apps = sorted(found_apps.values(), key=lambda x: x['name'].lower())
            
        else:
            apps = []
        
        print(f"[DEBUG] Found {len(apps)} applications (apps + steam games)")
        
        return jsonify({
            'status': 'success',
            'applications': apps
        })
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': str(e)}), 500



@app.route('/api/applications/launch', methods=['POST'])
def launch_application():
    """Uygulama başlat - STEAM DESTEKLI"""
    try:
        data = request.json
        path = data.get('path')
        
        if path.startswith('steam://'):
            # Steam oyunu - steam:// URL'sini aç
            if IS_WINDOWS:
                os.startfile(path)
            else:
                subprocess.Popen(['xdg-open', path])
        else:
            # Normal uygulama
            if IS_WINDOWS:
                subprocess.Popen(path, shell=True)
            else:
                subprocess.Popen(path, shell=True)
        
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ============================================
# SES KONTROLÜ
# ============================================

@app.route('/api/audio/volume/get', methods=['GET'])
def get_volume():
    """Ses seviyesini al"""
    try:
        if IS_WINDOWS:
            ps_cmd = """
$device = Get-AudioDevice -Playback
[PSCustomObject]@{
    volume = $device.Volume
    muted = $device.Mute
} | ConvertTo-Json -Compress
"""
            result = subprocess.run(['powershell', '-Command', ps_cmd],
                                   capture_output=True, text=True,
                                   encoding='utf-8', errors='ignore', timeout=3)
            
            if result.stdout.strip():
                data = json.loads(result.stdout.strip())
                return jsonify({
                    'status': 'success',
                    'volume': int(data['volume']),
                    'muted': data['muted']
                })
        
        return jsonify({'status': 'error', 'message': 'Platform not supported'}), 500
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    

@app.route('/api/audio/volume/set', methods=['POST'])
def set_volume():
    """Ses seviyesini ayarla"""
    try:
        data = request.json
        volume = data.get('volume', 50)
        
        if IS_WINDOWS:
            ps_cmd = f"Set-AudioDevice -PlaybackVolume {volume}"
            subprocess.run(['powershell', '-Command', ps_cmd],
                          capture_output=True, encoding='utf-8', errors='ignore')
            return jsonify({'status': 'success'})
        
        return jsonify({'status': 'error', 'message': 'Platform not supported'}), 500
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/audio/mute/toggle', methods=['POST'])
def toggle_mute():
    """Sesi aç/kapat"""
    try:
        if IS_WINDOWS:
            # Mevcut durumu al
            ps_get = """
(Get-AudioDevice -Playback).Mute
"""
            result = subprocess.run(['powershell', '-Command', ps_get],
                                   capture_output=True, text=True,
                                   encoding='utf-8', errors='ignore')
            
            current_mute = result.stdout.strip().lower() == 'true'
            new_mute = 'false' if current_mute else 'true'
            
            # Toggle yap
            ps_set = f"Set-AudioDevice -PlaybackMute ${new_mute}"
            subprocess.run(['powershell', '-Command', ps_set],
                          capture_output=True, encoding='utf-8', errors='ignore')
            
            return jsonify({'status': 'success'})
        
        return jsonify({'status': 'error', 'message': 'Platform not supported'}), 500
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# =================================================
# BU KODU app.py'deki /api/audio/devices/list endpoint'inin YERİNE KOY
# =================================================

@app.route('/api/audio/devices/list', methods=['GET'])
def list_audio_devices():
    """Ses cihazlarını listele - BASİT YÖNTEM"""
    try:
        devices = {'output': [], 'input': []}
        
        if IS_WINDOWS:
            # PowerShell ile output devices
            ps_output = """
Get-AudioDevice -List | Where-Object {$_.Type -eq "Playback"} | ForEach-Object {
    "$($_.Index)|$($_.Name)"
}
"""
            result = subprocess.run(['powershell', '-Command', ps_output], 
                                   capture_output=True, text=True, 
                                   encoding='utf-8', errors='ignore')
            
            for line in result.stdout.strip().split('\n'):
                if '|' in line:
                    idx, name = line.split('|', 1)
                    devices['output'].append({'id': idx.strip(), 'name': name.strip()})
            
            # PowerShell ile input devices
            ps_input = """
Get-AudioDevice -List | Where-Object {$_.Type -eq "Recording"} | ForEach-Object {
    "$($_.Index)|$($_.Name)"
}
"""
            result = subprocess.run(['powershell', '-Command', ps_input], 
                                   capture_output=True, text=True,
                                   encoding='utf-8', errors='ignore')
            
            for line in result.stdout.strip().split('\n'):
                if '|' in line:
                    idx, name = line.split('|', 1)
                    devices['input'].append({'id': idx.strip(), 'name': name.strip()})
        
        print(f"[DEBUG] Output: {len(devices['output'])}, Input: {len(devices['input'])}")
        
        return jsonify({'status': 'success', 'devices': devices})
    except Exception as e:
        print(f"[ERROR] {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


# =================================================
# BU KODU app.py'deki /api/audio/device/set endpoint'inin YERİNE KOY
# =================================================

@app.route('/api/audio/device/set', methods=['POST'])
def set_audio_device():
    """Ses cihazını değiştir - BASİT YÖNTEM"""
    try:
        data = request.json
        device_id = data.get('device_id')
        device_type = data.get('type')  # 'output' veya 'input'
        
        if IS_WINDOWS:
            if device_type == 'output':
                # Output cihazını değiştir
                ps_cmd = f"Set-AudioDevice -Index {device_id}"
            else:
                # Input cihazını değiştir
                ps_cmd = f"Set-AudioDevice -Index {device_id} -CommunicationOnly"
            
            subprocess.run(['powershell', '-Command', ps_cmd], 
                          capture_output=True, encoding='utf-8', errors='ignore')
        
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
    os_type = platform.system()
    shell_type = 'cmd' if IS_WINDOWS else 'bash'
    
    return jsonify({
        'status': 'success',
        'info': {
            'os': os_type,
            'os_version': platform.version(),
            'hostname': platform.node(),
            'cpu': platform.processor(),
            'python_version': platform.python_version(),
            'shell_type': shell_type,
            'available_shells': ['cmd', 'powershell'] if IS_WINDOWS else ['bash']
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




@app.route('/api/media/info', methods=['GET'])
def get_media_info():
    """Şu an çalan medya bilgisini al - TÜRKÇE KARAKTER DESTEĞİ"""
    try:
        if IS_WINDOWS:
            # PowerShell'i UTF-8 ile çalıştır
            ps_script = """
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
Function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}

[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime] | Out-Null
$SessionManager = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$CurrentSession = $SessionManager.GetCurrentSession()

if ($CurrentSession) {
    $MediaProperties = Await ($CurrentSession.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    $PlaybackInfo = $CurrentSession.GetPlaybackInfo()
    
    $result = @{
        title = $MediaProperties.Title
        artist = $MediaProperties.Artist
        album = $MediaProperties.AlbumTitle
        is_playing = ($PlaybackInfo.PlaybackStatus -eq 4)
    }
    
    $result | ConvertTo-Json -Compress
}
"""
            
            try:
                # UTF-8 encoding ile çalıştır
                result = subprocess.run(
                    ['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps_script],
                    capture_output=True,
                    text=True,
                    timeout=3,
                    encoding='utf-8',
                    errors='replace'  # Decode hatalarını ? ile değiştir
                )
                
                if result.returncode == 0 and result.stdout and result.stdout.strip():
                    media_data = json.loads(result.stdout.strip())
                    
                    return jsonify({
                        'status': 'success',
                        'media': {
                            'title': media_data.get('title', ''),
                            'artist': media_data.get('artist', ''),
                            'album': media_data.get('album', ''),
                            'is_playing': media_data.get('is_playing', False),
                            'thumbnail': None
                        }
                    })
            except:
                pass
        
        # Medya yok
        return jsonify({
            'status': 'success',
            'media': None
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500




if __name__ == '__main__':
    port = config.get('port', 5000)
    print(f"🚀 PC Controller Server başlatılıyor...")
    print(f"📡 Port: {port}")
    print(f"💻 OS: {platform.system()}")
    print(f"🌐 Erişim: http://0.0.0.0:{port}")
    print(f"\n⚠️  Telefon için IP adresiniz: ipconfig (Windows) veya ifconfig (Linux) ile öğrenin")
    
    app.run(host='0.0.0.0', port=port, debug=True)
