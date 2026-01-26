import React from 'react';
import { motion } from 'framer-motion';

export default function SkyBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-gradient-to-b from-[#E8F5FF] via-[#F3ECFF] to-[#FAE8FF]">
      {/* Stars Layer */}
      <motion.div 
        className="stars-layer absolute inset-0 opacity-30"
        initial={{ opacity: 0.2 }}
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{
          backgroundImage: `radial-gradient(1.5px 1.5px at 25px 35px, #8B4BFF, rgba(139, 75, 255, 0)),
                            radial-gradient(1px 1px at 50px 10px, #FF69B4, rgba(255, 105, 180, 0)),
                            radial-gradient(2px 2px at 15px 70px, #8B4BFF, rgba(139, 75, 255, 0)),
                            radial-gradient(1px 1px at 85px 20px, #FF69B4, rgba(255, 105, 180, 0)),
                            radial-gradient(1.5px 1.5px at 120px 60px, #8B4BFF, rgba(139, 75, 255, 0))`,
          backgroundSize: '250px 250px',
        }}
      />

      {/* Clouds Layer */}
      <div className="clouds-layer absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-[800px] h-[500px] bg-white/80 rounded-full blur-[100px]"
          animate={{
            x: [-150, 150],
            y: [-30, 30],
          }}
          transition={{
            duration: 40,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
          style={{ top: '5%', left: '5%' }}
        />
        <motion.div
          className="absolute w-[700px] h-[400px] bg-white/60 rounded-full blur-[120px]"
          animate={{
            x: [150, -150],
            y: [30, -30],
          }}
          transition={{
            duration: 50,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
          style={{ bottom: '15%', right: '0%' }}
        />
      </div>

      {/* Noise Overlay */}
      <div className="absolute inset-0 bg-noise opacity-[0.02] mix-blend-soft-light" />
    </div>
  );
}
