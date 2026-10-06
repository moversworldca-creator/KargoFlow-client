import React from 'react';

const buildEmbeddableUrl = () => {
  const base = 'https://apps.ringcentral.com/integration/ringcentral-embeddable/latest/app.html';
  return base;
};

export default function RingCentralEmbeddablePanel() {
  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="text-sm font-black text-heading">RingCentral</div>
        <div className="text-[0.625rem] font-black uppercase tracking-widest text-muted">
          Sign in inside panel
        </div>
      </div>
      <div className="h-[560px] w-full">
        <iframe
          title="RingCentral"
          id="rc-widget-adapter-frame"
          src={buildEmbeddableUrl()}
          className="w-full h-full"
          // RingCentral webphone uses `setSinkId()` for speaker device selection.
          // This requires the `speaker-selection` permissions policy.
          allow="autoplay; microphone; camera; speaker-selection"
        />
      </div>
    </div>
  );
}
