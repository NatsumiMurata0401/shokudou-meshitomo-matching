import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  partnerName: string;
  partnerAvatarUrl: string;
  onClose: () => void;
  onStartMessage: () => void;
};

const particles = Array.from({ length: 18 });

const colors = ["#FFD1DC", "#FFF9C4", "#FFFFFF", "#B2F2E5", "#F8BBD0"];

const icons = ["✨", "💖", "⭐️", "💛", "🌟"];

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } }
};

const messageVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { delay: 0.3, type: "spring" as const, stiffness: 80 } }
};

const buttonVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { delay: 1.2 } }
};

const MatchSuccessAnimation: React.FC<Props> = ({
  open,
  partnerName,
  partnerAvatarUrl,
  onClose,
  onStartMessage
}) => {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(onClose, 3500);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={overlayVariants}
          style={{ background: "rgba(179, 230, 182, 0.8)" }}
        >
          {/* パーティクル */}
          {particles.map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-2xl pointer-events-none"
              style={{
                left: "50%",
                top: "50%",
                color: colors[i % colors.length],
                zIndex: 60
              }}
              initial={{
                x: 0,
                y: 0,
                opacity: 1,
                scale: 1,
                rotate: 0
              }}
              animate={{
                x: Math.cos((i / particles.length) * 2 * Math.PI) * 180 + Math.random() * 40,
                y: Math.sin((i / particles.length) * 2 * Math.PI) * 180 + Math.random() * 40,
                opacity: 0,
                scale: 1.8,
                rotate: Math.random() * 360
              }}
              transition={{
                duration: 1.2 + Math.random() * 0.5,
                delay: 0.2 + Math.random() * 0.3
              }}
            >
              {icons[i % icons.length]}
            </motion.span>
          ))}

          {/* メインメッセージ */}
          <motion.div
            className="relative z-70 flex flex-col items-center"
            variants={messageVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="text-3xl md:text-4xl font-bold text-[#388E3C] mb-4 drop-shadow-lg">
              ✨ マッチング成立！ ✨
            </div>
            <img
              src={partnerAvatarUrl}
              alt={partnerName}
              className="w-20 h-20 rounded-full border-4 border-white shadow-lg mb-2"
            />
            <div className="text-lg font-semibold text-[#388E3C] mb-6">{partnerName}さんとマッチング！</div>
          </motion.div>

          {/* 遷移ボタン */}
          <motion.button
            className="absolute bottom-16 left-1/2 -translate-x-1/2 px-8 py-3 rounded-full font-bold text-white bg-[#66BB6A] shadow-lg text-lg"
            variants={buttonVariants}
            initial="hidden"
            animate="visible"
            onClick={onStartMessage}
          >
            メッセージを開始する
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MatchSuccessAnimation;