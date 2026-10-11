import React, { useState, useRef } from 'react';
import { 
  Globe, 
  RefreshCw, 
  ExternalLink, 
  Monitor, 
  Tablet, 
  Smartphone, 
  ShieldCheck, 
  AlertTriangle,
  Search
} from 'lucide-react';
import { apiService } from '../services/api';

interface LiveWebsitePreviewProps {
  targetUrl: string;
  isOpen: boolean;
  onOpenPreview: () => void;
  onInspect: () => void;
  isInspecting: boolean;
}

type ViewportMode = 'desktop' | 'tablet' | 'mobile';
type EmbedMode = 'direct' | 'proxy';

export const LiveWebsitePreview: React.FC<LiveWebsitePreviewProps> = ({
  targetUrl,
  isOpen,
  onOpenPreview,
  onInspect,
  isInspecting,
}) => {
  const [embedMode, setEmbedMode] = useState<EmbedMode>('direct');
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop');
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [iframeLoaded, setIframeLoaded] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const cleanTargetUrl = targetUrl.trim();
  const isValidUrl = /^https?:\/\/.+/i.test(cleanTargetUrl);

  const handleReload = () => {
    setIframeLoaded(false);
    setReloadKey((prev) => prev + 1);
  };

  const previewSrc = embedMode === 'direct'
    ? cleanTargetUrl
    : apiService.getProxyPreviewUrl(cleanTargetUrl);

  const getViewportWidthClass = () => {
    switch (viewportMode) {
      case 'mobile':
        return 'max-w-[390px]';
      case 'tablet':
        return 'max-w-[768px]';
      case 'desktop':
      default:
        return 'w-full';
    }
  };

  if (!isOpen) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Live Website Embedded Preview
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                  Interactive Browser
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Renders the actual live website inside HealTest's interface for real-time visual inspection and testing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={!isValidUrl}
              onClick={onOpenPreview}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
                isValidUrl
                  ? 'bg-teal-600 hover:bg-teal-700 text-white active:scale-95'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700/50'
              }`}
            >
              <Globe className="h-4 w-4" />
              <span>Open Website Preview</span>
            </button>

            <button
              type="button"
              disabled={!isValidUrl || isInspecting}
              onClick={onInspect}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                isValidUrl && !isInspecting
                  ? 'bg-teal-50 dark:bg-slate-800 hover:bg-teal-100 dark:hover:bg-slate-700 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-500/30'
                  : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed'
              }`}
            >
              {isInspecting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Inspecting DOM...</span>
                </>
              ) : (
                <>
                  <Search className="h-3.5 w-3.5" />
                  <span>Inspect DOM</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
      {/* Browser Chrome Header */}
      <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Window controls & URL bar */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Window dots */}
            <div className="flex items-center gap-1.5 shrink-0 hidden sm:flex">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400 inline-block" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block" />
            </div>

            {/* Address Bar */}
            <div className="flex-1 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 min-w-0 text-xs font-mono">
              <span className="text-teal-600 dark:text-teal-400 mr-2 shrink-0 flex items-center gap-1 text-xs">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{cleanTargetUrl.startsWith('https://') ? 'SECURE' : 'HTTP'}</span>
              </span>
              <span className="text-slate-800 dark:text-slate-200 truncate flex-1 select-all" title={cleanTargetUrl}>
                {cleanTargetUrl}
              </span>
              <button
                type="button"
                onClick={handleReload}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition ml-2 shrink-0 cursor-pointer"
                title="Reload Live Preview"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${!iframeLoaded ? 'animate-spin text-teal-600 dark:text-teal-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Right: Controls (Embed Mode, Viewport, Open in Tab, Inspect) */}
          <div className="flex items-center flex-wrap gap-2 shrink-0">
            {/* Embed Mode Switcher */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 flex text-xs font-medium shadow-xs">
              <button
                type="button"
                onClick={() => { setEmbedMode('direct'); handleReload(); }}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  embedMode === 'direct'
                    ? 'bg-teal-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Direct iframe rendering (fastest for standard localhost)"
              >
                Direct Frame
              </button>
              <button
                type="button"
                onClick={() => { setEmbedMode('proxy'); handleReload(); }}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  embedMode === 'proxy'
                    ? 'bg-teal-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Reverse proxy mode: strips X-Frame-Options / CSP restrictions"
              >
                Safe Proxy Embed
              </button>
            </div>

            {/* Viewport switchers */}
            <div className="hidden md:flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 text-slate-500 dark:text-slate-400 shadow-xs">
              <button
                type="button"
                onClick={() => setViewportMode('desktop')}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  viewportMode === 'desktop' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'hover:text-slate-800'
                }`}
                title="Desktop View (100%)"
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('tablet')}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  viewportMode === 'tablet' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'hover:text-slate-800'
                }`}
                title="Tablet View (768px)"
              >
                <Tablet className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('mobile')}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  viewportMode === 'mobile' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'hover:text-slate-800'
                }`}
                title="Mobile View (390px)"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Inspect DOM button */}
            <button
              type="button"
              disabled={isInspecting}
              onClick={onInspect}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                !isInspecting
                  ? 'bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800/60'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed'
              }`}
            >
              {isInspecting ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Inspecting...</span>
                </>
              ) : (
                <>
                  <Search className="h-3 w-3" />
                  <span>Inspect DOM</span>
                </>
              )}
            </button>

            {/* Open in external tab */}
            <a
              href={cleanTargetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs transition shadow-xs cursor-pointer"
              title="Open target in a new browser tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Tab</span>
            </a>
          </div>
        </div>

        {/* Security / Framing Policy Context Ribbon */}
        <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            <span>Target Mode: <strong className="text-slate-700 dark:text-slate-300 font-mono">{embedMode === 'direct' ? 'Direct Iframe' : 'Backend Proxy'}</strong></span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span>Target URL: <strong className="text-slate-700 dark:text-slate-300 font-mono">{cleanTargetUrl}</strong></span>
          </div>

          <div className="text-slate-500 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
            <span>If direct framing is blocked by target headers (<code className="text-slate-600 dark:text-slate-400">X-Frame-Options</code>/CSP), switch to <strong>Safe Proxy Embed</strong>.</span>
          </div>
        </div>
      </div>

      {/* Embedded Iframe Container */}
      <div className="bg-slate-100 dark:bg-slate-950 p-2 sm:p-4 flex justify-center items-center min-h-[460px] relative transition-colors">
        {!iframeLoaded && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-xs">
            <div className="h-8 w-8 rounded-full border-2 border-teal-500/30 border-t-teal-600 animate-spin mb-3" />
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Loading Live Website Preview...</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">{cleanTargetUrl}</div>
          </div>
        )}

        <div className={`transition-all duration-300 shadow-md rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white ${getViewportWidthClass()}`}>
          <iframe
            key={reloadKey}
            ref={iframeRef}
            src={previewSrc}
            title="Target Website Live Preview"
            onLoad={() => setIframeLoaded(true)}
            className="w-full h-[540px] border-0 bg-white"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          />
        </div>
      </div>
    </div>
  );
};
