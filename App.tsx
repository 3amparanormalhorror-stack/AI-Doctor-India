import React, { useState, useEffect, useRef } from 'react';
import { LiveServerMessage, Modality } from '@google/genai';
import { Language, Message, Gender, LanguageNames } from './types';
import Avatar from './components/Avatar';
import { getHealthGuidance, findHospitals, getLiveAPI, getSpeech } from './services/geminiService';
import { Icons } from './constants';

// PCM Audio Helpers
const encode = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const decode = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showPaymentQR, setShowPaymentQR] = useState(false);
  const [userName, setUserName] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Namaste! I am your AI Doctor India. I'm here to provide health guidance and wellness tips. How can I help you today?",
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);
  const [doctorGender, setDoctorGender] = useState<Gender>('female');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [isSTTActive, setIsSTTActive] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setLoadProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => setIsLoading(false), 500);
          return 100;
        }
        return prev + Math.random() * 20;
      });
    }, 150);

    const safety = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(safety);
    };
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [inputValue]);

  useEffect(() => {
    if (isLoggedIn) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isSpeaking, attachedImage, isLoggedIn]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInputValue(prev => (prev ? prev + ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current.onend = () => {
        setIsSTTActive(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("STT Error:", event.error);
        setIsSTTActive(false);
      };
    }
  }, [language]);

  const toggleSTT = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isSTTActive) {
      recognitionRef.current.stop();
      setIsSTTActive(false);
    } else {
      recognitionRef.current.start();
      setIsSTTActive(true);
    }
  };

  const playResponseAudio = async (text: string) => {
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();

    const base64Audio = await getSpeech(text, doctorGender === 'male' ? 'Kore' : 'Kore');
    if (base64Audio) {
      try {
        const outputCtx = audioContextRef.current?.output || new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        if (!audioContextRef.current) audioContextRef.current = { input: new AudioContext(), output: outputCtx };
        
        const buffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
        const source = outputCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(outputCtx.destination);
        
        setIsSpeaking(true);
        source.start(0);
        source.onended = () => {
          setIsSpeaking(false);
          sourcesRef.current.delete(source);
        };
        sourcesRef.current.add(source);
      } catch (err) {
        console.error("Audio Playback Error:", err);
        setIsSpeaking(false);
      }
    }
  };

  const handleSend = async () => {
    if ((!inputValue.trim() && !attachedImage) || isSpeaking) return;
    
    if (isSTTActive) {
      recognitionRef.current?.stop();
      setIsSTTActive(false);
    }

    const userMsgContent = inputValue.trim() || "Analyzing health-related image...";
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMsgContent,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsSpeaking(true);

    try {
      const response = await getHealthGuidance(
        userMsgContent, 
        language, 
        messages, 
        isThinkingMode, 
        attachedImage ? { inlineData: attachedImage } : undefined
      );
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        timestamp: new Date(),
        isRedFlag: response.isRedFlag
      };

      setMessages(prev => [...prev, aiMessage]);
      setAttachedImage(null);
      
      await playResponseAudio(response.text);
    } catch (err) {
      console.error(err);
      setIsSpeaking(false);
    }
  };

  const stopLiveConversation = () => {
    setIsLiveActive(false);
    setIsSpeaking(false);
    liveSessionRef.current?.close();
    if (audioContextRef.current) {
      audioContextRef.current.input.close();
      audioContextRef.current.output.close();
      audioContextRef.current = null;
    }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const startLiveConversation = async () => {
    if (isLiveActive) {
      stopLiveConversation();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsLiveActive(true);
      const ai = getLiveAPI();
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = { input: inputCtx, output: outputCtx };
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              setIsSpeaking(true);
              const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              
              sourcesRef.current.add(source);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsSpeaking(false);
              };
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
            }
          },
          onerror: (e) => { console.error("Live Audio Error:", e); stopLiveConversation(); },
          onclose: () => { stopLiveConversation(); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: doctorGender === 'male' ? 'Kore' : 'Kore' } }
          },
          systemInstruction: `You are AI Doctor India. Voice conversation mode. Be warm, professional, and concise. Respond in ${language}. Follow all medical safety guidelines.`
        }
      });
      liveSessionRef.current = await sessionPromise;
    } catch (e) {
      console.error("Failed to start live session:", e);
      setIsLiveActive(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = (ev.target?.result as string).split(',')[1];
        setAttachedImage({ data: base64, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFindNearbyHospitals = async () => {
    setIsSidebarOpen(false);
    setIsLocating(true);
    setIsSpeaking(true);

    if (!navigator.geolocation) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I'm sorry, your browser doesn't support location services. Please check Google Maps manually.",
        timestamp: new Date(),
      }]);
      setIsLocating(false);
      setIsSpeaking(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { text, sources } = await findHospitals(pos.coords.latitude, pos.coords.longitude, language);
          let content = text;
          if (sources.length > 0) {
            content += "\n\n**Nearby Facilities:**\n" + sources.map(s => `• [${s.title}](${s.uri})`).join('\n');
          }
          const hospitalMsg = { id: Date.now().toString(), role: 'assistant', content, timestamp: new Date() };
          setMessages(prev => [...prev, hospitalMsg as Message]);
          await playResponseAudio(text);
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setIsSpeaking(false);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "I couldn't access your location. Please enable location permissions.", timestamp: new Date() }]);
      }
    );
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      setIsLoggedIn(true);
      setShowSubscription(true); // Trigger subscription popup
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: `Namaste, ${userName}! I am your AI Doctor India. Your medical link is established. How are you feeling today?`,
          timestamp: new Date(),
        }
      ]);
      playResponseAudio(`Namaste, ${userName}! I am your AI Doctor India. Your medical link is established. How are you feeling today?`);
    }
  };

  const closeSubscription = () => {
    setShowSubscription(false);
    setShowPaymentQR(false);
  };

  const handleSubscribeClick = () => {
    setShowPaymentQR(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 scale-125 pointer-events-none">
          <Avatar gender="female" isSpeaking={true} />
        </div>
        
        <div className="relative z-10 w-full max-w-lg space-y-12">
          <div className="text-center space-y-4">
             <div className="w-24 h-24 mx-auto rounded-3xl bg-rose-600 flex items-center justify-center text-white shadow-[0_0_50px_rgba(239,68,68,0.5)] animate-pulse">
                <div className="w-16 h-16 p-2"><Icons.DoctorMale /></div>
             </div>
             <h1 className="text-5xl font-black tracking-tighter bg-gradient-to-r from-rose-400 via-rose-600 to-rose-400 bg-clip-text text-transparent">AI Doctor India</h1>
             <p className="text-rose-400 font-black uppercase tracking-[0.5em] text-[10px]">Initializing Medical Core</p>
          </div>

          <div className="space-y-6">
             <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-rose-400 transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.8)]"
                  style={{ width: `${loadProgress}%` }}
                />
             </div>
             <div className="flex justify-between text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">
                <span className="animate-pulse">{loadProgress < 30 ? 'Synchronizing Neurons...' : loadProgress < 70 ? 'Calibrating Database...' : 'Finalizing secure link...'}</span>
                <span>{Math.round(loadProgress)}%</span>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden relative">
        <div className="absolute inset-0 flex items-center justify-center opacity-40 scale-150 pointer-events-none">
          <Avatar gender={doctorGender} isSpeaking={true} />
        </div>

        <div className="relative z-10 w-full max-w-md px-6 animate-in fade-in zoom-in duration-1000">
          <div className="glass rounded-[3rem] p-10 md:p-12 border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.6)] text-center space-y-10">
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center text-white shadow-2xl rotate-12">
                 <div className="w-14 h-14 p-2"><Icons.DoctorMale /></div>
              </div>
              <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-rose-400 via-rose-500 to-rose-300 bg-clip-text text-transparent tracking-tighter">AI Doctor</h1>
              <p className="text-rose-400/80 font-black uppercase tracking-[0.4em] text-xs">Healthcare Access Terminal</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Subject Identification</label>
                <input 
                  type="text" 
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full bg-slate-900/50 border border-slate-700 focus:border-rose-500 rounded-2xl px-6 py-5 text-lg font-bold outline-none transition-all placeholder:text-slate-600"
                  required
                />
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Preferred Language</label>
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="w-full bg-slate-900/50 border border-slate-700 focus:border-rose-500 rounded-2xl px-6 py-5 text-lg font-bold outline-none transition-all appearance-none cursor-pointer"
                >
                  {Object.entries(LanguageNames).map(([code, name]) => (<option key={code} value={code}>{name}</option>))}
                </select>
              </div>

              <button type="submit" className="w-full btn-vibrant py-6 rounded-3xl text-white font-black text-xl tracking-tighter flex items-center justify-center gap-3 group !from-rose-600 !to-rose-800">
                Establish Health Link
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white selection:bg-rose-500/30">
      
      {/* Subscription & Payment Overlay */}
      {showSubscription && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
          
          {showPaymentQR ? (
            /* PhonePe Style Payment View */
            <div className="relative w-full max-w-sm bg-black rounded-[2rem] p-8 border border-white/10 shadow-[0_0_100px_rgba(113,67,185,0.2)] animate-in zoom-in duration-300 text-center flex flex-col items-center">
              <div className="w-full flex justify-between items-start mb-6">
                <div className="flex items-center gap-2">
                   <div className="w-10 h-10 bg-[#5f259f] rounded-xl flex items-center justify-center text-white font-bold text-xl">पे</div>
                   <span className="text-white font-bold text-lg">PhonePe</span>
                </div>
                <button onClick={() => setShowPaymentQR(false)} className="text-slate-500 hover:text-white">✕</button>
              </div>

              <h3 className="text-[#a577f1] font-black text-xs uppercase tracking-[0.2em] mb-4">Accepted Here</h3>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-6">Scan & Pay Using PhonePe App</p>

              <div className="w-full aspect-square bg-white rounded-2xl p-4 shadow-2xl relative mb-4">
                {/* 
                   IMPORTANT: Replace this src with your actual QR code image path 
                   e.g. src="/path-to-your-qr.png" 
                */}
                <div className="w-full h-full border-4 border-black/5 flex flex-col items-center justify-center text-black font-black">
                  <img 
                    src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=dipayanroy@upi&pn=DIPAYAN%20ROY&cu=INR" 
                    alt="Payment QR"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-lg border-2 border-slate-100">
                    <div className="w-8 h-8 bg-[#5f259f] rounded flex items-center justify-center text-white text-[10px] font-bold">पे</div>
                  </div>
                </div>
              </div>

              <div className="space-y-1 mb-8">
                <h4 className="text-white font-black text-xl tracking-tight">DIPAYAN ROY</h4>
                <div className="flex items-center justify-center gap-1.5 text-emerald-500 font-bold text-[10px] uppercase tracking-widest">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full flex items-center justify-center text-[6px] text-black">✓</span>
                  Verified Merchant
                </div>
              </div>

              <div className="w-full pt-6 border-t border-white/5 space-y-4">
                <button 
                  onClick={closeSubscription}
                  className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all border border-white/10"
                >
                  I've Paid / Complete
                </button>
                <p className="text-[8px] text-slate-600 font-medium">© 2026 PhonePe Ltd (Formerly PhonePe Private Ltd)</p>
              </div>
            </div>
          ) : (
            /* Subscription Benefits View */
            <div className="relative glass w-full max-w-md rounded-[3rem] p-8 md:p-12 border border-rose-500/30 shadow-[0_0_100px_rgba(239,68,68,0.2)] animate-in zoom-in duration-500 text-center space-y-8">
              <div className="space-y-2">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-lg animate-bounce">
                  <span className="text-3xl">🚀</span>
                </div>
                <h2 className="text-3xl font-black tracking-tighter text-white">Pro Neural Link</h2>
                <p className="text-rose-400 font-bold uppercase tracking-widest text-[10px]">Upgrade your AI Experience</p>
              </div>

              <div className="bg-slate-900/50 rounded-3xl p-6 border border-white/5 space-y-4 text-left">
                {[
                  "Unlimited consultations 24/7",
                  "Advanced Deep Thinking Core",
                  "Full Multilingual Voice Engine",
                  "Instant Emergency Geo-Response"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-slate-300 font-bold">
                    <span className="text-rose-500 font-black">✓</span>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-4xl font-black text-white">₹5</span>
                  <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">/ Month</span>
                </div>
                <button 
                  onClick={handleSubscribeClick}
                  className="w-full py-5 rounded-3xl btn-vibrant text-white font-black text-lg tracking-tighter !from-rose-600 !to-rose-800 hover:scale-105 transition-all shadow-2xl"
                >
                  Subscribe Now
                </button>
                <button 
                  onClick={closeSubscription}
                  className="w-full py-3 text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-colors"
                >
                  Skip for now
                </button>
              </div>
              
              <p className="text-[9px] text-slate-600 font-medium leading-tight">
                AI Doctor India Pro provides enhanced neural processing speeds. 
                Secure payment via Matrix-Gateway.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="sticky top-0 z-50 flex flex-col shadow-2xl">
        <div className="bg-rose-600/90 backdrop-blur-md text-white text-[10px] md:text-xs py-2 px-4 text-center font-bold uppercase tracking-widest border-b border-rose-500/50">
          ⚠️ MEDICAL DISCLAIMER: Guidance only. Not for diagnosis.
        </div>
        <a href="tel:112" className="bg-red-700/90 backdrop-blur-md hover:bg-red-800 transition-colors py-3 px-4 flex items-center justify-center gap-3 text-white font-black text-sm md:text-base animate-pulse-slow">
          <div className="w-5 h-5 flex items-center justify-center"><Icons.Emergency /></div>
          <span>IN CASE OF EMERGENCY: CALL 112 NOW</span>
        </a>
      </div>

      <header className="glass mx-4 md:mx-auto max-w-5xl mt-6 rounded-[2rem] p-5 flex items-center justify-between z-40 shadow-2xl border-t border-l border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-700 flex items-center justify-center text-white shadow-2xl rotate-3">
             <div className="w-10 h-10 p-1"><Icons.DoctorMale /></div>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-rose-400 via-rose-500 to-rose-300 bg-clip-text text-transparent tracking-tighter leading-none">AI Doctor India</h1>
            <p className="text-[10px] uppercase font-black tracking-[0.3em] text-rose-400 mt-1 opacity-80">VIRTUAL CARE</p>
          </div>
        </div>

        <button onClick={() => setIsSidebarOpen(true)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-800 text-slate-200 hover:scale-110 active:scale-95 transition-all shadow-lg border border-slate-700">
          <span className="text-2xl">⚙️</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row p-4 gap-8 max-w-7xl mx-auto w-full relative">
        <section className="hidden lg:flex lg:w-[320px] flex-col items-center justify-center p-8 gap-8 sticky top-44 h-fit">
          <Avatar gender={doctorGender} isSpeaking={isSpeaking} className="scale-110" />
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-tighter mb-1 text-white">Dr. Sahayta</h2>
            <div className="flex items-center justify-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isSpeaking || isLocating || isLiveActive ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`}></span>
              <p className="text-xs font-black opacity-70 uppercase tracking-[0.2em] text-slate-400">
                {isLiveActive ? 'Voice active' : isSpeaking ? 'Speaking...' : 'Online'}
              </p>
            </div>
          </div>
          <div className="w-full space-y-4">
             <button onClick={startLiveConversation} className={`w-full py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-3 ${isLiveActive ? 'bg-amber-500 text-white shadow-lg' : 'bg-rose-600 text-white hover:bg-rose-700 shadow-xl'}`}>
                {isLiveActive ? '🔴 Stop Voice Session' : '🎙️ Start Voice Call'}
             </button>
          </div>
        </section>

        <section className="flex-1 flex flex-col glass rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl h-[calc(100vh-280px)] lg:h-[calc(100vh-200px)]">
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 bg-slate-900/20 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-6 duration-700`}>
                <div className={`max-w-[95%] md:max-w-[85%] p-6 md:p-8 rounded-[2.8rem] relative ${msg.role === 'user' ? 'bg-rose-600 rounded-tr-none' : msg.isRedFlag ? 'bg-rose-950/80 border-4 border-rose-500/80 text-rose-50 rounded-tl-none shadow-2xl' : 'chat-bubble-ai rounded-tl-none font-bold'}`}>
                  {msg.isRedFlag && (
                    <div className="flex items-center gap-2 mb-4 text-rose-300 font-black text-[13px] uppercase tracking-[0.25em] border-b-2 border-rose-800 pb-3">
                       <span className="w-3.5 h-3.5 bg-rose-600 rounded-full animate-ping"></span> HIGH PRIORITY EMERGENCY
                    </div>
                  )}
                  <p className={`text-[1.1rem] md:text-[1.25rem] leading-[1.65] font-bold whitespace-pre-wrap ${msg.role === 'user' ? 'text-white' : 'text-slate-100'}`}>
                    {msg.content.split(/(\[.*?\]\(.*?\))/g).map((part, i) => {
                      const match = part.match(/\[(.*?)\]\((.*?)\)/);
                      if (match) return <a key={i} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-rose-400 underline font-black decoration-4 underline-offset-4 hover:text-emerald-400 transition-all">{match[1]}</a>;
                      return part;
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 md:p-8 bg-slate-950/95 border-t border-slate-800 backdrop-blur-3xl">
            <div className="flex items-end gap-3 md:gap-4 max-w-5xl mx-auto relative group">
              <div className="flex flex-col gap-3">
                <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-slate-900 text-slate-400 hover:text-rose-400 transition-all flex items-center justify-center border border-slate-800 shadow-sm hover:border-rose-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </button>
              </div>
              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
              <textarea 
                ref={textareaRef}
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Describe symptoms..."
                className={`flex-1 bg-slate-900 border focus:border-rose-500 rounded-[2rem] px-8 py-4 md:py-5 text-[1rem] md:text-[1.2rem] font-bold shadow-2xl focus:outline-none transition-all resize-none max-h-40 text-white leading-relaxed placeholder:text-slate-500 border-slate-700`}
              />
              <button onClick={handleSend} disabled={(!inputValue.trim() && !attachedImage) || isSpeaking} className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all shadow-2xl bg-rose-600 text-white hover:scale-110 active:scale-95 disabled:bg-slate-900`}>
                <svg className="w-8 h-8 md:w-9 md:h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </div>
        </section>
      </main>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsSidebarOpen(false)} />
          <aside className="relative w-full max-w-md h-full bg-slate-900 p-8 md:p-10 animate-in slide-in-from-right duration-500 border-l border-white/10 flex flex-col">
            <div className="flex items-center justify-between mb-10">
              <button onClick={() => setIsSidebarOpen(false)} className="group flex items-center gap-3 py-2 px-4 rounded-xl bg-slate-800 text-rose-400 font-black text-sm uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-lg border border-rose-500/20">
                <span className="group-hover:-translate-x-1 transition-transform">←</span>
                Back
              </button>
              <h3 className="text-3xl font-black text-white tracking-tighter">Settings</h3>
              <div className="w-12 h-12 hidden md:block" /> {/* Spacer */}
            </div>

            <div className="space-y-10 flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">System Language</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-5 text-white font-bold focus:border-rose-500 outline-none transition-all">
                  {Object.entries(LanguageNames).map(([code, name]) => (<option key={code} value={code}>{name}</option>))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Emergency Resources</label>
                <button onClick={handleFindNearbyHospitals} className="w-full py-6 px-8 bg-rose-900/20 text-rose-300 rounded-[2rem] font-black border border-rose-500/30 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-between group">
                  <span>🏥 Locate Nearest Center</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>

              <div className="pt-10 border-t border-slate-800">
                <button onClick={() => { setIsLoggedIn(false); setUserName(''); setIsSidebarOpen(false); }} className="w-full py-5 text-rose-500 font-black uppercase tracking-[0.3em] border-2 border-dashed border-rose-800 rounded-2xl hover:bg-rose-950/30 transition-all">
                  🔒 Terminate Session
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default App;