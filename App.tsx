
import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { soundManager } from './services/SoundManager';
import { StorageService } from './services/StorageService';
import { SHOP_ITEMS, DIARY_ENTRIES } from './constants';
import { SaveData, UpgradeOption, GameStats, ShopItem } from './types';
import { Book, Skull, ShoppingCart, Zap, Trophy, Play, Settings, X, Coins, Heart, Gamepad2, Wind, Rocket, Sun, Crosshair, Bomb, Flame, CheckCircle, Magnet, Save } from 'lucide-react';

const Button = ({ onClick, children, className = '', disabled = false, style = {} }: any) => (
  <button 
    onClick={onClick} disabled={disabled}
    className={`px-6 py-3 rounded-lg font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    style={style}
  >
    {children}
  </button>
);

const Modal = ({ title, children, onClose }: any) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
    <div className="bg-gray-800 border border-gray-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
      <div className="p-4 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold text-yellow-400">{title}</h2>
        {onClose && <button onClick={onClose}><X className="text-gray-400 hover:text-white" /></button>}
      </div>
      <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
        {children}
      </div>
    </div>
  </div>
);

// Icon mapping helper
const getUpgradeIcon = (iconId: string) => {
  switch(iconId) {
    case 'HEART': return <Heart className="text-red-500" size={32} />;
    case 'WIND': return <Wind className="text-blue-300" size={32} />;
    case 'ROCKET': return <Rocket className="text-orange-400" size={32} />;
    case 'SUN': return <Sun className="text-yellow-400" size={32} />;
    case 'ZAP': return <Zap className="text-yellow-200" size={32} />;
    case 'CROSSHAIR': return <Crosshair className="text-red-400" size={32} />;
    case 'BOMB': return <Bomb className="text-gray-400" size={32} />;
    case 'FLAME': return <Flame className="text-orange-500" size={32} />;
    case 'MAGNET': return <Magnet className="text-indigo-400" size={32} />;
    default: return <Zap className="text-white" size={32} />;
  }
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY'>('MENU');
  
  // Slot State
  const [currentSlot, setCurrentSlot] = useState(0);
  const [saveData, setSaveData] = useState<SaveData>(StorageService.loadSlot(0));
  const [slotsInfo, setSlotsInfo] = useState<(SaveData | null)[]>([]);

  const [stats, setStats] = useState<GameStats>({ hp: 5, maxHp: 5, xp: 0, level: 1, score: 0, time: 0, coins: 0, diaryPages: 0 } as any);
  const [upgradeOptions, setUpgradeOptions] = useState<UpgradeOption[]>([]);
  const [activeModal, setActiveModal] = useState<'SHOP' | 'DIARY' | 'TUTORIAL' | 'SLOTS' | 'NONE'>('NONE');
  const [nukeFlash, setNukeFlash] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isJoystickEnabled, setIsJoystickEnabled] = useState(true);
  
  // Center large notifications
  const [centerNotification, setCenterNotification] = useState<string | null>(null);

  // Shop randomization
  const [currentShopItems, setCurrentShopItems] = useState<ShopItem[]>([]);
  
  // Victory Animation State
  const [victoryBonus, setVictoryBonus] = useState(0);
  const [displayedCoins, setDisplayedCoins] = useState(0);

  // Cheat code
  const moneyClickRef = useRef(0);
  
  // Upgrade Keyboard Selection State
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Menu Keyboard Selection State
  const [menuSelection, setMenuSelection] = useState(0); // 0: Classic, 1: Challenge, 2: Shop, 3: Diary, 4: Slots
  
  // Diary Content State
  const [selectedDiaryContent, setSelectedDiaryContent] = useState('');

  // Shuffle shop items on mount or return to menu
  const refreshShopItems = () => {
      const shuffled = [...SHOP_ITEMS].sort(() => 0.5 - Math.random());
      setCurrentShopItems(shuffled.slice(0, 6));
  };

  useEffect(() => {
    soundManager.init();
    refreshShopItems(); // Initial shuffle
    
    // Initial load of slots info
    setSlotsInfo(StorageService.getSlotsInfo());

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);
      if (engineRef.current) engineRef.current.cleanup();
    };
  }, []);
  
  // Victory Coin Counting Animation
  useEffect(() => {
    if (gameState === 'VICTORY') {
        let start = 0;
        const total = victoryBonus;
        const duration = 2000;
        const startTime = performance.now();
        
        const animate = (time: number) => {
            const elapsed = time - startTime;
            const progress = Math.min(1, elapsed / duration);
            const current = Math.floor(progress * total);
            setDisplayedCoins(current);
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }
  }, [gameState, victoryBonus]);
  
  // Upgrade keyboard navigation
  useEffect(() => {
      if (upgradeOptions.length > 0) {
          setSelectedIndex(0);
      }
  }, [upgradeOptions]);
  
  useEffect(() => {
      if (upgradeOptions.length > 0) {
          const handleKey = (e: KeyboardEvent) => {
              if (e.key === 'Enter') {
                  handleUpgradeSelect(upgradeOptions[selectedIndex]);
              } else if (e.key === 'ArrowDown') {
                  setSelectedIndex(prev => (prev + 1) % upgradeOptions.length);
              } else if (e.key === 'ArrowUp') {
                  setSelectedIndex(prev => (prev - 1 + upgradeOptions.length) % upgradeOptions.length);
              }
          }
          window.addEventListener('keydown', handleKey);
          return () => window.removeEventListener('keydown', handleKey);
      }
  }, [upgradeOptions, selectedIndex]);

  // Global Key Handler for Menu/Tutorial
  useEffect(() => {
      const handleGlobalKey = (e: KeyboardEvent) => {
          if (activeModal === 'TUTORIAL' && e.key === 'Enter') {
              setActiveModal('NONE');
              initGame('CLASSIC');
          }
      };
      window.addEventListener('keydown', handleGlobalKey);
      return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [activeModal]);

  // Game Over / Victory Key Handler
  useEffect(() => {
      if (gameState === 'GAMEOVER' || gameState === 'VICTORY') {
          const handleKey = (e: KeyboardEvent) => {
              if (e.key === 'Enter') {
                  handleReturnToMenu();
              }
          };
          window.addEventListener('keydown', handleKey);
          return () => window.removeEventListener('keydown', handleKey);
      }
  }, [gameState]);

  // Menu keyboard navigation
  useEffect(() => {
      if (gameState === 'MENU' && activeModal === 'NONE') {
          const handleKey = (e: KeyboardEvent) => {
              if (e.key === 'ArrowDown') {
                  setMenuSelection(prev => (prev + 1) % 5);
              } else if (e.key === 'ArrowUp') {
                  setMenuSelection(prev => (prev - 1 + 5) % 5);
              } else if (e.key === 'Enter') {
                  if (menuSelection === 0) handleStartClassic();
                  else if (menuSelection === 1) handleStartChallenge();
                  else if (menuSelection === 2) setActiveModal('SHOP');
                  else if (menuSelection === 3) setActiveModal('DIARY');
                  else if (menuSelection === 4) openSlotModal();
              }
          };
          window.addEventListener('keydown', handleKey);
          return () => window.removeEventListener('keydown', handleKey);
      }
  }, [gameState, activeModal, menuSelection]);

  const initGame = (mode: 'CLASSIC' | 'CHALLENGE') => {
    if (!canvasRef.current) return;
    
    if (engineRef.current) {
        engineRef.current.cleanup();
        engineRef.current = null;
    }
    
    const engine = new GameEngine(
      canvasRef.current,
      {
        onGameOver: (win) => {
          setGameState('GAMEOVER');
          const newMoney = saveData.money + engine.coins;
          const newData = { ...saveData, money: newMoney };
          setSaveData(newData);
          StorageService.saveSlot(currentSlot, newData);
        },
        onVictory: (bonus) => {
             setVictoryBonus(bonus);
             setGameState('VICTORY');
             soundManager.playVictory();
             const newMoney = saveData.money + engine.coins + bonus;
             const newData = { ...saveData, money: newMoney };
             setSaveData(newData);
             StorageService.saveSlot(currentSlot, newData);
        },
        onLevelUp: (options) => {
          setUpgradeOptions(options);
        },
        onUpdateUI: (newStats) => setStats(s => ({ ...s, ...newStats })),
        onLog: (msg) => {
             if (msg.includes("核武")) setNukeFlash(true);
             setLogs(p => [...p.slice(-4), msg]);
             setTimeout(() => setLogs(p => p.slice(1)), 3000);
        },
        onCenterNotification: (msg) => setCenterNotification(msg),
        onSave: (data: SaveData) => {
            setSaveData(data);
            StorageService.saveSlot(currentSlot, data);
        }
      },
      saveData
    );
    
    engineRef.current = engine;
    engine.start(mode);
    setGameState('PLAYING');
  };

  const handleStartClassic = () => {
    setActiveModal('TUTORIAL');
  };

  const handleStartChallenge = () => {
    initGame('CHALLENGE');
  };
  
  const handleReturnToMenu = () => {
      if (engineRef.current) {
          engineRef.current.cleanup();
          engineRef.current = null;
      }
      refreshShopItems(); // Shuffle items when returning to menu
      setGameState('MENU');
      setMenuSelection(0);
      setSlotsInfo(StorageService.getSlotsInfo()); // Update slots display
  };

  const handleUpgradeSelect = (opt: UpgradeOption) => {
    engineRef.current?.applyUpgrade(opt.id);
    setUpgradeOptions([]); 
  };

  const toggleJoystick = () => {
      if (engineRef.current) {
          const newState = engineRef.current.toggleJoystick();
          setIsJoystickEnabled(newState);
      }
  };

  const handleMoneyClick = () => {
    moneyClickRef.current++;
    if (moneyClickRef.current >= 20) {
       const newData = { ...saveData, money: saveData.money + 9999 };
       setSaveData(newData);
       StorageService.saveSlot(currentSlot, newData);
       moneyClickRef.current = 0;
       soundManager.playCoin();
    }
  };

  const buyItem = (itemId: string, cost: number, currentLevel: number) => {
      if (saveData.money >= cost) {
           const newData = { 
               ...saveData, 
               money: saveData.money - cost,
               upgrades: { ...saveData.upgrades, [itemId]: currentLevel + 1 }
           };
           setSaveData(newData);
           StorageService.saveSlot(currentSlot, newData);
      }
  };
  
  const openSlotModal = () => {
      setSlotsInfo(StorageService.getSlotsInfo());
      setActiveModal('SLOTS');
  };
  
  const loadSlot = (index: number) => {
      const data = StorageService.loadSlot(index);
      setSaveData(data);
      setCurrentSlot(index);
      setActiveModal('NONE');
      // Visual feedback or sound could go here
      soundManager.playShoot();
  };

  const formatDate = (ts?: number) => {
      if (!ts) return '無紀錄';
      return new Date(ts).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden font-sans select-none">
      <canvas ref={canvasRef} className="block w-full h-full touch-none" />
      
      {/* Nuke Flash FX */}
      {nukeFlash && <div className="absolute inset-0 bg-white z-40 pointer-events-none nuke-flash" onAnimationEnd={() => setNukeFlash(false)} />}
      
      {/* Low HP Warning */}
      {gameState === 'PLAYING' && stats.hp <= 1 && (
         <div className="absolute inset-0 border-[6px] border-red-600/50 animate-pulse pointer-events-none z-30 shadow-[inset_0_0_100px_rgba(220,38,38,0.5)]" />
      )}
      
      {/* Center Large Notification */}
      {centerNotification && (
          <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
              <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-red-600 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] animate-pulse scale-150">
                  {centerNotification}
              </h1>
          </div>
      )}

      {/* Main Menu */}
      {gameState === 'MENU' && activeModal === 'NONE' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20 backdrop-blur-sm">
          <div className="bg-gray-800/90 p-8 rounded-2xl border border-gray-600 shadow-2xl max-w-md w-full text-center space-y-6">
            <div>
              <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
                星際倖存者
              </h1>
              <p className="text-gray-400 text-sm">抵禦外星生物的無盡浪潮</p>
            </div>
            
            <div 
              onClick={handleMoneyClick}
              className="bg-gray-900 rounded-xl p-4 flex justify-between items-center border border-gray-700 cursor-default"
            >
              <div className="flex items-center gap-2 text-gray-400">
                <Coins size={20} className="text-yellow-500" />
                <span>持有資金</span>
              </div>
              <span className="text-2xl font-mono text-yellow-400 font-bold">{saveData.money}</span>
            </div>
            
            <div className="flex justify-between items-center px-2 text-xs text-gray-500">
                <span>目前存檔: <span className="text-blue-400 font-bold">槽位 {currentSlot + 1}</span></span>
                <span>{formatDate(saveData.lastSaved)}</span>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleStartClassic} 
                className={`w-full flex items-center justify-center gap-2 ${menuSelection === 0 ? 'ring-2 ring-blue-400 scale-105 bg-blue-700' : 'bg-blue-600 hover:bg-blue-500'} text-white`}
              >
                <Play size={20} /> 經典模式
              </Button>
              <Button 
                onClick={handleStartChallenge} 
                className={`w-full flex items-center justify-center gap-2 ${menuSelection === 1 ? 'ring-2 ring-red-400 scale-105 bg-red-700' : 'bg-red-600 hover:bg-red-500'} text-white`}
              >
                <Trophy size={20} /> 虛空挑戰
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                    onClick={() => setActiveModal('SHOP')} 
                    className={`${menuSelection === 2 ? 'ring-2 ring-green-400 scale-105 bg-green-800' : 'bg-green-700 hover:bg-green-600'} text-white`}
                >
                  <ShoppingCart size={18} className="mx-auto mb-1" /> 軍火庫
                </Button>
                <Button 
                    onClick={() => setActiveModal('DIARY')} 
                    className={`${menuSelection === 3 ? 'ring-2 ring-yellow-400 scale-105 bg-yellow-700' : 'bg-yellow-600 hover:bg-yellow-500'} text-white`}
                >
                  <Book size={18} className="mx-auto mb-1" /> 艦長日記
                </Button>
              </div>
              <Button 
                  onClick={openSlotModal}
                  className={`w-full flex items-center justify-center gap-2 ${menuSelection === 4 ? 'ring-2 ring-gray-400 scale-105 bg-gray-600' : 'bg-gray-700 hover:bg-gray-600'} text-white text-sm py-2`}
              >
                  <Save size={16} /> 檔案管理
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* HUD */}
      {gameState === 'PLAYING' && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent h-24">
             <div className="flex flex-col gap-1">
               <div className="flex items-center gap-2">
                 {stats.maxHp > 6 ? (
                    <div className="flex items-center bg-gray-900/80 px-3 py-1 rounded-full border border-gray-700 gap-2">
                        <Heart size={20} className="text-red-500 fill-red-500" />
                        <span className="text-white font-bold">{Math.floor(stats.hp)} / {stats.maxHp}</span>
                    </div>
                 ) : (
                    <div className="flex gap-1">
                        {Array.from({ length: stats.maxHp }).map((_, i) => (
                            <Heart key={i} size={24} className={i < stats.hp ? "text-red-500 fill-red-500" : "text-gray-600"} />
                        ))}
                    </div>
                 )}
                 <span className="text-sm font-bold bg-gray-800 px-2 py-0.5 rounded text-blue-300">LV {stats.level}</span>
               </div>
               <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden border border-gray-600 mt-1">
                 <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300" style={{ width: `${(stats.xp / stats.xpNext) * 100}%` }} />
               </div>
             </div>

             <div className="flex gap-4 md:gap-6 text-xl font-bold font-mono items-center">
               <div className="flex items-center gap-2 text-yellow-400"><Coins size={20} /> {stats.coins}</div>
               <div className="flex items-center gap-2 text-gray-300"><Skull size={20} /> {stats.score}</div>
               <div className="flex items-center gap-2 text-white min-w-[60px]">
                 {Math.floor(stats.time / 60).toString().padStart(2, '0')}:{Math.floor(stats.time % 60).toString().padStart(2, '0')}
               </div>
               <button onClick={toggleJoystick} className="pointer-events-auto bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm flex items-center gap-1 transition">
                  <Gamepad2 size={16} /> {isJoystickEnabled ? '開啟' : '關閉'}
               </button>
             </div>
          </div>

          <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center w-full">
            {logs.map((log, i) => (
                <div key={i} className="bg-yellow-500/90 text-black font-bold px-4 py-1 rounded-full shadow-lg animate-bounce">
                    {log}
                </div>
            ))}
          </div>
        </div>
      )}

      {/* Level Up Modal */}
      {upgradeOptions.length > 0 && (
        <Modal title="偵測到能量信號">
          <p className="text-gray-400 mb-4 text-center">請選擇強化模組：<br/><span className="text-xs text-blue-300">(可使用鍵盤方向鍵選擇)</span></p>
          <div className="space-y-3">
            {upgradeOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleUpgradeSelect(opt)}
                className={`w-full p-4 rounded-lg flex items-center gap-4 transition-all group border ${i === selectedIndex ? 'bg-blue-800 border-yellow-400 scale-105 shadow-xl ring-2 ring-yellow-400/50' : 'bg-blue-900/50 hover:bg-blue-800 border-blue-500/30'}`}
              >
                <div className="bg-black/40 p-3 rounded-lg group-hover:bg-black/60 transition-colors">
                  {getUpgradeIcon(opt.icon)}
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-bold text-lg text-blue-200">{opt.text}</span>
                  {opt.description && <span className="text-xs text-blue-400">{opt.description}</span>}
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* Tutorial Modal */}
      {activeModal === 'TUTORIAL' && (
         <Modal title="🚀 任務簡報：經典模式">
            <div className="text-left text-lg space-y-4 mb-8 text-gray-300">
                <p><strong>移動操作：</strong> 觸控螢幕 <span className="text-yellow-400">任意位置</span> 即可呼叫搖桿移動，或使用鍵盤 <span className="text-yellow-400">W A S D</span>。</p>
                <p><strong>自動火力：</strong> 您的戰機配備自動鎖定系統，將自動攻擊範圍內的威脅。擊敗敵人並收集掉落的能量寶石來升級！</p>
                <p><strong>緊急閃避：</strong> <span className="text-yellow-400">雙指同時點擊</span> 螢幕，或按下鍵盤 <span className="text-yellow-400">空白鍵</span> 進行衝刺。</p>
            </div>
            <Button onClick={() => { setActiveModal('NONE'); initGame('CLASSIC'); }} className="w-full bg-blue-600 hover:bg-blue-700">
                準備好了，開始戰鬥！ (Enter)
            </Button>
         </Modal>
      )}

      {/* Save Slots Modal */}
      {activeModal === 'SLOTS' && (
        <Modal title="檔案管理" onClose={() => setActiveModal('NONE')}>
           <div className="space-y-4">
             {slotsInfo.map((info, i) => (
                <div key={i} className={`p-4 rounded-lg border flex justify-between items-center transition-all ${currentSlot === i ? 'bg-blue-900/40 border-blue-400 ring-1 ring-blue-400' : 'bg-gray-700/50 border-gray-600'}`}>
                    <div className="flex flex-col gap-1">
                        <span className="text-lg font-bold text-white flex items-center gap-2">
                            槽位 {i + 1}
                            {currentSlot === i && <span className="text-xs bg-blue-600 px-2 py-0.5 rounded text-white">使用中</span>}
                        </span>
                        {info ? (
                            <div className="text-sm text-gray-400 space-y-1">
                                <div><span className="text-gray-500">存檔時間:</span> {formatDate(info.lastSaved)}</div>
                                <div className="flex gap-3">
                                    <span className="flex items-center gap-1 text-yellow-400"><Coins size={12}/> {info.money}</span>
                                    <span className="flex items-center gap-1 text-blue-300"><Book size={12}/> {info.totalPagesFound}</span>
                                </div>
                            </div>
                        ) : (
                            <span className="text-gray-500 italic">-- 空白存檔 --</span>
                        )}
                    </div>
                    <Button onClick={() => loadSlot(i)} className={`${currentSlot === i ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-600 hover:bg-gray-500'} text-sm py-2 px-4`}>
                        {info ? (currentSlot === i ? '目前進度' : '讀取') : '開始新遊戲'}
                    </Button>
                </div>
             ))}
           </div>
        </Modal>
      )}

      {/* Main Shop Modal */}
      {activeModal === 'SHOP' && (
        <Modal title="軍火庫" onClose={() => setActiveModal('NONE')}>
           <div className="mb-4 bg-gray-900 p-3 rounded-lg flex justify-between items-center">
             <span className="text-gray-400">剩餘資金</span>
             <span className="text-yellow-400 font-bold text-xl">${saveData.money}</span>
           </div>
           <div className="space-y-3">
             {currentShopItems.map(item => {
               const level = saveData.upgrades[item.id] || 0;
               const cost = StorageService.calculateItemCost(item.id, item.cost, level);
               const isMax = level >= item.max;
               const canAfford = saveData.money >= cost;
               
               return (
                 <div key={item.id} className="bg-gray-700/50 p-4 rounded-lg flex justify-between items-center border border-gray-700">
                   <div>
                     <div className="font-bold text-white">{item.name} <span className="text-xs text-gray-400 ml-2">Lvl {level}/{item.max === 999 ? '∞' : item.max}</span></div>
                     <div className="text-xs text-gray-400 mt-1">{item.desc}</div>
                   </div>
                   <button
                     disabled={isMax || !canAfford}
                     onClick={() => buyItem(item.id, cost, level)}
                     className={`px-4 py-2 rounded text-sm font-bold min-w-[100px] ${isMax ? 'bg-gray-600 text-gray-400' : canAfford ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-red-900/50 text-gray-500'}`}
                   >
                     {isMax ? '已滿級' : `$${cost}`}
                   </button>
                 </div>
               )
             })}
           </div>
        </Modal>
      )}

      {/* Diary Modal */}
      {activeModal === 'DIARY' && (
        <Modal title="艦長的探索日記" onClose={() => { setActiveModal('NONE'); setSelectedDiaryContent(''); }}>
           <div className="grid grid-cols-4 gap-2">
             {DIARY_ENTRIES.map((entry, i) => {
                const isUnlocked = i < saveData.totalPagesFound; 
                return (
                  <div key={entry.id} 
                    className={`aspect-square flex items-center justify-center rounded-lg border border-gray-700 transition-all ${isUnlocked ? 'bg-yellow-600/50 text-yellow-200 hover:bg-yellow-500/50 cursor-pointer' : 'bg-gray-800 text-gray-600'}`}
                    onClick={() => { if (isUnlocked) setSelectedDiaryContent(entry.content); }}
                  >
                    {isUnlocked ? <Book size={24} /> : <Settings size={24} />}
                  </div>
                )
             })}
           </div>
           <div className="mt-6 p-4 bg-gray-900 rounded-lg min-h-[120px] text-gray-300 text-sm whitespace-pre-line border border-gray-700">
             {selectedDiaryContent || '點擊已解鎖的日記以閱讀詳細內容...'}
           </div>
        </Modal>
      )}

      {/* Game Over Modal */}
      {gameState === 'GAMEOVER' && (
        <Modal title="任務結束">
           <div className="text-center space-y-4">
             <div className="text-6xl mb-4 animate-pulse">💀</div>
             <p className="text-gray-300">存活時間: <span className="text-white font-bold">{Math.floor(stats.time/60)}分 {stats.time%60}秒</span></p>
             <p className="text-gray-300">分數: <span className="text-yellow-400 font-bold">{stats.score}</span></p>
             <p className="text-gray-300">獲得資金: <span className="text-green-400 font-bold">+{stats.coins}</span></p>
             <Button onClick={handleReturnToMenu} className="w-full bg-blue-600 mt-6">
               回到主選單 (Enter)
             </Button>
           </div>
        </Modal>
      )}
      
      {/* Victory Modal */}
      {gameState === 'VICTORY' && (
        <Modal title="🎉 任務完成！">
           <div className="text-center space-y-6">
             <div className="text-6xl mb-4 animate-bounce"><CheckCircle className="mx-auto text-green-400" size={64} /></div>
             <div className="bg-gray-900/50 p-6 rounded-xl border border-yellow-500/30">
                <p className="text-gray-400 mb-2">擊敗 BOSS 獎勵</p>
                <div className="text-5xl font-mono font-bold text-yellow-400 flex items-center justify-center gap-2">
                    <span>+</span>
                    <span>{displayedCoins}</span>
                    <Coins size={36} />
                </div>
             </div>
             
             <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-800 p-2 rounded">
                    <div className="text-gray-400">最終分數</div>
                    <div className="font-bold text-white">{stats.score}</div>
                </div>
                <div className="bg-gray-800 p-2 rounded">
                    <div className="text-gray-400">存活時間</div>
                    <div className="font-bold text-white">{Math.floor(stats.time/60)}分 {stats.time%60}秒</div>
                </div>
             </div>
             
             <Button onClick={handleReturnToMenu} className="w-full bg-green-600 hover:bg-green-500 mt-4">
               領取獎勵並返回 (Enter)
             </Button>
           </div>
        </Modal>
      )}
    </div>
  );
}
