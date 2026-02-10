
export enum Language {
  ENGLISH = 'en',
  HINDI = 'hi',
  BENGALI = 'bn',
  TAMIL = 'ta',
  TELUGU = 'te',
  MARATHI = 'mr',
  URDU = 'ur',
  MALAYALAM = 'ml',
  KANNADA = 'kn',
  GUJARATI = 'gu'
}

export const LanguageNames: Record<Language, string> = {
  [Language.ENGLISH]: 'English',
  [Language.HINDI]: 'हिन्दी (Hindi)',
  [Language.BENGALI]: 'বাংলা (Bengali)',
  [Language.TAMIL]: 'தமிழ் (Tamil)',
  [Language.TELUGU]: 'తెలుగు (Telugu)',
  [Language.MARATHI]: 'मराठी (Marathi)',
  [Language.URDU]: 'اردو (Urdu)',
  [Language.MALAYALAM]: 'മലയാളം (Malayalam)',
  [Language.KANNADA]: 'ಕನ್ನಡ (Kannada)',
  [Language.GUJARATI]: 'ગુજરાતી (Gujarati)'
};

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isRedFlag?: boolean;
}

export type Gender = 'male' | 'female';

export interface ChatSession {
  messages: Message[];
  language: Language;
  doctorGender: Gender;
}
