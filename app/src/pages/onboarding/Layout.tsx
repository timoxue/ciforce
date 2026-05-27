import { Outlet } from 'react-router-dom';
import { motion } from 'motion/react';

export default function OnboardingLayout() {
  return (
    <div className="relative min-h-screen w-full bg-bg-dark overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_70%)] pointer-events-none" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="relative z-10 w-full h-full"
      >
        <Outlet />
      </motion.div>
    </div>
  );
}
