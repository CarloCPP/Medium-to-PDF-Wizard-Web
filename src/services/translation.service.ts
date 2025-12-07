import { Injectable, signal, computed } from '@angular/core';
import { en } from '../i18n/en';
import { zh } from '../i18n/zh';
import { ja } from '../i18n/ja';
import { zhTW } from '../i18n/zh-TW';

export type Language = 'en' | 'zh' | 'ja' | 'zh-TW';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private readonly LANG_KEY = 'app-language';

  private translations: Record<Language, any> = {
    en,
    zh,
    ja,
    'zh-TW': zhTW
  };

  language = signal<Language>(this.getInitialLanguage());

  private getInitialLanguage(): Language {
    if (typeof localStorage !== 'undefined') {
      const storedLang = localStorage.getItem(this.LANG_KEY);
      if (storedLang && ['en', 'zh', 'ja', 'zh-TW'].includes(storedLang)) {
        return storedLang as Language;
      }
    }
    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('zh-tw') || browserLang.startsWith('zh-hk')) {
        return 'zh-TW';
      }
      if (browserLang.startsWith('zh')) {
        return 'zh';
      }
      if (browserLang.startsWith('ja')) {
        return 'ja';
      }
    }
    return 'en';
  }

  setLanguage(lang: Language) {
    this.language.set(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.LANG_KEY, lang);
    }
  }
  
  // A computed signal that returns the translation function for the current language
  t = computed(() => {
    const currentLang = this.language();
    const translationTable = this.translations[currentLang];
    
    return (key: string, ...args: any[]): string => {
      let translation = translationTable[key] || key;
      if (args.length > 0) {
        args.forEach((arg, index) => {
          translation = translation.replace(`{${index}}`, arg);
        });
      }
      return translation;
    };
  });
}
