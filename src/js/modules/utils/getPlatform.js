export function getPlatform() {
          const ua = navigator.userAgent || navigator.vendor || window.opera;
          const platform = navigator.platform.toLowerCase();

          if (/android/i.test(ua)) {
            return 'Android';
          }

          if (/iPhone|iPad|iPod/i.test(ua)) {
            return 'iOS';
          }

          if (platform.includes('mac')) {
            return 'macOS';
          }

          if (platform.includes('win')) {
            return 'Windows';
          }

          if (/linux/.test(platform)) {
            return 'Linux';
          }

          return 'Unknown';
        }
