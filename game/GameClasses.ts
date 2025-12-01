


import { soundManager } from "../services/SoundManager";

export interface IGameContext {
    width: number;
    height: number;
    enemies: Enemy[];
    xpGems: XPGem[];
    items: Item[];
    projectiles: Projectile[];
    addProjectile: (p: Projectile) => void;
    addGem: (g: XPGem) => void;
    addItem: (i: Item) => void;
    addFloatingText: (text: string, x: number, y: number, color: string) => void;
    score: number;
}

export class FloatingText {
    x: number; y: number; text: string; color: string;
    life: number = 0; maxLife: number = 30;
    vx: number; vy: number;
    
    constructor(text: string, x: number, y: number, color: string) {
        this.text = text; this.x = x; this.y = y; this.color = color;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = -2;
    }
    
    update(dt: number): boolean {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life += dt;
        return this.life < this.maxLife;
    }
    
    draw(ctx: CanvasRenderingContext2D) {
        const alpha = 1 - (this.life / this.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.globalAlpha = 1;
    }
}

export class XPGem {
    x: number; y: number; value: number; radius: number = 6;
    life: number = 0;
    constructor(x: number, y: number, value: number) {
        this.x = x; this.y = y; this.value = value;
    }
    draw(ctx: CanvasRenderingContext2D) {
        this.life += 0.1;
        ctx.shadowBlur = 8; ctx.shadowColor = '#4ade80';
        ctx.fillStyle = '#4ade80';
        
        const floatY = Math.sin(this.life) * 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.radius + floatY);
        ctx.lineTo(this.x + this.radius, this.y + floatY);
        ctx.lineTo(this.x, this.y + this.radius + floatY);
        ctx.lineTo(this.x - this.radius, this.y + floatY);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#ecfccb';
        ctx.beginPath();
        ctx.arc(this.x, this.y + floatY - 2, 2, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

export class Item {
    x: number; y: number; type: 'coin' | 'big_coin' | 'diary'; life: number = 0; radius: number = 6;
    constructor(x: number, y: number, type: 'coin' | 'big_coin' | 'diary') {
        this.x = x; this.y = y; this.type = type;
        if (type === 'diary') this.radius = 12;
        if (type === 'big_coin') this.radius = 12;
    }
    draw(ctx: CanvasRenderingContext2D, dt: number) {
        this.life += dt;
        const float = Math.sin(this.life / 20) * 4;
        ctx.save(); ctx.translate(this.x, this.y + float);
        
        if (this.type === 'diary') {
            const angle = Math.sin(this.life * 0.05) * 0.2;
            ctx.rotate(angle);
            ctx.shadowBlur = 15; ctx.shadowColor = '#fde047';
            ctx.fillStyle = '#854d0e';
            ctx.beginPath(); ctx.roundRect(-10, -12, 20, 24, 2); ctx.fill();
            ctx.fillStyle = '#fef3c7';
            ctx.beginPath(); ctx.roundRect(-8, -12, 16, 22, 1); ctx.fill();
            ctx.fillStyle = '#a16207';
            ctx.beginPath(); ctx.roundRect(-10, -12, 10, 24, 2); ctx.fill();
            ctx.fillStyle = '#fde047';
            ctx.font = 'bold 14px Serif'; ctx.textAlign = 'center'; ctx.textBaseline='middle';
            ctx.fillText('?', 5, 0);
        } else if (this.type === 'coin') {
            const scaleX = Math.abs(Math.cos(this.life * 0.1));
            ctx.scale(scaleX, 1);
            ctx.shadowBlur = 8; ctx.shadowColor = '#fbbf24';
            ctx.fillStyle = '#d97706'; 
            ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fbbf24'; 
            ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-2, -2, 2, 0, Math.PI * 2); ctx.fill();
        } else if (this.type === 'big_coin') {
            const scaleX = Math.abs(Math.cos(this.life * 0.08));
            ctx.scale(scaleX, 1);
            ctx.shadowBlur = 20; ctx.shadowColor = '#fbbf24';
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; 
            ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText('$', 0, 1);
        }
        ctx.shadowBlur = 0; ctx.restore();
    }
}

export class Projectile {
    x: number; y: number; vx: number; vy: number; life: number; 
    radius: number = 10; damage: number; hitList = new Set<Enemy>();
    isPlayer: boolean;
    isLaser: boolean = false;
    isExplosion: boolean = false;
    maxLife: number = 0;
    delay: number = 0;
    
