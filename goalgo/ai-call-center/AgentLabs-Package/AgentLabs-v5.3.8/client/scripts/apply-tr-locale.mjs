/**
 * Merges Turkish translations into tr.json (landing + auth).
 * Run from client/: node scripts/apply-tr-locale.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '../src/i18n/locales');

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const trPath = path.join(localesDir, 'tr.json');
const tr = JSON.parse(fs.readFileSync(trPath, 'utf8'));

const patches = {
  auth: {
    login: 'Giriş Yap',
    logout: 'Çıkış Yap',
    register: 'Kayıt Ol',
    signIn: 'Giriş Yap',
    signUp: 'Kayıt Ol',
    signOut: 'Çıkış Yap',
    getStarted: 'Hemen Başla',
    getStartedFree: 'Ücretsiz Başla',
    welcomeBack: 'Tekrar hoş geldiniz!',
    loggedInAs: '{{name}} olarak giriş yapıldı',
    loginFailed: 'Giriş başarısız',
    registrationFailed: 'Kayıt başarısız',
    accountCreated: 'Hesap oluşturuldu!',
    welcome: 'Hoş geldiniz, {{name}}',
    loggingIn: 'Giriş yapılıyor...',
    fullName: 'Ad Soyad',
    emailPlaceholder: 'ornek@email.com',
    namePlaceholder: 'Ad Soyad',
    passwordPlaceholder: 'Şifrenizi girin',
    confirmPasswordPlaceholder: 'Şifreyi tekrar girin',
    platform: 'Yapay Zeka Çağrı Platformu',
    accessCampaigns: 'Yapay zeka çağrı kampanyalarınıza erişmek için giriş yapın',
    sendVerificationCode: 'Devam Et',
    sendingCode: 'Doğrulama kodu gönderiliyor...',
    checkEmail: 'E-postanızı kontrol edin',
    verificationSent: 'Doğrulama kodu gönderildi:',
    verificationCode: 'Doğrulama Kodu',
    codeExpires: 'Kodun süresi doluyor:',
    verifyAndCreate: 'Doğrula ve Hesap Oluştur',
    verifying: 'Doğrulanıyor...',
    resendCode: 'Kodu Tekrar Gönder',
    resendIn: '{{seconds}} sn sonra tekrar gönder',
    codeSent: 'Doğrulama kodu gönderildi',
    checkEmailAt: '{{email}} adresindeki e-postanızı kontrol edin',
    codeResent: 'Kod tekrar gönderildi',
    newCodeSent: 'E-postanıza yeni bir doğrulama kodu gönderildi',
    failedToSend: 'Kod gönderilemedi',
    failedToResend: 'Kod tekrar gönderilemedi',
    verificationFailed: 'Doğrulama başarısız',
    invalidCode: 'Geçersiz doğrulama kodu',
  },
  landing: JSON.parse(
    fs.readFileSync(path.join(__dirname, 'tr-landing-patches.json'), 'utf8')
  ),
};

deepMerge(tr, patches);

fs.writeFileSync(trPath, JSON.stringify(tr, null, 2) + '\n', 'utf8');
console.log('Applied Turkish patches to tr.json');
