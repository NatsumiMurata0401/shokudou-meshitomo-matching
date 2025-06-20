import React from "react";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";

type Recruitment = {
  id: number;
  ownerName: string;
  title: string;
  datetime: string;
  location: string;
  joined: boolean;
  participants: string[];
  currentUserName?: string;
  unreadCount?: number;
  isHighlighted?: boolean;
  onJoin: (id: number) => void;
  onChat?: (id: number) => void;
  onDelete?: (id: number) => void;
  onCardClick?: (id: number) => void; // カードクリック時の処理を追加
};

type Props = {
  recruitments: Recruitment[];
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, type: "spring" as const, stiffness: 60 }
  })
};

// 参加者アバター表示コンポーネント
const ParticipantAvatars: React.FC<{ participants: string[]; maxDisplay: number }> = ({ 
  participants, 
  maxDisplay = 3 
}) => {
  const displayParticipants = participants.slice(0, maxDisplay);
  const remainingCount = participants.length - maxDisplay;

  return (
    <div className="flex items-center -space-x-1">
      {displayParticipants.map((participant, index) => (
        <div
          key={participant}
          className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-semibold"
          style={{
            backgroundColor: '#B2F2E5',
            color: '#2E8B57',
            zIndex: maxDisplay - index
          }}
          title={participant}
        >
          {participant.charAt(0).toUpperCase()}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-semibold"
          style={{
            backgroundColor: '#66BB6A',
            color: 'white'
          }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

const RecruitmentList: React.FC<Props> = ({ recruitments }) => {
  // デバッグ用ログ
  console.log("RecruitmentList received:", recruitments.map(r => ({
    id: r.id,
    title: r.title,
    datetime: r.datetime,
    location: r.location
  })));
  
  return (
    <div className="space-y-6">
      {recruitments.map((r, i) => {
        // 投稿者は自動的に参加済みとみなす
        const isParticipant = r.joined || r.currentUserName === r.ownerName;
        
        // デバッグ用ログ
        console.log(`Recruitment ${r.id}: unreadCount=${r.unreadCount}, isParticipant=${isParticipant}`);

        return (
          <motion.div
            key={r.id}
            id={`meetup-card-${r.id}`}
            className={`rounded-2xl shadow-md p-5 relative cursor-pointer transition-all duration-500 ${
                r.isHighlighted 
                ? 'ring-4 ring-yellow-300 shadow-2xl' 
                : 'hover:shadow-lg'
            }`}
            style={{
                border: r.isHighlighted 
                ? "3px solid #FFD700" 
                : "1px solid #D9F5E6",
                backgroundColor: r.isHighlighted 
                ? "#FFFACD" 
                : "#F8FFF8",
                transform: r.isHighlighted ? 'scale(1.02)' : 'scale(1)' // ハイライト時の拡大
            }}
            custom={i}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={cardVariants}
            onClick={() => r.onCardClick && r.onCardClick(r.id)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {r.isHighlighted && (
                <motion.div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                    background: 'linear-gradient(45deg, transparent 30%, rgba(255, 215, 0, 0.1) 50%, transparent 70%)',
                    pointerEvents: 'none'
                    }}
                    animate={{
                    backgroundPosition: ['0% 0%', '100% 100%'],
                    }}
                    transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: 'reverse'
                    }}
                />
            )}
            {/* 未読バッジ（右上、チャットボタンの代わり） */}
            {r.unreadCount && r.unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-3 right-12 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: '#FF5722',
                  color: 'white',
                  border: '2px solid white',
                  minWidth: '32px'
                }}
              >
                {r.unreadCount > 99 ? '99+' : r.unreadCount}
              </motion.div>
            )}

            {/* 削除ボタン（右上） */}
            {r.currentUserName === r.ownerName && r.onDelete && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                className="absolute top-3 right-3 p-2 rounded-full transition-all duration-200 shadow-sm z-10"
                style={{
                  backgroundColor: '#FFE5E5',
                  color: '#D32F2F',
                  border: '1px solid #FFCDD2'
                }}
                onClick={(e) => {
                  e.stopPropagation(); // カードクリックイベントの伝播を停止
                  r.onDelete!(r.id);
                }}
                title="募集を削除"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            )}

            {/* メインコンテンツエリア */}
            <div className="mb-4">
              <div className="font-bold text-xl mb-2" style={{ color: "#2E8B57" }}>
                {r.title}
                {r.isHighlighted && (
                    <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="ml-2 text-sm px-2 py-1 rounded-full"
                    style={{
                        backgroundColor: '#FFD700',
                        color: '#B8860B'
                    }}
                    >
                    📍 この募集
                    </motion.span>
                )}
                {/* 未読数をタイトル横にも表示 */}
                {r.unreadCount && r.unreadCount > 0 && (
                  <span 
                    className="ml-2 text-xs px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: '#FF5722',
                      color: 'white'
                    }}
                  >
                    {r.unreadCount > 99 ? '99+' : r.unreadCount} 件の未読
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                <span>📅 {r.datetime}</span>
                <span>📍 {r.location}</span>
              </div>
            </div>

            {/* 下部エリア：投稿者（左下）と参加者（その隣）とアクションボタン（右下） */}
            <div className="flex justify-between items-end">
              {/* 左側：投稿者と参加者 */}
              <div className="flex items-center gap-4">
                {/* 投稿者表示（左下） */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-semibold"
                    style={{
                      backgroundColor: '#E6F7ED',
                      borderColor: '#B2F2E5',
                      color: '#2E8B57'
                    }}
                  >
                    {r.ownerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">投稿者</div>
                    <div className="text-sm font-semibold" style={{ color: '#2E8B57' }}>
                      {r.ownerName}
                    </div>
                  </div>
                </div>

                {/* 参加者表示（投稿者の隣） */}
                {r.participants && r.participants.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="text-xs text-gray-500">参加者 ({r.participants.length}名)</div>
                      <div className="mt-1">
                        <ParticipantAvatars participants={r.participants} maxDisplay={4} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 右側：参加ボタンのみ */}
              <div className="flex items-center gap-2">
                {/* 参加ボタン（投稿者の場合は常に参加済み表示） */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ 
                    boxShadow: isParticipant ? "none" : "0 4px 16px rgba(178, 242, 229, 0.5)" 
                  }}
                  className="px-6 py-2 rounded-full font-bold text-white transition-all duration-200 shadow-md z-10"
                  style={{
                    backgroundColor: isParticipant ? "#A5D6A7" : "#66BB6A",
                    cursor: isParticipant ? "default" : "pointer",
                    minWidth: "100px"
                  }}
                  disabled={isParticipant}
                  onClick={(e) => {
                    e.stopPropagation(); // カードクリックイベントの伝播を停止
                    if (!isParticipant) {
                      r.onJoin(r.id);
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (!isParticipant) {
                      (e.target as HTMLElement).style.backgroundColor = "#57a05a";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isParticipant) {
                      (e.target as HTMLElement).style.backgroundColor = "#66BB6A";
                    }
                  }}
                >
                  {isParticipant ? "✓ 参加済み" : "参加する！"}
                </motion.button>
              </div>
            </div>

            {/* クリックでチャットに移動することを示すヒント */}
            {isParticipant && (
              <div className="absolute bottom-2 left-5 text-xs text-gray-400">
                💬 カードをクリックしてチャットを開く
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default RecruitmentList;