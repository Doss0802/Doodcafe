import { Volume2 } from 'lucide-react';

/**
 * Non-intrusive banner shown on the tracking page if browser audio autoplay is blocked.
 * Tapping unlocks audio for the order completion bell.
 */
export default function SoundBanner({ onEnable }) {
  return (
    <div className="order-sound-banner my-2.5 flex justify-center">
      <button
        type="button"
        onClick={onEnable}
        className="clay-btn clay-light text-xs font-bold px-3.5 py-1.5 flex items-center gap-1.5 shadow-sm text-stone-700 cursor-pointer"
        title="Tap to enable audio notification when your order is ready"
      >
        <Volume2 size={14} className="text-amber-600" />
        <span>Tap to enable order sound</span>
      </button>
    </div>
  );
}
