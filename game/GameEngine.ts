
import { Enemy, Item, Player, Projectile, XPGem, IGameContext, Weapon, Missile, HolyAura, Lightning, LaserCannon, ScorchingTrail, DashExplosion, PulseLaser, FloatingText } from "./GameClasses";
import { soundManager } from "../services/SoundManager";
import { SaveData, UpgradeOption } from "../types";

export interface GameEngineCallbacks {
    onGameOver: (win: boolean) => void;
    onVictory: (bonus: number) => void;
    onLevelUp: (options: UpgradeOption[]) => void;
    onUpdateUI: (stats: { hp: number, maxHp: number, xp: number, xpNext: number, level: number, score: number, time: number, coins: number }) => void;
    onLog: (msg: string) => void;
    onCenterNotification: (msg: string | null) => void;
    onSave: (data: SaveData) => void;
}

export class GameEngine {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    callbacks: GameEngineCallbacks;
    
    player!: Player;
    enemies: Enemy[] = [];
    items: Item[] = [];
    gems: XPGem[] = [];
    projectiles: Projectile[] = [];
    floatingTexts: FloatingText[] = [];
    
    score = 0;
    time = 0; // seconds
    timeAccumulator = 0; 
    frames = 0;
    coins = 0;
    
    isActive = false;
    isPaused = false;
    
    inputKeys = { w: false, a: false, s: false, d: false };
    
    // Joystick state
    isJoystickEnabled = true;
    joystickBaseRadius = 70;
    joystickStickRadius = 30;
    joystickCenter = { x: 0, y: 0 }; 
    touchInputActive = false;
    currentTouchPos = { x: 0, y: 0 };
    touchIdentifier: number | null = null;
    joystickVector = { x: 0, y: 0 };
    
    animationId = 0;
    lastTime = 0;
    
    mode: 'CLASSIC' | 'CHALLENGE' = 'CLASSIC';
    challengeRound = 0;
    startCountdown = 0;
    bossSpawned = false;
    classicBossPending = false;
    
    // Spawning
    spawnRate = 60;
    spawnTimer = 0;
    lastOrcSpawnTime = 0;
    lastGravitySpawnTime = 0;
    
    saveData: SaveData;
    stars: {x:number, y:number, r:number, a:number}[] = [];

    constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks, saveData: SaveData) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.callbacks = callbacks;
        this.saveData = saveData;
        
        this.initStars();
        
        // Bind input handlers
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
    }
    
    initStars() {
        this.stars = [];
        for(let i=0; i<100; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                r: Math.random() * 2,
                a: Math.random() * 0.8 + 0.2
            });
        }
    }

    cleanup() {
        this.stop();
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        this.canvas.removeEventListener('touchcancel', this.handleTouchEnd);
    }

    start(mode: 'CLASSIC' | 'CHALLENGE') {
        this.mode = mode;
        this.score = 0;
        this.time = 0;
        this.timeAccumulator = 0;
        this.frames = 0;
        this.coins = 0;
        this.isActive = true;
        this.isPaused = false;
        this.bossSpawned = false;
        this.classicBossPending = false;
        this.enemies = [];
        this.items = [];
        this.gems = [];
        this.projectiles = [];
        this.floatingTexts = [];
        this.lastOrcSpawnTime = 0;
        this.lastGravitySpawnTime = 0;

        // Initialize Player
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2, this.saveData.upgrades);

        if (mode === 'CHALLENGE') {
            this.challengeRound = 1;
            this.startCountdown = 3;
            this.callbacks.onCenterNotification("3");
            soundManager.playShoot(); // Beep
        } else {
            this.challengeRound = 0;
            this.startCountdown = 0;
        }

        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }
    
    stop() {
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
    
    toggleJoystick() {
        this.isJoystickEnabled = !this.isJoystickEnabled;
        if (!this.isJoystickEnabled) {
            this.touchInputActive = false;
            this.joystickVector = { x: 0, y: 0 };
        }
        return this.isJoystickEnabled;
    }

    loop(timestamp: number) {
        if (!this.isActive) return;
        const dt = (timestamp - this.lastTime) / (1000 / 60); // Delta time factor relative to 60fps
        this.lastTime = timestamp;

        if (!this.isPaused) {
            this.update(dt);
        }
        this.draw();

        this.animationId = requestAnimationFrame((t) => this.loop(t));
    }

    update(dt: number) {
        // Accumulate time for second-based logic
        // FIX: Ensure this block doesn't run if it's the Classic Boss countdown (which uses the same variable)
        if (this.startCountdown > 0 && !this.classicBossPending) {
             this.timeAccumulator += dt;
             if (this.timeAccumulator >= 60) {
                 this.timeAccumulator -= 60;
                 this.startCountdown--;
                 if (this.startCountdown > 0) {
                     this.callbacks.onCenterNotification(this.startCountdown.toString());
                     soundManager.playShoot();
                 } else {
                     this.callbacks.onCenterNotification("GO!");
                     soundManager.playLevelUp();
                     setTimeout(() => this.callbacks.onCenterNotification(null), 1000);
                     
                     // Spawn Challenge Boss
                     const hpMult = 1 + (this.challengeRound - 1) * 0.5;
                     this.enemies.push(new Enemy('boss', this.canvas.width/2, -100, hpMult, this.time));
                     this.bossSpawned = true;
                 }
             }
             return; // Don't update game world during countdown
        } else if (this.classicBossPending) {
             // Classic Mode Boss Pause Warning
             this.timeAccumulator += dt;
             if (this.timeAccumulator >= 60) {
                 this.timeAccumulator -= 60;
                 this.startCountdown--; // Reusing variable for internal timer logic
                 if (this.startCountdown === 2) {
                      this.callbacks.onCenterNotification("不明訊號出現");
                      soundManager.playShoot();
                 } else if (this.startCountdown === 3) {
                      this.callbacks.onCenterNotification("警告");
                      soundManager.playShoot();
                 } else if (this.startCountdown <= 0) {
                      this.callbacks.onCenterNotification("BOSS 已出現！");
                      setTimeout(() => this.callbacks.onCenterNotification(null), 2000);
                      this.classicBossPending = false;
                      // Ensure double spawn check
                      if (!this.enemies.some(e => e.type === 'boss')) {
                          this.enemies.push(new Enemy('boss', this.canvas.width/2, -100, 1, this.time));
                          this.bossSpawned = true;
                      }
                 }
             }
             return;
        }

        // --- Normal Game Loop ---
        this.timeAccumulator += dt;
        if (this.timeAccumulator >= 60) {
            this.timeAccumulator -= 60;
            this.time++;
            
            // Spawn Rate Logic
            let rate = 60;
            if (this.time > 60) rate = 50;
            if (this.time > 120) rate = 40;
            if (this.time > 300) rate = 30;
            this.spawnRate = rate;
            
            // Classic Mode Boss Trigger
            if (this.mode === 'CLASSIC' && this.time === 180 && !this.bossSpawned && !this.classicBossPending) {
                // Ensure no double trigger if boss already exists (rare case)
                if (!this.enemies.some(e => e.type === 'boss')) {
                    this.classicBossPending = true;
                    this.startCountdown = 3; // 3 seconds warning sequence
                    this.callbacks.onCenterNotification("警告"); // Initial warn text
                    soundManager.playShoot();
                    return; 
                } else {
                    this.bossSpawned = true;
                }
            }
            
            // Elite Enemy Spawn (Classic only)
            if (this.mode === 'CLASSIC' && this.time > 0 && this.time % 60 === 0) {
                 this.enemies.push(new Enemy('elite', Math.random()*this.canvas.width, Math.random()*this.canvas.height));
            }
            
            // Update UI
            this.callbacks.onUpdateUI({
                hp: this.player.hp, maxHp: this.player.maxHp,
                xp: this.player.xp, xpNext: this.player.xpToNext,
                level: this.player.level, score: this.score,
                time: this.time, coins: this.coins
            });
        }
        
        // Input handling
        let moveX = 0; let moveY = 0;
        if (this.inputKeys.w) moveY -= 1;
        if (this.inputKeys.s) moveY += 1;
        if (this.inputKeys.a) moveX -= 1;
        if (this.inputKeys.d) moveX += 1;
        
        if (this.isJoystickEnabled && this.touchInputActive) {
            moveX += this.joystickVector.x;
            moveY += this.joystickVector.y;
        }
        
        const ctx: IGameContext = {
            width: this.canvas.width, height: this.canvas.height,
            enemies: this.enemies, xpGems: this.gems, items: this.items, projectiles: this.projectiles,
            addProjectile: (p) => this.projectiles.push(p),
            addGem: (g) => this.gems.push(g),
            addItem: (i) => this.items.push(i),
            addFloatingText: (t, x, y, c) => this.floatingTexts.push(new FloatingText(t, x, y, c)),
            score: this.score
        };

        this.player.update(dt, {x: moveX, y: moveY}, ctx);
        
        // Spawning
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnEnemy();
            this.spawnTimer = this.spawnRate;
        }
        
        // Update Entities
        // Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(this.player, dt, ctx);
            
            if (e.isSplit) {
                 // Removed due to splitting, no rewards
                 this.enemies.splice(i, 1);
                 continue;
            }

            if (e.hp <= 0 && e.hp > -9999) { // Normal death
                this.enemies.splice(i, 1);
                this.score += e.xpValue;
                
                if (e.type === 'boss') {
                    // Boss Victory Logic
                    const bonus = 3000 + Math.floor(this.score * 0.5);
                    this.stop(); // Stop game loop
                    this.callbacks.onVictory(bonus);
                    return;
                }
                
                // Drops
                this.gems.push(new XPGem(e.x, e.y, e.xpValue));
                if (e.type === 'elite') {
                    this.items.push(new Item(e.x, e.y, 'diary'));
                } else {
                    if (Math.random() < 0.05) this.items.push(new Item(e.x, e.y, 'coin'));
                    else if (Math.random() < 0.005) this.items.push(new Item(e.x, e.y, 'big_coin'));
                }
                soundManager.playEnemyDeath();
            } else if (e.hp <= -9999) { // Forced removal (nuke/despawn)
                 this.enemies.splice(i, 1);
            } else {
                // Collision with player
                if (e.canDealDamage() && Math.hypot(this.player.x - e.x, this.player.y - e.y) < this.player.radius + e.radius) {
                     this.player.takeDamage(1);
                     if (this.player.hp <= 0) {
                         this.stop();
                         this.callbacks.onGameOver(false);
                         return;
                     }
                }
            }
        }
        
        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(dt);
            if (p.life <= 0) {
                this.projectiles.splice(i, 1);
                continue;
            }
            
            if (p.isPlayer) {
                 // Check collisions with enemies
                 if (p.delay > 0) continue; // Don't hit if delayed

                 this.enemies.forEach(e => {
                     if (!p.hitList.has(e)) {
                         const hitDist = p.isExplosion ? p.radius + e.radius : p.radius + e.radius;
                         if (Math.hypot(p.x - e.x, p.y - e.y) < hitDist) {
                             e.takeDamage(p.damage, ctx);
                             p.hitList.add(e);
                             if (!p.isLaser && !p.isExplosion) p.life = 0; // Destroy bullet
                         }
                     }
                 });
            } else {
                 // Enemy projectiles
                 if (Math.hypot(p.x - this.player.x, p.y - this.player.y) < p.radius + this.player.radius) {
                     this.player.takeDamage(1);
                     p.life = 0;
                     if (this.player.hp <= 0) {
                         this.stop();
                         this.callbacks.onGameOver(false);
                         return;
                     }
                 }
            }
        }
        
        // Gems
        for (let i = this.gems.length - 1; i >= 0; i--) {
            const g = this.gems[i];
            const d = Math.hypot(this.player.x - g.x, this.player.y - g.y);
            if (d < this.player.pickupRange) { // Magnet
                g.x += (this.player.x - g.x) * 0.15 * dt;
                g.y += (this.player.y - g.y) * 0.15 * dt;
                if (d < this.player.radius) {
                    if (this.player.gainXP(g.value)) {
                        this.isPaused = true;
                        this.callbacks.onLevelUp(this.getUpgradeOptions());
                    }
                    this.gems.splice(i, 1);
                }
            }
        }
        
        // Items
        for (let i = this.items.length - 1; i >= 0; i--) {
            const it = this.items[i];
            const d = Math.hypot(this.player.x - it.x, this.player.y - it.y);
             if (d < this.player.pickupRange) {
                it.x += (this.player.x - it.x) * 0.1 * dt;
                it.y += (this.player.y - it.y) * 0.1 * dt;
                if (d < this.player.radius) {
                    if (it.type === 'coin') {
                        this.coins += 10;
                        soundManager.playCoin();
                    } else if (it.type === 'big_coin') {
                        this.coins += 100;
                        soundManager.playCoin();
                    } else if (it.type === 'diary') {
                        this.saveData.totalPagesFound = Math.min(24, this.saveData.totalPagesFound + 1);
                        this.callbacks.onSave(this.saveData);
                        this.callbacks.onLog("獲得日記殘頁！");
                        soundManager.playLevelUp(); // Sound cue
                        this.player.heal(3);
                    }
                    this.items.splice(i, 1);
                }
            }
        }
        
        // Floating Texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            if (!this.floatingTexts[i].update(dt)) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }
    
    spawnEnemy() {
        // REMOVED RESTRICTION: if (this.bossSpawned && this.mode === 'CLASSIC') return;
        
        // Dynamic spawn weights based on time
        const pool = [];
        
        // Slime: Always
        pool.push({ type: 'slime', w: 10 });
        
        // Goblin: 30s+
        if (this.time >= 30) pool.push({ type: 'goblin', w: 8 });
        
        // Kamikaze: 60s+
        if (this.time >= 60) pool.push({ type: 'kamikaze', w: 4 });
        
        // Orc: 90s+ (Single spawn constrained)
        if (this.time >= 90) {
             // Throttled spawn
             if (performance.now() - this.lastOrcSpawnTime > 4000) { // 4s cooldown
                 pool.push({ type: 'orc', w: 2 });
             }
        }
        
        // Gravity: 120s+
        if (this.time >= 120) {
             if (performance.now() - this.lastGravitySpawnTime > 5000) {
                 pool.push({ type: 'gravity', w: 3 });
             }
        }
        
        // Golem: 180s+
        if (this.time >= 180) pool.push({ type: 'golem', w: 3 });

        // Select
        const totalW = pool.reduce((a, b) => a + b.w, 0);
        let r = Math.random() * totalW;
        let selected = 'slime';
        for(const p of pool) {
            if (r < p.w) { selected = p.type; break; }
            r -= p.w;
        }
        
        // Spawn Logic
        if (selected === 'orc') {
            this.lastOrcSpawnTime = performance.now();
            this.spawnEntity('orc');
        } else if (selected === 'gravity') {
            this.lastGravitySpawnTime = performance.now();
            this.spawnEntity('gravity');
        } else if (selected === 'goblin') {
             // Swarm for goblins?
             if (Math.random() < 0.3) {
                 for(let i=0; i<5; i++) this.spawnEntity('goblin', 30); // small spread
             } else {
                 this.spawnEntity('goblin');
             }
        } else {
             this.spawnEntity(selected);
        }
    }
    
    spawnEntity(type: string, spread: number = 0) {
        let x, y;
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? -50 : this.canvas.width + 50;
            y = Math.random() * this.canvas.height;
        } else {
            x = Math.random() * this.canvas.width;
            y = Math.random() < 0.5 ? -50 : this.canvas.height + 50;
        }
        
        if (spread > 0) {
            x += (Math.random()-0.5)*spread;
            y += (Math.random()-0.5)*spread;
        }
        
        // Scaling for Challenge Mode
        let mult = 1;
        if (this.mode === 'CHALLENGE') {
            mult = 1 + (this.challengeRound - 1) * 0.2 + (this.time / 300);
        } else {
            mult = 1 + (this.time / 600);
        }
        
        this.enemies.push(new Enemy(type, x, y, mult, this.time));
    }
    
    draw() {
        this.ctx.fillStyle = '#111827';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Stars
        this.ctx.fillStyle = '#fff';
        this.stars.forEach(s => {
            this.ctx.globalAlpha = s.a;
            this.ctx.beginPath(); this.ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;

        this.items.forEach(i => i.draw(this.ctx, 1)); // dt=1 for visual smooth
        this.gems.forEach(g => g.draw(this.ctx));
        this.player.draw(this.ctx);
        this.enemies.forEach(e => e.draw(this.ctx, this.player));
        this.projectiles.forEach(p => p.draw(this.ctx));
        this.floatingTexts.forEach(t => t.draw(this.ctx));
        
        // Boss HP Bar (Bottom)
        const boss = this.enemies.find(e => e.type === 'boss');
        if (boss) {
             const barW = Math.min(600, this.canvas.width - 40);
             const barX = (this.canvas.width - barW) / 2;
             const barY = this.canvas.height - 30;
             
             this.ctx.shadowBlur = 10; this.ctx.shadowColor = '#000';
             this.ctx.fillStyle = '#374151';
             this.ctx.fillRect(barX, barY, barW, 12);
             
             this.ctx.fillStyle = '#dc2626';
             this.ctx.fillRect(barX, barY, barW * (Math.max(0, boss.hp) / boss.maxHp), 12);
             
             this.ctx.strokeStyle = '#fff'; this.ctx.lineWidth = 1;
             this.ctx.strokeRect(barX, barY, barW, 12);
             this.ctx.shadowBlur = 0;
             
             this.ctx.fillStyle = '#fff';
             this.ctx.font = 'bold 12px Arial';
             this.ctx.textAlign = 'center';
             this.ctx.fillText('VOID WATCHER', this.canvas.width/2, barY - 5);
             
             // Boss HP Number
             this.ctx.font = 'bold 10px monospace';
             this.ctx.fillText(`${Math.floor(Math.max(0, boss.hp))} / ${Math.floor(boss.maxHp)}`, this.canvas.width/2, barY + 10);
        }
        
        // Joystick
        if (this.isJoystickEnabled && this.touchInputActive) {
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath(); this.ctx.arc(this.joystickCenter.x, this.joystickCenter.y, this.joystickBaseRadius, 0, Math.PI*2); this.ctx.fill();
            
            this.ctx.globalAlpha = 0.6;
            this.ctx.beginPath(); this.ctx.arc(this.currentTouchPos.x, this.currentTouchPos.y, this.joystickStickRadius, 0, Math.PI*2); this.ctx.fill();
            this.ctx.globalAlpha = 1;
        }
    }
    
    getUpgradeOptions(): UpgradeOption[] {
        const pool: UpgradeOption[] = [];
        const weaponPool: UpgradeOption[] = []; // High weight
        const otherPool: UpgradeOption[] = [];  // Normal weight
        
        const has = (id: string) => this.player.weapons.some(w => w.id === id);
        
        // Helper
        const add = (opt: UpgradeOption, isWeapon: boolean = false) => {
            if (isWeapon) weaponPool.push(opt);
            else otherPool.push(opt);
        };

        // Weapons
        if (!has('pulse')) add({ id: 'add_pulse', text: '獲得 脈衝雷射', icon: 'ZAP' }, true); // Should have by default
        else add({ id: 'up_pulse', text: '升級 脈衝雷射', icon: 'ZAP' }, true);
        
        if (!has('missile')) add({ id: 'add_missile', text: '獲得 秘術飛彈', icon: 'ROCKET', description: '召喚環繞機身的能量飛彈' }, true);
        else add({ id: 'up_missile', text: '升級 秘術飛彈', icon: 'ROCKET' }, true);
        
        if (!has('aura')) add({ id: 'add_aura', text: '獲得 神聖光環', icon: 'SUN', description: '對周圍敵人造成持續傷害' }, true);
        else add({ id: 'up_aura', text: '升級 神聖光環', icon: 'SUN' }, true);
        
        if (!has('lightning')) add({ id: 'add_lightning', text: '獲得 閃電打擊', icon: 'ZAP', description: '召喚閃電隨機攻擊敵人' }, true);
        else add({ id: 'up_lightning', text: '升級 閃電打擊', icon: 'ZAP' }, true);
        
        if (!has('laser')) add({ id: 'add_laser', text: '獲得 離子加農砲', icon: 'CROSSHAIR', description: '發射強力的貫穿光束' }, true);
        else add({ id: 'up_laser', text: '升級 離子加農砲', icon: 'CROSSHAIR' }, true);

        if (!has('trail')) add({ id: 'add_trail', text: '獲得 灼熱軌跡', icon: 'FLAME', description: '在身後留下傷害火焰' }, true);
        else add({ id: 'up_trail', text: '升級 灼熱軌跡', icon: 'FLAME' }, true);

        if (!has('dash_exp')) add({ id: 'add_dash_exp', text: '獲得 殘影爆破', icon: 'BOMB', description: '衝刺時產生爆炸' }, true);
        else add({ id: 'up_dash_exp', text: '升級 殘影爆破', icon: 'BOMB' }, true);
        
        // Stats
        if (this.player.hp < this.player.maxHp) add({ id: 'heal', text: '修復機體 (+3 HP)', icon: 'HEART' });
        add({ id: 'max_hp', text: '結構強化 (HP上限+1)', icon: 'HEART' });
        add({ id: 'cooldown', text: '冷卻縮減 (-10%)', icon: 'WIND' });
        add({ id: 'pickup_range', text: '磁場增幅 (拾取範圍+50)', icon: 'MAGNET' });
        
        // Tactical Nuke (Rare)
        if (Math.random() < 0.1) add({ id: 'nuke', text: '戰術核武 (全場清空)', icon: 'BOMB', description: '消滅所有非首領敵人' });

        // Weighted Selection
        // Add weapons 3 times to the lottery
        const lottery = [...otherPool];
        weaponPool.forEach(w => {
            lottery.push(w);
            lottery.push(w);
            lottery.push(w);
        });
        
        // Pick 3 distinct
        const selected: UpgradeOption[] = [];
        while(selected.length < 3 && lottery.length > 0) {
            const idx = Math.floor(Math.random() * lottery.length);
            const item = lottery[idx];
            
            // Remove all instances of this item from lottery to avoid duplicates
            if (!selected.some(s => s.id === item.id)) {
                selected.push(item);
            }
            // Remove this specific instance
            lottery.splice(idx, 1);
            // Filter out same ID from remaining lottery
            for(let i=lottery.length-1; i>=0; i--) {
                if (lottery[i].id === item.id) lottery.splice(i, 1);
            }
        }
        
        return selected;
    }
    
    applyUpgrade(id: string) {
        if (id === 'heal') {
            this.player.heal(3);
        } else if (id === 'max_hp') {
            this.player.increaseMaxHp(1);
        } else if (id === 'cooldown') {
            this.player.weaponCooldownMult *= 0.90; // 10%
        } else if (id === 'pickup_range') {
            this.player.pickupRange += 50;
        } else if (id === 'nuke') {
            this.enemies = this.enemies.filter(e => e.type === 'boss'); // Spare boss
            soundManager.playNuke();
            this.callbacks.onLog("戰術核武已啟動！");
        } else if (id.startsWith('add_')) {
            const type = id.replace('add_', '');
            if (type === 'missile') this.player.addWeapon(new Missile(this.player, 1));
            if (type === 'aura') this.player.addWeapon(new HolyAura(this.player, 1));
            if (type === 'lightning') this.player.addWeapon(new Lightning(this.player, 1));
            if (type === 'laser') this.player.addWeapon(new LaserCannon(this.player, 1));
            if (type === 'trail') this.player.addWeapon(new ScorchingTrail(this.player, 1));
            if (type === 'dash_exp') this.player.addWeapon(new DashExplosion(this.player, 1));
        } else if (id.startsWith('up_')) {
            const type = id.replace('up_', '');
            const w = this.player.weapons.find(wp => wp.id === type);
            if (w) w.upgrade();
        }
        
        this.isPaused = false;
    }

    handleKeyDown(e: KeyboardEvent) {
        if (this.isPaused) return; // Allow menu navigation to bubble up
        if (e.key === 'w' || e.key === 'ArrowUp') this.inputKeys.w = true;
        if (e.key === 'a' || e.key === 'ArrowLeft') this.inputKeys.a = true;
        if (e.key === 's' || e.key === 'ArrowDown') this.inputKeys.s = true;
        if (e.key === 'd' || e.key === 'ArrowRight') this.inputKeys.d = true;
        if (e.key === ' ') this.player.dash(0, 0);
    }
    
    handleKeyUp(e: KeyboardEvent) {
        if (e.key === 'w' || e.key === 'ArrowUp') this.inputKeys.w = false;
        if (e.key === 'a' || e.key === 'ArrowLeft') this.inputKeys.a = false;
        if (e.key === 's' || e.key === 'ArrowDown') this.inputKeys.s = false;
        if (e.key === 'd' || e.key === 'ArrowRight') this.inputKeys.d = false;
    }
    
    handleTouchStart(e: TouchEvent) {
        if (this.isPaused || !this.isJoystickEnabled) return;
        e.preventDefault();
        
        // Two finger dash
        if (e.touches.length >= 2) {
             this.player.dash(0, 0); // Direction handled by visual angle inside dash
             return;
        }

        const touch = e.changedTouches[0];
        this.touchIdentifier = touch.identifier;
        
        // Dynamic Joystick Center
        this.joystickCenter = { x: touch.clientX, y: touch.clientY };
        this.currentTouchPos = { x: touch.clientX, y: touch.clientY };
        this.touchInputActive = true;
        this.joystickVector = { x: 0, y: 0 };
    }
    
    handleTouchMove(e: TouchEvent) {
        if (!this.touchInputActive) return;
        e.preventDefault();
        
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === this.touchIdentifier) {
                const touch = e.changedTouches[i];
                this.currentTouchPos = { x: touch.clientX, y: touch.clientY };
                
                const dx = touch.clientX - this.joystickCenter.x;
                const dy = touch.clientY - this.joystickCenter.y;
                const dist = Math.hypot(dx, dy);
                
                const maxDist = this.joystickBaseRadius;
                
                if (dist > maxDist) {
                    const angle = Math.atan2(dy, dx);
                    this.currentTouchPos.x = this.joystickCenter.x + Math.cos(angle) * maxDist;
                    this.currentTouchPos.y = this.joystickCenter.y + Math.sin(angle) * maxDist;
                }
                
                // Vector -1 to 1
                const vX = (this.currentTouchPos.x - this.joystickCenter.x) / maxDist;
                const vY = (this.currentTouchPos.y - this.joystickCenter.y) / maxDist;
                this.joystickVector = { x: vX, y: vY };
                break;
            }
        }
    }
    
    handleTouchEnd(e: TouchEvent) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === this.touchIdentifier) {
                this.touchInputActive = false;
                this.touchIdentifier = null;
                this.joystickVector = { x: 0, y: 0 };
                break;
            }
        }
    }
}
