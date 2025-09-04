class PermissionManager {
  // cek status permission
  static async check(name) {
    if (!navigator.permissions) {
      console.warn("Permissions API tidak tersedia di browser ini");
      return "unsupported";
    }
    try {
      const status = await navigator.permissions.query({ name });
      return status.state; // "granted" | "denied" | "prompt"
    } catch (err) {
      console.warn("Permission tidak dikenal / tidak didukung:", name);
      return "unknown";
    }
  }

  // request permission sesuai API
  static async request(name, options = {}) {
    switch (name) {
      case "geolocation":
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve("granted"),
            () => reject("denied")
          );
        });

      case "notifications":
        return Notification.requestPermission();

      case "microphone":
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          return "granted";
        } catch {
          return "denied";
        }

      case "camera":
        try {
          await navigator.mediaDevices.getUserMedia({ video: true });
          return "granted";
        } catch {
          return "denied";
        }

      case "clipboard-read":
        try {
          await navigator.clipboard.readText();
          return "granted";
        } catch {
          return "denied";
        }

      case "clipboard-write":
        try {
          await navigator.clipboard.writeText(options.text || "");
          return "granted";
        } catch {
          return "denied";
        }

      case "midi":
        try {
          await navigator.requestMIDIAccess({ sysex: options.sysex || false });
          return "granted";
        } catch {
          return "denied";
        }

      // === SENSOR API ===
      case "accelerometer":
      case "gyroscope":
      case "magnetometer":
      case "orientation-sensor":
        // iOS Safari butuh requestPermission
        if (typeof DeviceMotionEvent !== "undefined" && DeviceMotionEvent.requestPermission) {
          try {
            const res = await DeviceMotionEvent.requestPermission();
            return res === "granted" ? "granted" : "denied";
          } catch {
            return "denied";
          }
        }
        if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) {
          try {
            const res = await DeviceOrientationEvent.requestPermission();
            return res === "granted" ? "granted" : "denied";
          } catch {
            return "denied";
          }
        }
        return "granted"; // fallback untuk Chrome/Android

      default:
        console.warn("Request handler untuk permission ini belum dibuat:", name);
        return "unknown";
    }
  }
}
