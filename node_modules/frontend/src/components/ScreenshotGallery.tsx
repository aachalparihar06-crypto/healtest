import React, { useState } from 'react';
import { Camera, Maximize2, X, Image as ImageIcon } from 'lucide-react';
import type { TestStep } from '../types';

interface ScreenshotGalleryProps {
  screenshots: string[];
  steps: TestStep[];
}

export const ScreenshotGallery: React.FC<ScreenshotGalleryProps> = ({ screenshots, steps }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Combine run screenshots with step screenshots
  const allImages: { url: string; label: string; stepId?: string }[] = [];

  steps.forEach((s) => {
    if (s.screenshotBeforeUrl) {
      allImages.push({
        url: s.screenshotBeforeUrl,
        label: `Step #${s.order}: Before (${s.type})`,
        stepId: s.id,
      });
    }
    if (s.screenshotAfterUrl) {
      allImages.push({
        url: s.screenshotAfterUrl,
        label: `Step #${s.order}: After (${s.status.toUpperCase()})`,
        stepId: s.id,
      });
    }
  });

  // If no step screenshots, fallback to run screenshots
  if (allImages.length === 0 && screenshots.length > 0) {
    screenshots.forEach((url, idx) => {
      allImages.push({
        url,
        label: `Capture #${idx + 1}`,
      });
    });
  }

  if (allImages.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs text-center transition-colors">
        <Camera className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Captured Screenshots</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Visual page state snapshots will appear here as the Playwright engine steps through the target page.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs transition-colors">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Visual State & DOM Snapshots</h3>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
            {allImages.length} captured
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Click any thumbnail for full resolution inspection</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {allImages.map((img, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedImage(img.url)}
            className="group relative bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden cursor-pointer hover:border-teal-500 transition-all shadow-xs"
          >
            <div className="aspect-video w-full bg-slate-100 dark:bg-slate-900 overflow-hidden relative">
              <img
                src={img.url}
                alt={img.label}
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-md font-medium">
                  <Maximize2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                  Inspect Image
                </span>
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-xs">
              <span className="text-slate-800 dark:text-slate-300 font-medium truncate flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                {img.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 dark:bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-5xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Playwright Visual Capture Preview</span>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-950 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={selectedImage}
                alt="Enlarged snapshot"
                className="max-h-[70vh] w-auto object-contain rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
