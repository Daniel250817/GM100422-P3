import * as CryptoJS from 'crypto-js';

export interface TOTPConfig {
  secret: string;
  issuer: string;
  account: string;
  qrCodeUrl: string;
}

class TOTPServiceSimple {
  private readonly ISSUER = 'TimeTrack';
  private readonly ALGORITHM = 'SHA1';
  private readonly DIGITS = 6;
  private readonly PERIOD = 30;

  /**
   * Genera un secreto aleatorio para TOTP (simplificado)
   */
  generateSecret(): string {
    // Generar un secreto base32 simple para testing
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Genera la URL TOTP para códigos QR
   */
  generateTOTPUrl(secret: string, account: string): string {
    const encodedIssuer = encodeURIComponent(this.ISSUER);
    const encodedAccount = encodeURIComponent(account);
    
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=${this.ALGORITHM}&digits=${this.DIGITS}&period=${this.PERIOD}`;
  }

  /**
   * Genera la configuración completa de TOTP
   */
  generateTOTPConfig(account: string): TOTPConfig {
    const secret = this.generateSecret();
    const qrCodeUrl = this.generateTOTPUrl(secret, account);
    
    return {
      secret,
      issuer: this.ISSUER,
      account,
      qrCodeUrl
    };
  }

  /**
   * Valida un código TOTP usando el algoritmo estándar
   */
  async validateTOTPCode(secret: string, code: string): Promise<boolean> {
    try {
      // Validar formato del código
      if (!/^\d{6}$/.test(code)) {
        console.log('❌ Código TOTP inválido: debe ser de 6 dígitos');
        return false;
      }

      // Calcular el código esperado para el tiempo actual
      const currentTime = Math.floor(Date.now() / 1000);
      const timeWindow = Math.floor(currentTime / this.PERIOD);
      
      console.log(`🔐 Validando código TOTP: ${code} con secreto: ${secret.substring(0, 8)}...`);
      console.log(`⏰ Tiempo actual: ${currentTime}, Ventana: ${timeWindow}`);
      
      // Verificar el código actual y los códigos de las ventanas de tiempo adyacentes
      for (let i = -1; i <= 1; i++) {
        const testTime = timeWindow + i;
        const expectedCode = this.generateTOTPCode(secret, testTime);
        console.log(`🔍 Probando ventana ${i}: ${expectedCode} (tiempo: ${testTime})`);
        
        if (expectedCode === code) {
          console.log('✅ Código TOTP válido');
          return true;
        }
      }
      
      console.log('❌ Código TOTP inválido: no coincide con ninguna ventana de tiempo');
      return false;
    } catch (error) {
      console.log('Error validating TOTP code:', error);
      return false;
    }
  }

  /**
   * Genera un código TOTP para un tiempo específico
   */
  private generateTOTPCode(secret: string, time: number): string {
    try {
      console.log(`🔐 Generando código TOTP para tiempo: ${time}`);
      
      // Convertir el secreto base32 a bytes
      const secretBytes = this.base32Decode(secret);
      console.log(`🔑 Secreto decodificado: ${secretBytes.length} bytes`);
      
      // Crear el mensaje HMAC (tiempo en big-endian de 8 bytes)
      const timeBuffer = new ArrayBuffer(8);
      const timeView = new DataView(timeBuffer);
      timeView.setUint32(0, Math.floor(time / 0x100000000));
      timeView.setUint32(4, time & 0xffffffff);
      
      console.log(`⏰ Buffer de tiempo: ${Array.from(new Uint8Array(timeBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')}`);
      
      // Convertir a WordArray para crypto-js
      const key = CryptoJS.lib.WordArray.create(Array.from(secretBytes));
      const message = CryptoJS.lib.WordArray.create(Array.from(new Uint8Array(timeBuffer)));
      
      // Generar HMAC-SHA1
      const hmac = CryptoJS.HmacSHA1(message, key);
      const hmacBytes = hmac.words;
      
      console.log(`🔐 HMAC generado: ${hmac.toString()}`);
      
      // Extraer el código de 6 dígitos usando el algoritmo TOTP estándar
      const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
      const code = ((hmacBytes[offset] & 0x7f) << 24) |
                   ((hmacBytes[offset + 1] & 0xff) << 16) |
                   ((hmacBytes[offset + 2] & 0xff) << 8) |
                   (hmacBytes[offset + 3] & 0xff);
      
      const finalCode = (code % 1000000).toString().padStart(6, '0');
      console.log(`✅ Código TOTP generado: ${finalCode}`);
      
      return finalCode;
    } catch (error) {
      console.log('Error generating TOTP code:', error);
      throw error;
    }
  }


  /**
   * Genera el código TOTP actual para un secreto dado
   */
  generateCurrentCode(secret: string): string {
    const currentTime = Math.floor(Date.now() / 1000);
    const timeWindow = Math.floor(currentTime / this.PERIOD);
    return this.generateTOTPCode(secret, timeWindow);
  }

  /**
   * Codifica bytes a base32
   */
  private base32Encode(bytes: Uint8Array): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;
    
    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8) | bytes[i];
      bits += 8;
      
      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    
    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }
    
    return result;
  }

  /**
   * Decodifica base32 a bytes
   */
  private base32Decode(str: string): Uint8Array {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const lookup = new Map();
    
    for (let i = 0; i < alphabet.length; i++) {
      lookup.set(alphabet[i], i);
    }
    
    let bits = 0;
    let value = 0;
    const result: number[] = [];
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i].toUpperCase();
      if (!lookup.has(char)) continue;
      
      value = (value << 5) | lookup.get(char);
      bits += 5;
      
      if (bits >= 8) {
        result.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    
    return new Uint8Array(result);
  }

  /**
   * Genera un código TOTP de prueba (para testing)
   */
  generateTestCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

export default new TOTPServiceSimple();
