import React from 'react';
import { motion } from 'framer-motion';
import BlackjackTrainer from './components/BlackjackTrainer';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2B4B6F80] via-[#46597380] to-[#34495E80] overflow-hidden relative">
      {[...Array(10)].map((_, index) => (
        <motion.div
          key={index}
          className="fixed bottom-0 left-0 right-0 z-[-1]"
          style={{
            width: '100%',
            height: '100vh',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <motion.div
            style={{
              width: `${300 - index * 20}px`,
              height: '100%',
              background: `linear-gradient(
                to top, 
                rgba(50,0,0,0.9), 
                rgba(255,100,0,0.8), 
                rgba(255,150,0,0.6), 
                rgba(0,100,255,0.4), 
                transparent
              )`,
              borderRadius: '50% 50% 50% 50% / 70% 70% 30% 30%',
              filter: 'blur(10px)',
              transformOrigin: 'bottom center'
            }}
            animate={{
              x: [
                0, 
                `-${10 + index * 2}px`, 
                `${10 + index * 2}px`, 
                0
              ],
              y: [
                0, 
                `-${20 + index * 5}px`, 
                0
              ],
              scaleX: [
                1, 
                1.1 + index * 0.05, 
                1
              ],
              scaleY: [
                1, 
                0.9 - index * 0.03, 
                1
              ],
              rotate: [
                0, 
                index * 2, 
                -index * 2,
                0
              ]
            }}
            transition={{
              duration: 4 + index,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut'
            }}
          />
        </motion.div>
      ))}
      <div className="container mx-auto relative z-10">
        <BlackjackTrainer />
      </div>
    </div>
  );
}

export default App;