    constructor(x: number, y: number, vx: number, vy: number, damage: number, isPlayer: boolean, isLaser: boolean = false, isExplosion: boolean = false, lifeOverride?: number, delay: number = 0) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.damage = damage; this.isPlayer = isPlayer;
        this.isLaser = isLaser;
        this.isExplosion = isExplosion;
        this.life = lifeOverride || 600; 
        this.maxLife = this.life;
        this.delay = delay;
        if (isExplosion) {
            this.radius = 125; 
        }
    }
    update(dt: number) {
        if (this.delay > 0) {
            this.delay -= dt;
            return;
        }
        this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt;
    }
    draw(ctx: CanvasRenderingContext2D) {
        if (this.delay > 0) {
            if (this.isExplosion) {
                 ctx.globalAlpha = 0.2;
                 ctx.fillStyle = '#fff';
                 ctx.beginPath(); ctx.arc(this.x, this.y, 15, 0, Math.PI*2); ctx.fill();
                 ctx.globalAlpha = 1;
            }
            return;
        }

        if (this.isExplosion) {
            const progress = 1 - (this.life / this.maxLife);
            const currentRadius = this.radius * (0.2 + progress * 0.8);
            const alpha = Math.min(0.5, this.life / 20); 
            ctx.globalAlpha = alpha;
            ctx.shadowBlur = 10; ctx.shadowColor = '#fef08a';
            ctx.fillStyle = '#fef9c3'; 
            ctx.beginPath(); ctx.arc(this.x, this.y, currentRadius, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(this.x, this.y, currentRadius * 0.6, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
            return;
        }

        ctx.save(); ctx.translate(this.x, this.y); 
        
        if (!this.isExplosion) {
             ctx.rotate(Math.atan2(this.vy, this.vx));
        }
        
        if (this.isPlayer) {
             ctx.shadowBlur = 10; ctx.shadowColor = '#06b6d4'; 
             ctx.fillStyle = '#22d3ee';
             
             if (this.isLaser) {
                 ctx.beginPath();
                 ctx.roundRect(-15, -6, 30, 12, 4);
                 ctx.fill();
                 ctx.fillStyle = '#fff';
                 ctx.beginPath(); ctx.roundRect(-10, -3, 20, 6, 2); ctx.fill();
             } else {
                 ctx.beginPath();
                 ctx.moveTo(10, 0); ctx.lineTo(-5, 4); ctx.lineTo(-2, 0); ctx.lineTo(-5, -4);
                 ctx.closePath(); ctx.fill();
                 ctx.fillStyle = '#fff';
                 ctx.beginPath(); ctx.arc(5, 0, 2, 0, Math.PI*2); ctx.fill();
             }
        } else {
             if (!this.isPlayer && this.life > 500) { 
                 ctx.shadowBlur = 15; ctx.shadowColor = '#dc2626';
                 ctx.fillStyle = '#ef4444';
                 ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill(); 
                 ctx.fillStyle = '#fff';
                 ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
             } else {
                 ctx.shadowBlur = 5; ctx.shadowColor = '#f87171';
                 ctx.fillStyle = '#ef4444'; 
                 ctx.beginPath(); 
                 ctx.moveTo(8, 0); ctx.lineTo(-8, 6); ctx.lineTo(-4, 0); ctx.lineTo(-8, -6); 
                 ctx.fill();
                 ctx.fillStyle = '#fff';
                 ctx.beginPath(); ctx.arc(4, 0, 2, 0, Math.PI*2); ctx.fill();
             }
        }
        ctx.restore();
    }
}

export class Enemy {
    type: string; x: number; y: number; hp: number; maxHp: number;
    radius: number; speed: number; xpValue: number; color: string;
    
    // Boss State
    state: 'chasing'|'priming'|'exploding'|'warnShoot'|'shoot'|'warnDash'|'dash'|'warnSpiral'|'spiral'|'warnBurst'|'burst'|'exhausted'|'warnSpin'|'spin' = 'chasing';
    timer: number = 0;
    hasDealtDamage: boolean = false;
    actionCooldown: number = 300; 
    
    // Orc Replication
    replicationState: 'idle' | 'warning' = 'idle';
    replicationTimer: number = 0;
    generation: number = 0; 
    isSplit: boolean = false;

    aiState: 'drifting'|'warn'|'dash' = 'drifting';
    driftAngle: number = 0;
    dashA: number = 0;
    visualAngle: number = 0;
    pulsePhase: number = 0;
    spiralAngle: number = 0;

    hitStunTimer: number = 0;
    hitFlashTimer: number = 0;
    
    exhaustionThreshold: number;
    damageTakenSinceExhaust: number = 0;
    enrageLevel: number = 1.0;

    spawnTimer: number = 0;
    lifeTime: number = 0;

    constructor(type: string, x: number, y: number, multiplier: number = 1, gameTime: number = 0, generation: number = 0) {
        this.type = type; this.x = x; this.y = y; this.generation = generation;

        const stats = { 
            'slime':    {r:14, s:0.3, hp:2, xp:1},    
            'goblin':   {r:16, s:0.35, hp:10, xp:2},   
            'orc':      {r:22, s:0.12, hp:40, xp:15},  
            'golem':    {r:34, s:0.1, hp:100, xp:50},
            'gravity':  {r:20, s:0.2, hp:40, xp:20},   
            'kamikaze': {r:18, s:1.5, hp:1, xp:10},   
            'elite':    {r:26, s:0.9, hp:1, xp:100},    
            'boss':     {r:65, s:0.6, hp:3000, xp:1000} // Boss HP 3000
        }[type] || {r:10, s:0.4, hp:1, xp:1};

        this.radius = stats.r;
        this.speed = stats.s * (1 + gameTime / 1800) * 0.9; 
        
        if (type === 'orc' && this.generation > 0) {
            this.radius *= 0.8; 
            this.speed *= 1.4; 
        }

        this.hp = stats.hp * multiplier;
        if (type === 'elite') this.hp = 1;
        this.maxHp = this.hp;
        this.xpValue = stats.xp;
        
        this.exhaustionThreshold = this.maxHp * 0.2; 
        
        this.color = { 'slime':'#ef4444', 'goblin':'#047857', 'orc':'#a855f7', 'golem':'#9ca3af', 'gravity':'#6366f1', 'kamikaze':'#f97316', 'elite': '#facc15', 'boss': '#7f1d1d' }[type] || '#fff';
        
        if (type === 'kamikaze') { this.timer = 30; }
        if (type === 'elite') { this.timer = 300; this.driftAngle = Math.random()*Math.PI*2; }
        if (type === 'boss') { this.state = 'chasing'; }
        
        if (type === 'orc') {
            this.spawnTimer = 60; // 1 second grace period
        }
        
        this.pulsePhase = Math.random() * Math.PI * 2;
    }
    
    takeDamage(amount: number, ctx?: IGameContext) {
        if (this.isSplit) return; 

        this.hp -= amount;
        this.hitFlashTimer = 5;

        if (this.type === 'boss' && this.state !== 'exhausted') {
            this.damageTakenSinceExhaust += amount;
            if (this.damageTakenSinceExhaust >= this.exhaustionThreshold) {
                this.state = 'exhausted';
                this.timer = 0; 
                this.damageTakenSinceExhaust = 0;
                this.enrageLevel += 0.2; 
                if (ctx) ctx.addFloatingText("力竭!", this.x, this.y - 80, '#fbbf24');
            }
        }

        if (this.type === 'golem') {
            this.hitStunTimer = 15; 
        }
        if (ctx) {
            ctx.addFloatingText(`-${Math.floor(amount)}`, this.x, this.y - this.radius - 10, '#fff');
        }
    }
    
    canDealDamage(): boolean {
        if (this.type === 'orc' && this.spawnTimer > 0) return false;
        if (this.isSplit) return false;
        return true;
    }

    update(player: Player, dt: number, ctx: IGameContext) {
        this.pulsePhase += dt * 0.1;
        this.lifeTime += dt;
        if (this.spawnTimer > 0) this.spawnTimer -= dt;
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
        
        if (this.hitStunTimer > 0) {
            this.hitStunTimer -= dt;
            if (this.type === 'golem') return;
        }

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (this.type === 'orc' && this.generation < 2) {
            // Must be alive for 3 seconds AND be close to player to start warning
            if (this.lifeTime > 180) { // 3s
                if (this.replicationState === 'idle') {
                    if (dist < 300) {
                        this.replicationState = 'warning';
                        this.replicationTimer = 0; // Start warning timer
                    }
                } else if (this.replicationState === 'warning') {
                     this.replicationTimer += dt;
                     // Warning lasts 3 seconds (180 frames) before split
                     if (this.replicationTimer > 180) { 
                        this.isSplit = true;
                        this.hp = -9999; 

                        const angle = Math.random() * Math.PI * 2;
                        const spawnDist = 80;

                        for(let i=0; i<2; i++) {
                            const offsetA = angle + (i===0 ? 0 : Math.PI); 
                            const childX = this.x + Math.cos(offsetA) * spawnDist;
                            const childY = this.y + Math.sin(offsetA) * spawnDist;
                            
                            const bx = Math.max(0, Math.min(ctx.width, childX));
                            const by = Math.max(0, Math.min(ctx.height, childY));

                            // Spawns Gen+1
                            const child = new Enemy('orc', bx, by, 1, 0, this.generation + 1);
                            ctx.enemies.push(child);
                        }
                        
                        soundManager.playReplicate();
                        ctx.addFloatingText('分裂!', this.x, this.y - 30, '#d8b4fe');
                     }
                }
            }
        }

        if (this.type === 'boss') {
            this.timer += dt;
            this.visualAngle += 0.05 * dt;

            if (this.state === 'exhausted') {
                 if (this.timer > 300) { 
                     this.state = 'chasing';
                     this.timer = 0;
                 }
                 return; 
            }

            if (this.state === 'chasing') {
                 const angle = Math.atan2(dy, dx);
                 this.x += Math.cos(angle) * this.speed * dt;
                 this.y += Math.sin(angle) * this.speed * dt;
                 
                 this.actionCooldown -= dt;
                 if (this.actionCooldown <= 0) {
                     const rand = Math.random();
                     if (rand < 0.20) { this.state = 'warnDash'; }
                     else if (rand < 0.40) { this.state = 'warnShoot'; } 
                     else if (rand < 0.60) { this.state = 'warnSpiral'; }
                     else if (rand < 0.80) { this.state = 'warnBurst'; }
                     else { this.state = 'warnSpin'; } 
                     
                     this.timer = 0;
                     this.actionCooldown = 300; 
                 }
            } 
            else if (this.state === 'warnDash') {
                if (this.timer > 120) { 
                    this.state = 'dash'; this.timer = 0;
                    this.dashA = Math.atan2(dy, dx);
                }
            } else if (this.state === 'dash') {
                this.x += Math.cos(this.dashA) * 6 * dt; 
                this.y += Math.sin(this.dashA) * 6 * dt;
                if (this.timer > 40) { this.state = 'chasing'; this.timer = 0; }
            } 
            else if (this.state === 'warnShoot') {
                if (this.timer > 60) {
                    this.state = 'shoot'; this.timer = 0;
                    for(let i=-2; i<=2; i++) {
                        const a = Math.atan2(dy, dx) + i * 0.15;
                        ctx.addProjectile(new Projectile(this.x, this.y, Math.cos(a)*1.2, Math.sin(a)*1.2, 1, false));
                    }
                    soundManager.playShoot();
                }
            } else if (this.state === 'shoot') {
                 if (this.timer > 30) { this.state = 'chasing'; this.timer = 0; }
            }
            else if (this.state === 'warnSpiral') {
                if (this.timer > 60) {
                    this.state = 'spiral'; this.timer = 0; 
                }
            } else if (this.state === 'spiral') {
                this.spiralAngle += 0.15 * dt * this.enrageLevel;
                if (Math.floor(this.timer/60) !== Math.floor((this.timer - dt)/60)) {
                    for(let i=0; i<6; i++) { 
                        const a = this.spiralAngle + (Math.PI*2/6)*i;
                        ctx.addProjectile(new Projectile(this.x, this.y, Math.cos(a)*1.0, Math.sin(a)*1.0, 1, false));
                    }
                }
                if (this.timer > 240) { this.state = 'chasing'; this.timer = 0; } 
            }
            else if (this.state === 'warnBurst') {
                if (this.timer > 60) { 
                    this.state = 'burst'; this.timer = 0; 
                }
            } else if (this.state === 'burst') {
                if (Math.floor(this.timer/20) !== Math.floor((this.timer - dt)/20)) { 
                    const a = Math.atan2(dy, dx);
                    const spread = (Math.random()-0.5)*0.2;
                    ctx.addProjectile(new Projectile(this.x, this.y, Math.cos(a+spread)*1.5, Math.sin(a+spread)*1.5, 1, false));
                    soundManager.playShoot();
                }
                if (this.timer > 180) { this.state = 'chasing'; this.timer = 0; }
            }
            else if (this.state === 'warnSpin') {
                if (this.timer > 60) { this.state = 'spin'; this.timer = 0; }
            } else if (this.state === 'spin') {
                 this.visualAngle += 0.2 * dt;
                 if (Math.floor(this.timer/10) !== Math.floor((this.timer - dt)/10)) { 
                     const a1 = this.visualAngle;
                     const a2 = this.visualAngle + Math.PI;
                     ctx.addProjectile(new Projectile(this.x, this.y, Math.cos(a1)*1.5, Math.sin(a1)*1.5, 1, false));
                     ctx.addProjectile(new Projectile(this.x, this.y, Math.cos(a2)*1.5, Math.sin(a2)*1.5, 1, false));
                 }
                 if (this.timer > 480) { 
                     this.state = 'chasing'; this.timer = 0;
                 }
            }

        } else if (this.type === 'elite') {
            this.visualAngle += 0.05 * dt;
            if (this.aiState === 'drifting') {
                this.timer -= dt;
                if(this.timer<=0) { this.aiState='warn'; this.timer=30; }
                else { this.x += Math.cos(this.driftAngle)*this.speed*dt; this.y += Math.sin(this.driftAngle)*this.speed*dt; }
            } else if (this.aiState === 'warn') {
                this.timer -= dt;
                if(this.timer<=0) { 
                    this.aiState='dash'; 
                    this.timer=90; 
                    this.dashA = Math.atan2(this.y - player.y, this.x - player.x); 
                }
            } else if (this.aiState === 'dash') {
                this.timer -= dt;
                if(this.timer<=0) { this.aiState='drifting'; this.timer=300; this.driftAngle = Math.random() * Math.PI * 2; }
                else { 
                    this.x -= Math.cos(this.dashA)*5*dt; 
                    this.y -= Math.sin(this.dashA)*5*dt; 
                }
            }
            if (this.x < 0 || this.x > ctx.width) this.driftAngle = Math.PI - this.driftAngle;
            if (this.y < 0 || this.y > ctx.height) this.driftAngle = -this.driftAngle;
        } else if (this.type === 'kamikaze') {
            if (this.state === 'chasing') {
                if (dist < 180) this.state = 'priming';
                else {
                   const angle = Math.atan2(dy, dx);
                   this.x += Math.cos(angle) * this.speed * dt;
                   this.y += Math.sin(angle) * this.speed * dt;
                }
            } else if (this.state === 'priming') {
                this.timer -= dt;
                if (this.timer <= 0) { this.state = 'exploding'; this.timer = 45; }
            } else if (this.state === 'exploding') {
                this.timer -= dt;
                if (this.timer <= 0) this.hp = -9999;
                else if (!this.hasDealtDamage) {
                     const progress = 1 - (this.timer / 45);
                     const radius = 20 + progress * 140; 
                     if (dist < radius * 0.85 + player.radius) {
                         player.takeDamage(2);
                         this.hasDealtDamage = true;
                     }
                }
            }
        } else {
             const angle = Math.atan2(dy, dx);
             this.x += Math.cos(angle) * this.speed * dt;
             this.y += Math.sin(angle) * this.speed * dt;
        }
        
        if (this.type !== 'elite' && this.type !== 'boss') {
             this.x = Math.max(-50, Math.min(ctx.width+50, this.x));
             this.y = Math.max(-50, Math.min(ctx.height+50, this.y));
        }
    }

    draw(ctx: CanvasRenderingContext2D, player?: Player) {
        ctx.save(); 
        
        const isReplicating = (this.type === 'orc' && this.replicationState === 'warning'); 
        if ((this.type === 'boss' && this.state.startsWith('warn')) || isReplicating) {
            const shake = 2;
            ctx.translate(this.x + (Math.random()-0.5)*shake, this.y + (Math.random()-0.5)*shake);
            if (this.state === 'warnDash') {
                ctx.scale(0.95, 0.95);
                if (player) {
                    const angle = Math.atan2(player.y - this.y, player.x - this.x);
                    ctx.save();
                    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
                    ctx.lineWidth = 60; 
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(angle) * 800, Math.sin(angle) * 800);
                    ctx.stroke();
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
                    ctx.setLineDash([10, 10]);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        } else {
            ctx.translate(this.x, this.y);
        }
        
        if (this.type === 'orc' && this.spawnTimer > 0) {
            ctx.globalAlpha = 0.5;
        }

        if (this.state === 'exhausted') {
             const scale = 1 + Math.sin(Date.now() / 200) * 0.05;
             ctx.scale(scale, scale);
        }

        ctx.save();

        if (this.type === 'boss' && player) {
            ctx.rotate(this.pulsePhase * 0.05); 
            ctx.shadowBlur = 30; ctx.shadowColor = '#7f1d1d';
            
            let eyeColor = '#b91c1c'; 
            if (this.state === 'warnShoot') eyeColor = '#fbbf24'; 
            if (this.state === 'warnDash') eyeColor = '#3b82f6'; 
            if (this.state === 'warnSpiral') eyeColor = '#a855f7'; 
            if (this.state === 'warnBurst') eyeColor = '#f97316'; 
            if (this.state === 'warnSpin') eyeColor = '#10b981';

            const fillColor = this.state === 'exhausted' ? '#5a3a3a' : '#2a0a0a';
            const strokeColor = this.state === 'exhausted' ? '#885555' : '#dc2626';

            const numSpikes = 12;
            ctx.fillStyle = fillColor;
            ctx.beginPath();
            for(let i=0; i<numSpikes * 2; i++) {
                const angle = (Math.PI * i / numSpikes);
                const r = i%2===0 ? this.radius * 1.3 : this.radius * 0.9;
                const pulse = Math.sin(this.pulsePhase * 2 + i) * 8;
                ctx.lineTo(Math.cos(angle)*(r+pulse), Math.sin(angle)*(r+pulse));
            }
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = strokeColor; ctx.lineWidth = 2; ctx.stroke();
            
            ctx.fillStyle = '#1a0505';
            ctx.beginPath(); ctx.arc(0,0, this.radius * 0.8, 0, Math.PI*2); ctx.fill();

            if (this.hitFlashTimer > 0) {
                 ctx.globalCompositeOperation = 'source-atop';
                 ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                 ctx.beginPath(); ctx.arc(0,0, this.radius*1.3, 0, Math.PI*2); ctx.fill();
                 ctx.globalCompositeOperation = 'source-over';
            }

            ctx.rotate(-this.pulsePhase * 0.05); 
            const eyeRad = this.radius * 0.55;
            
            if (this.state === 'exhausted') {
                 ctx.fillStyle = '#3a1a1a';
                 ctx.beginPath(); ctx.arc(0,0, eyeRad, 0, Math.PI*2); ctx.fill();
                 ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
                 ctx.beginPath(); ctx.moveTo(-eyeRad, 0); ctx.quadraticCurveTo(0, eyeRad*0.5, eyeRad, 0); ctx.stroke();
            } else {
                ctx.fillStyle = '#fef3c7';
                ctx.beginPath(); ctx.arc(0,0, eyeRad, 0, Math.PI*2); ctx.fill();

                const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
                const pupilOffset = eyeRad * 0.45;
                const pX = Math.cos(angleToPlayer) * pupilOffset;
                const pY = Math.sin(angleToPlayer) * pupilOffset;

                ctx.fillStyle = eyeColor;
                ctx.beginPath(); ctx.arc(pX, pY, eyeRad * 0.55, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.ellipse(pX, pY, eyeRad * 0.15, eyeRad * 0.4, angleToPlayer, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(pX - 6, pY - 6, 6, 0, Math.PI*2); ctx.fill();
            }
            ctx.shadowBlur = 0;

        } else if (this.type === 'kamikaze') {
            if (this.state === 'exploding') {
                 const progress = 1 - (this.timer / 45); 
                 const r = 20 + progress * 140; 
                 ctx.fillStyle = `rgba(255, 69, 0, ${this.timer/45})`;
                 ctx.beginPath(); ctx.arc(0,0, r, 0, Math.PI*2); ctx.fill();
            } else {
                const pulsing = 1 + Math.sin(this.pulsePhase * 10) * 0.1;
                ctx.scale(pulsing, pulsing);
                ctx.fillStyle = '#7c2d12'; 
                ctx.beginPath(); ctx.arc(0,0, this.radius, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#f97316';
                for(let i=0; i<8; i++) {
                    ctx.rotate(Math.PI/4);
                    ctx.beginPath(); ctx.moveTo(this.radius, -4); ctx.lineTo(this.radius+10, 0); ctx.lineTo(this.radius, 4); ctx.fill();
                }
                const coreColor = this.state === 'priming' ? '#fff' : '#ef4444';
                ctx.fillStyle = coreColor;
                ctx.shadowBlur = 10; ctx.shadowColor = coreColor;
                ctx.beginPath(); ctx.arc(0,0, this.radius*0.4, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0;
            }

        } else if (this.type === 'slime') {
            const angle = Math.atan2(player?.y! - this.y, player?.x! - this.x);
            ctx.rotate(angle);
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            const deform = Math.sin(Date.now() / 200 + this.x) * 2;
            ctx.ellipse(0, 0, this.radius + deform, this.radius - deform, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fca5a5';
            ctx.beginPath(); ctx.arc(this.radius*0.3, -this.radius*0.2, 4, 0, Math.PI*2); ctx.fill();

        } else if (this.type === 'goblin') {
            const angle = Math.atan2(player?.y! - this.y, player?.x! - this.x);
            ctx.rotate(angle);
            ctx.fillStyle = '#065f46'; 
            ctx.beginPath();
            ctx.moveTo(this.radius, 0);
            ctx.lineTo(-this.radius * 0.5, this.radius * 0.8);
            ctx.lineTo(-this.radius, 0);
            ctx.lineTo(-this.radius * 0.5, -this.radius * 0.8);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#10b981'; 
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#a7f3d0';
            ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();

        } else if (this.type === 'orc') {
            const angle = Math.atan2(player?.y! - this.y, player?.x! - this.x);
            ctx.rotate(angle);
            
            if (isReplicating) {
                const flash = Math.sin(Date.now() / 50);
                ctx.fillStyle = flash > 0 ? '#e879f9' : '#86198f';
            } else {
                ctx.fillStyle = '#86198f'; 
            }
            
            const pulses = 6;
            ctx.beginPath();
            for(let i=0; i<pulses * 2; i++) {
                let r = i%2===0 ? this.radius : this.radius * 0.7;
                if (isReplicating) {
                     r += Math.sin(this.pulsePhase * 10 + i) * 3;
                }
                const a = (Math.PI * i / pulses);
                ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#d8b4fe';
            ctx.beginPath(); ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI*2); ctx.fill();
            
        } else if (this.type === 'gravity') {
             ctx.rotate(this.pulsePhase);
             ctx.fillStyle = '#312e81';
             ctx.beginPath(); ctx.arc(0,0, this.radius, 0, Math.PI*2); ctx.fill();
             ctx.strokeStyle = '#818cf8'; ctx.lineWidth = 2;
             ctx.beginPath(); ctx.arc(0,0, this.radius * 0.7, 0, Math.PI*2); ctx.stroke();
             ctx.fillStyle = '#4f46e5';
             ctx.beginPath(); ctx.arc(this.radius*0.6, 0, 4, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.arc(-this.radius*0.6, 0, 4, 0, Math.PI*2); ctx.fill();
             ctx.globalAlpha = 0.2 + Math.sin(this.pulsePhase*2)*0.1;
             ctx.fillStyle = '#6366f1';
             ctx.beginPath(); ctx.arc(0,0, 180, 0, Math.PI*2); ctx.fill();
             ctx.globalAlpha = 1.0;

        } else if (this.type === 'golem') {
            ctx.rotate(this.pulsePhase * 0.5);
            ctx.fillStyle = '#4b5563';
            ctx.beginPath();
            ctx.moveTo(this.radius, 0);
            ctx.lineTo(this.radius*0.5, this.radius*0.8);
            ctx.lineTo(-this.radius*0.5, this.radius*0.6);
            ctx.lineTo(-this.radius, 0);
            ctx.lineTo(-this.radius*0.4, -this.radius*0.8);
            ctx.lineTo(this.radius*0.5, -this.radius*0.6);
            ctx.fill();
            ctx.fillStyle = '#9ca3af'; 
            ctx.beginPath(); ctx.arc(0,0, this.radius*0.4, 0, Math.PI*2); ctx.fill();

        } else if (this.type === 'elite') {
             ctx.rotate(this.visualAngle);
             const spikes = 6;
             ctx.shadowBlur = 15; ctx.shadowColor = '#facc15';
             ctx.fillStyle = '#eab308';
             ctx.beginPath();
             for(let i=0; i<spikes*2; i++){
                const r = i%2===0 ? this.radius*1.2 : this.radius*0.7; 
                const a = (Math.PI*i/spikes);
                ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
             }
             ctx.fill();
             ctx.shadowBlur = 0;
             ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.fill();
        }
        
        ctx.restore(); 
        
        if (this.hp < this.maxHp && this.type !== 'kamikaze' && this.type !== 'boss' && this.type !== 'elite') {
             const barW = this.radius * 2;
             const yOffset = -this.radius - 12;
             ctx.fillStyle = '#1f2937'; ctx.fillRect(-barW/2, yOffset, barW, 4);
             ctx.fillStyle = '#ef4444'; ctx.fillRect(-barW/2, yOffset, barW * (Math.max(0,this.hp)/this.maxHp), 4);
        }
        
        ctx.restore();
    }
}

export abstract class Weapon {
    id: string; owner: Player; level: number;
    constructor(owner: Player, level: number) { this.owner = owner; this.level = level; this.id = ''; }
    abstract upgrade(): void;
    abstract update(dt: number, ctx: IGameContext): void;
    abstract draw(ctx: CanvasRenderingContext2D): void;
}

export class PulseLaser extends Weapon {
    attackRange = 90; attackWidth = 20; cooldown = 90; 
    attackTimer = 0; isAttacking = false; duration = 15;
    attackDir: 'left'|'right' = 'right';
    constructor(owner: Player, level: number) { super(owner, level); this.id = 'pulse'; }
    upgrade() { 
        this.level++; 
        if (this.level === 3) {
            this.attackWidth += 10;
        } else if (this.level >= 4) {
            this.attackRange += 20;
            this.attackWidth += 5;
        }
    }
    update(dt: number, ctx: IGameContext) {
        this.attackTimer = Math.max(0, this.attackTimer - dt); 
        
        if (this.isAttacking) {
            this.duration -= dt; if (this.duration <= 0) this.isAttacking = false;
        } else if (this.attackTimer <= 0) {
            this.isAttacking = true; this.duration = 15; 
            this.attackTimer = this.cooldown * this.owner.weaponCooldownMult;
            
            this.attackDir = this.owner.visualAngle > Math.PI/2 || this.owner.visualAngle < -Math.PI/2 ? 'left' : 'right';
            let damage = 5 + this.level * 2.5;
            if (this.level >= 5) damage += (this.level - 4) * 8; // Extra +8 per level after lvl 4 (lvl 5+)

            const checkHit = (dir: 'left'|'right') => {
                 const cx = dir === 'right' ? this.owner.x + this.attackRange/2 : this.owner.x - this.attackRange/2;
                 const cy = this.owner.y;
                 const hitH = this.attackWidth + 20; 
                 const hitW = this.attackRange;

                 ctx.enemies.forEach(e => {
                     if (e.x + e.radius > cx - hitW/2 && 
                         e.x - e.radius < cx + hitW/2 && 
                         e.y + e.radius > cy - hitH/2 && 
                         e.y - e.radius < cy + hitH/2) {
                             e.takeDamage(damage, ctx);
                         }
                 });
            };
            checkHit(this.attackDir);
            if (this.level >= 2) checkHit(this.attackDir === 'right' ? 'left' : 'right');
            soundManager.playShoot();
        }
    }
    draw(ctx: CanvasRenderingContext2D) {
        if (!this.isAttacking) return;
        ctx.globalAlpha = this.duration / 15;
        const drawBeam = (dir: 'left'|'right') => {
            const startX = this.owner.x;
            const endX = dir === 'right' ? startX + this.attackRange : startX - this.attackRange;
            ctx.shadowBlur = 15; ctx.shadowColor = '#3b82f6';
            ctx.lineWidth = this.attackWidth; ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)'; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(startX, this.owner.y); ctx.lineTo(endX, this.owner.y); ctx.stroke();
            ctx.shadowBlur = 5; ctx.shadowColor = '#60a5fa';
            ctx.lineWidth = this.attackWidth * 0.4; ctx.strokeStyle = '#bfdbfe';
            ctx.beginPath(); ctx.moveTo(startX, this.owner.y); ctx.lineTo(endX, this.owner.y); ctx.stroke();
            ctx.shadowBlur = 0; ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff';
            ctx.beginPath(); ctx.moveTo(startX, this.owner.y); ctx.lineTo(endX, this.owner.y); ctx.stroke();
        };
        drawBeam(this.attackDir);
        if (this.level >= 2) drawBeam(this.attackDir === 'right' ? 'left' : 'right');
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }
}

export class Missile extends Weapon {
    projectiles = 1; radius = 60; angle = 0; 
    hitCooldowns = new Map<Enemy, number>();
    constructor(owner: Player, level: number) { super(owner, level); this.id = 'missile'; }
    upgrade() { this.level++; this.projectiles++; this.radius += 10; }
    update(dt: number, ctx: IGameContext) {
        this.angle += 0.05 * dt;
        this.hitCooldowns.forEach((val, key) => {
            if (val > 0) this.hitCooldowns.set(key, val - dt);
            else this.hitCooldowns.delete(key);
        });

        for(let i=0; i<this.projectiles; i++) {
            const a = this.angle + (Math.PI*2/this.projectiles)*i;
            const mx = this.owner.x + Math.cos(a)*this.radius;
            const my = this.owner.y + Math.sin(a)*this.radius;
            
            ctx.enemies.forEach(e => { 
                if (Math.hypot(mx - e.x, my - e.y) < 20 + e.radius) {
                    if (!this.hitCooldowns.has(e)) { 
                        const dmg = 3 + this.level * 0.8;
                        e.takeDamage(dmg, ctx);
                        this.hitCooldowns.set(e, 30);
                    }
                }
            });
        }
    }
    draw(ctx: CanvasRenderingContext2D) {
        for(let i=0; i<this.projectiles; i++) {
            const a = this.angle + (Math.PI*2/this.projectiles)*i;
            const mx = this.owner.x + Math.cos(a)*this.radius;
            const my = this.owner.y + Math.sin(a)*this.radius;
            
            ctx.save(); ctx.translate(mx, my); ctx.rotate(a + Math.PI/2);
            
            ctx.shadowBlur = 10; ctx.shadowColor = '#22d3ee';
            
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath(); 
            ctx.moveTo(0, -12); 
            ctx.lineTo(8, 6); 
            ctx.lineTo(0, 4); 
            ctx.lineTo(-8, 6); 
            ctx.fill();
            
            ctx.fillStyle = '#cffafe';
            ctx.beginPath();
            ctx.moveTo(0, -8);
            ctx.lineTo(3, 2);
            ctx.lineTo(0, 0);
            ctx.lineTo(-3, 2);
            ctx.fill();
            
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }
}

export class HolyAura extends Weapon {
    radius = 80; damage = 1; cooldown = 30; timer = 0;
    constructor(owner: Player, level: number) { super(owner, level); this.id = 'aura'; }
    upgrade() { this.level++; this.radius += 10; this.damage += 0.1; }
    update(dt: number, ctx: IGameContext) {
        this.timer -= dt;
        if (this.timer <= 0) {
            this.timer = this.cooldown * this.owner.weaponCooldownMult;
            ctx.enemies.forEach(e => {
                if (Math.hypot(this.owner.x - e.x, this.owner.y - e.y) < this.radius + e.radius) {
                    e.takeDamage(this.damage, ctx);
                }
            });
        }
    }
    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = 'rgba(253, 224, 71, 0.1)';
        ctx.beginPath(); ctx.arc(this.owner.x, this.owner.y, this.radius, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.3)';
        ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(this.owner.x, this.owner.y, this.radius, 0, Math.PI*2); ctx.stroke();
    }
}

export class Lightning extends Weapon {
    cooldown = 200; timer = 0; damage = 6;
    targets: {x:number, y:number, life:number}[] = [];
    constructor(owner: Player, level: number) { super(owner, level); this.id = 'lightning'; }
    upgrade() { this.level++; this.damage += 2; this.cooldown *= 0.9; }
    update(dt: number, ctx: IGameContext) {
        this.timer -= dt;
        for(let i=this.targets.length-1; i>=0; i--) {
            this.targets[i].life -= dt;
            if (this.targets[i].life <= 0) this.targets.splice(i,1);
        }
        
        if (this.timer <= 0) {
            this.timer = this.cooldown * this.owner.weaponCooldownMult;
            const count = 1 + Math.floor(this.level/2);
            const pool = [...ctx.enemies];
            for(let i=0; i<count; i++) {
                if (pool.length === 0) break;
                const idx = Math.floor(Math.random()*pool.length);
                const e = pool[idx];
                e.takeDamage(this.damage, ctx);
                this.targets.push({x: e.x, y: e.y, life: 20});
                pool.splice(idx, 1);
                soundManager.playLightning();
            }
        }
    }
    draw(ctx: CanvasRenderingContext2D) {
        ctx.shadowBlur = 10; ctx.shadowColor = '#facc15';
        ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 3;
        this.targets.forEach(t => {
            ctx.globalAlpha = t.life / 20;
            ctx.beginPath();
            ctx.moveTo(t.x, 0); 
            let cy = 0; let cx = t.x;
            while(cy < t.y) {
                cy += 20;
                cx += (Math.random()-0.5)*30;
                ctx.lineTo(cx, cy);
            }
            ctx.lineTo(t.x, t.y);
            ctx.stroke();
        });
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }
}

export class LaserCannon extends Weapon {
    cooldown = 180; timer = 0; damage = 2.5;
    constructor(owner: Player, level: number) { super(owner, level); this.id = 'laser'; }
    upgrade() { this.level++; this.damage += 1; this.cooldown *= 0.9; }
    update(dt: number, ctx: IGameContext) {
        this.timer -= dt;
        if (this.timer <= 0) {
            this.timer = this.cooldown * this.owner.weaponCooldownMult;
            const count = this.level + 1; // Start with 2
            const spread = 0.2;
            const baseAngle = this.owner.visualAngle;
            
            for(let i=0; i<count; i++) {
                const angle = baseAngle - (count-1)*spread/2 + i*spread;
                ctx.addProjectile(new Projectile(this.owner.x, this.owner.y, Math.cos(angle)*8, Math.sin(angle)*8, this.damage, true, true));
            }
            soundManager.playShoot();
        }
    }
    draw(ctx: CanvasRenderingContext2D) {}
}

export class ScorchingTrail extends Weapon {
    timer = 0; lastX = 0; lastY = 0;
    duration = 100;
    particles: {x:number, y:number, life:number}[] = [];
    constructor(owner: Player, level: number) { 
        super(owner, level); 
        this.id = 'trail'; 
        this.lastX = owner.x; this.lastY = owner.y;
    }
    upgrade() { this.level++; this.duration += 20; } 
    update(dt: number, ctx: IGameContext) {
        const dist = Math.hypot(this.owner.x - this.lastX, this.owner.y - this.lastY);
        if (dist > 20) {
            this.particles.push({x: this.owner.x, y: this.owner.y, life: this.duration});
            this.lastX = this.owner.x; this.lastY = this.owner.y;
        }
        
        for(let i=this.particles.length-1; i>=0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) { this.particles.splice(i, 1); continue; }
            
            if (p.life % 10 < dt) {
                ctx.enemies.forEach(e => {
                    if (Math.hypot(e.x - p.x, e.y - p.y) < 25 + e.radius) {
                        e.takeDamage(0.5 + this.level * 0.5, ctx);
                    }
                });
            }
        }
    }
    draw(ctx: CanvasRenderingContext2D) {
        this.particles.forEach(p => {
             const alpha = Math.min(0.3, p.life / 100); 
             ctx.globalAlpha = alpha;
             ctx.fillStyle = '#f97316';
             ctx.beginPath(); ctx.arc(p.x, p.y, 20, 0, Math.PI*2); ctx.fill();
             ctx.fillStyle = '#fdba74';
             ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI*2); ctx.fill();
        });
        ctx.globalAlpha = 1;
    }
}

export class DashExplosion extends Weapon {
    radius = 125; damage = 15; // Base damage 15, Radius 125
    constructor(owner: Player, level: number) { super(owner, level); this.id = 'dash_exp'; }
    upgrade() { this.level++; this.radius += 10; this.damage += 3; } // +3 scaling
    update(dt: number, ctx: IGameContext) {
        if (this.owner.dashTriggered) {
             const delay = 30; 
             const p = new Projectile(this.owner.x, this.owner.y, 0, 0, this.damage, true, false, true, 20, delay);
             p.radius = this.radius; // Set explosion radius
             ctx.addProjectile(p);
        }
    }
    draw(ctx: CanvasRenderingContext2D) {}
}

export class Player {
    x: number; y: number; hp: number; maxHp: number;
    speed: number; xp: number = 0; xpToNext: number = 5; level: number = 1;
    radius: number = 18;
    color: string = '#3b82f6';
    
    weapons: Weapon[] = [];
    weaponCooldownMult: number = 1.0;
    
    visualAngle: number = 0;
    
    isDashing: boolean = false;
    dashCd: number = 0;
    dashMaxCd: number = 90; // Reduced from 180 to 90
    dashTimer: number = 0;
    dashVec = {x:0, y:0};
    invincibleTimer: number = 0;
    
    dashTriggered: boolean = false; 
    pickupRange: number = 100;

    constructor(x: number, y: number, upgrades: Record<string, number>) {
        this.x = x; this.y = y;
        this.maxHp = 5 + (upgrades['base_hp'] || 0);
        this.hp = this.maxHp;
        this.speed = 1.8 * (1 + (upgrades['base_speed'] || 0) * 0.05);
        this.pickupRange = 100 * (1 + (upgrades['base_pickup'] || 0) * 0.3);
        
        const cdLvl = upgrades['cooldown_multi'] || 0;
        this.weaponCooldownMult = Math.pow(0.90, cdLvl); // 10% reduction base
        
        if (upgrades['start_missile']) this.addWeapon(new Missile(this, upgrades['start_missile']));
        if (upgrades['start_aura']) this.addWeapon(new HolyAura(this, upgrades['start_aura']));
        if (upgrades['start_lightning']) this.addWeapon(new Lightning(this, upgrades['start_lightning']));
        if (upgrades['start_laser']) this.addWeapon(new LaserCannon(this, upgrades['start_laser']));
        if (upgrades['start_trail']) this.addWeapon(new ScorchingTrail(this, upgrades['start_trail']));
        if (upgrades['start_dash_exp']) this.addWeapon(new DashExplosion(this, upgrades['start_dash_exp']));
        
        const whipLvl = upgrades['start_whip_lv2'] ? 2 : 1;
        this.addWeapon(new PulseLaser(this, whipLvl));
    }
    
    addWeapon(w: Weapon) {
        const existing = this.weapons.find(wp => wp.id === w.id);
        if (existing) existing.upgrade();
        else this.weapons.push(w);
    }
    
    update(dt: number, input: {x:number, y:number}, ctx: IGameContext) {
        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
        if (this.dashCd > 0) this.dashCd -= dt;
        
        let gravityFactor = 1.0;
        const nearGravity = ctx.enemies.some(e => e.type === 'gravity' && Math.hypot(this.x - e.x, this.y - e.y) < 180);
        if (nearGravity) gravityFactor = 0.4;

        if (this.isDashing) {
             this.dashTimer -= dt;
             this.x += this.dashVec.x * this.speed * 4 * dt;
             this.y += this.dashVec.y * this.speed * 4 * dt;
             
             ctx.enemies.forEach(e => {
                 if (Math.hypot(this.x - e.x, this.y - e.y) < this.radius + e.radius + 10) {
                     e.takeDamage(1, ctx);
                 }
             });

             if (this.dashTimer <= 0) this.isDashing = false;
        } else {
             if (input.x !== 0 || input.y !== 0) {
                 this.visualAngle = Math.atan2(input.y, input.x);
                 const len = Math.hypot(input.x, input.y);
                 const nx = input.x / (len || 1); 
                 const ny = input.y / (len || 1);
                 
                 this.x += nx * this.speed * gravityFactor * dt;
                 this.y += ny * this.speed * gravityFactor * dt;
             }
        }
        
        this.x = Math.max(this.radius, Math.min(ctx.width-this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(ctx.height-this.radius, this.y));
        
        this.weapons.forEach(w => w.update(dt, ctx));
        
        this.dashTriggered = false; 
    }
    
    dash(dx: number, dy: number) {
        if (this.dashCd <= 0 && !this.isDashing) {
            this.isDashing = true;
            this.dashCd = this.dashMaxCd * this.weaponCooldownMult;
            this.dashTimer = 15; 
            this.invincibleTimer = 20;
            
            if (dx === 0 && dy === 0) {
                this.dashVec = { x: Math.cos(this.visualAngle), y: Math.sin(this.visualAngle) };
            } else {
                const len = Math.hypot(dx, dy);
                this.dashVec = { x: dx/len, y: dy/len };
            }
            this.dashTriggered = true;
            soundManager.playDash();
        }
    }
    
    takeDamage(amount: number) {
        if (this.invincibleTimer > 0) return;
        this.hp -= amount;
        this.invincibleTimer = 60;
        soundManager.playPlayerHit();
        if (this.hp <= 0) soundManager.playPlayerDeath();
    }
    
    heal(amount: number) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
    }
    
    increaseMaxHp(amount: number) {
        this.maxHp += amount;
        this.hp += amount; 
    }
    
    gainXP(amount: number): boolean {
        this.xp += amount;
        if (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level++;
            
            if (this.level >= 20) {
                this.xpToNext = Math.floor(this.xpToNext * 1.8);
            } else if (this.level >= 5) {
                this.xpToNext = Math.floor(this.xpToNext * 1.4);
            } else {
                this.xpToNext = Math.floor(this.xpToNext * 1.2);
            }
            
            soundManager.playLevelUp();
            return true;
        }
        return false;
    }
    
    draw(ctx: CanvasRenderingContext2D) {
        this.weapons.forEach(w => w.draw(ctx));

        ctx.save(); ctx.translate(this.x, this.y);
        
        if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer/5)%2===0) {
             ctx.globalAlpha = 0.5;
        }
        
        const totalMaxCd = this.dashMaxCd * this.weaponCooldownMult;
        if (this.dashCd > 0) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 10, -Math.PI/2, -Math.PI/2 + (Math.PI*2 * (this.dashCd/totalMaxCd)));
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.rotate(this.visualAngle);
        
        ctx.shadowBlur = 10; ctx.shadowColor = this.color;
        
        ctx.fillStyle = this.isDashing ? '#fbbf24' : '#3b82f6';
        ctx.beginPath();
        ctx.moveTo(15, 0); 
        ctx.lineTo(-10, 12); 
        ctx.lineTo(-5, 0); 
        ctx.lineTo(-10, -12);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#cffafe';
        ctx.beginPath();
        ctx.ellipse(2, 0, 6, 3, 0, 0, Math.PI*2);
        ctx.fill();
        
        if (!this.isDashing) {
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.moveTo(-5, 2); ctx.lineTo(-12, 0); ctx.lineTo(-5, -2);
            ctx.fill();
        } else {
            ctx.fillStyle = '#ef4444';
            ctx.shadowBlur = 20; ctx.shadowColor = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(-5, 4); ctx.lineTo(-20, 0); ctx.lineTo(-5, -4);
            ctx.fill();
        }

        ctx.restore();
    }
}