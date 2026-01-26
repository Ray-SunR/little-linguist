import React from 'react';
import { motion } from 'framer-motion';

export default function SkyBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-gradient-to-b from-[#1E1B4B] via-[#4C1D95] to-[#7C3AED]">
      {/* Stars Layer */}
      <motion.div 
        className="stars-layer absolute inset-0 opacity-40"
        initial={{ opacity: 0.2 }}
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          backgroundImage: `radial-gradient(1px 1px at 25px 35px, white, rgba(255, 255, 255, 0)),
                            radial-gradient(1px 1px at 50px 10px, white, rgba(255, 255, 255, 0)),
                            radial-gradient(1.5px 1.5px at 15px 70px, white, rgba(255, 255, 255, 0)),
                            radial-gradient(1px 1px at 85px 20px, white, rgba(255, 255, 255, 0)),
                            radial-gradient(1px 1px at 120px 60px, white, rgba(255, 255, 255, 0))`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* Clouds Layer */}
      <div className="clouds-layer absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-[600px] h-[400px] bg-white/10 rounded-full blur-3xl"
          animate={{
            x: [-100, 100],
            y: [-50, 50],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "linear",
          }}
          style={{ top: '10%', left: '10%' }}
        />
        <motion.div
          className="absolute w-[500px] h-[300px] bg-purple-300/10 rounded-full blur-3xl"
          animate={{
            x: [100, -100],
            y: [50, -50],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "linear",
          }}
          style={{ bottom: '20%', right: '5%' }}
        />
      </div>

      {/* Noise Overlay */}
      <div className="absolute inset-0 bg-noise opacity-[0.05] mix-blend-overlay" />
    </div>
  );
}
