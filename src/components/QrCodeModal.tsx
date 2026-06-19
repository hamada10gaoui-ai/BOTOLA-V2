import { useState, useEffect } from 'react';
import { X, Copy, ExternalLink, Check, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { Language } from '../translations';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  url: string;
  language?: Language;
}

export default function QrCodeModal({ isOpen, onClose, title, subtitle, url, language = 'ar' }: QrCodeModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  useEffect(() => {
    if (isOpen && url) {
      QRCode.toDataURL(url, {
        margin: 1,
        width: 300,
        color: {
          dark: '#0f172a', // deep slate
          light: '#ffffff'
        }
      })
        .then(dataUrl => setQrCodeUrl(dataUrl))
        .catch(err => {
          console.error('Error generating client QR Code:', err);
          // Fallback to QR server if something goes wrong
          setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`);
        });
    }
  }, [isOpen, url]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Translations dictionary for inside the modal
  const textCopy = isAr ? 'نسخ الرابط' : isFr ? 'Copier le lien' : 'Copy Link';
  const textCopied = isAr ? 'تم النسخ!' : isFr ? 'Copié !' : 'Copied!';
  const helperDesc = isAr 
    ? 'قم بتوجيه كاميرا هاتفك الذكي للباركود لمسحه فورياً والوصول للنتائج، أو قم بمحاكاة الفتح في نافذة جديدة.' 
    : isFr 
    ? "Pointez l'appareil photo de votre smartphone vers le code pour le scanner et accéder aux résultats en direct."
    : "Point your smartphone's camera at the barcode to scan it and access live results instantly.";
  
  const simulationButtonText = isAr 
    ? 'افتح كـمحاكاة مسح الكاميرا 📱' 
    : isFr 
    ? 'Ouvrir simulation du scan 📱' 
    : 'Open scan simulation 📱';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" 
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative space-y-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Absolute Close button */}
        <button 
          onClick={onClose}
          className={`absolute top-4 ${isAr ? 'left-4' : 'right-4'} text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition`}
          title={isAr ? 'إغلاق' : 'Close'}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 pt-2">
          <div className="h-10 w-10 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <QrCode className="h-5 w-5" />
          </div>
          <h3 className="text-base font-black font-display text-white">{title}</h3>
          <p className="text-[11px] text-slate-400">{subtitle}</p>
        </div>

        {/* QR Code Container with sleek glow */}
        <div className="bg-white p-4 rounded-2xl inline-block shadow-xl border border-slate-700/20 relative group overflow-hidden mx-auto">
          {qrCodeUrl ? (
            <img 
              src={qrCodeUrl} 
              alt="QR Code" 
              className="w-48 h-48 mx-auto"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center bg-slate-100 text-slate-400 font-mono text-xs">
              ...
            </div>
          )}
          {/* subtle scan-line laser effect */}
          <div className="absolute left-0 right-0 top-0 h-0.5 bg-red-500/80 shadow-md shadow-red-500/50 animate-bounce"></div>
        </div>

        {/* URL Sharing actions */}
        <div className="space-y-3 pt-1 text-xs">
          
          <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-850 flex items-center justify-between gap-2 text-right">
            <span className="text-[10px] text-slate-400 block truncate font-mono select-all ml-1 w-full" dir="ltr">
              {url}
            </span>
            <button
              onClick={handleCopy}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition shrink-0"
              title={textCopy}
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          <p className="text-[10px] text-slate-400 text-center leading-relaxed">
            {helperDesc}
          </p>

          <div className="grid grid-cols-1 gap-2 border-t border-slate-800/80 pt-3.5">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {simulationButtonText}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
