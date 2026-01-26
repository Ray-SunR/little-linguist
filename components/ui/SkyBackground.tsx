import React from 'react';

export default function SkyBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-gradient-to-b from-[#1E1B4B] via-[#4C1D95] to-[#7C3AED]">
      <div className="stars-layer absolute inset-0 opacity-50" />
      <div className="clouds-layer absolute inset-0 backdrop-blur-3xl" />
      <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay" />
    </div>
  );
}
