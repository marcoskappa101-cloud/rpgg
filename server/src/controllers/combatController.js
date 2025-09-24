const Character = require('../models/Character');
const Monster = require('../models/Monster');
const logger = require('../utils/logger');

class CombatController {
  // Calcular dano do ataque
	static calculateDamage(attacker, target, isCritical = false) {
	let baseDamage = 0;
	let isPhysical = true;
  
  // Determinar tipo de ataque baseado na classe
	if (attacker.class === 'mage' || attacker.class === 'cleric') {
		isPhysical = false;
		baseDamage = attacker.int * 2;  // Note attacker.int (agora virá do banco como 'int')
	} else {
    baseDamage = attacker.str * 2;
	}
    // Calcular defesa do alvo
    let defense = target.def || 0;
    
    // Aplicar dano crítico
    if (isCritical) {
      baseDamage *= 1.5;
    }
    
    // Calcular dano final
    let finalDamage = Math.max(1, baseDamage - defense);
    
    // Aplicar variação de 10%
    const variation = 0.9 + (Math.random() * 0.2);
    finalDamage = Math.floor(finalDamage * variation);
    
    return finalDamage;
  }

  // Calcular chance de crítico
  static calculateCriticalChance(attacker) {
    const baseChance = 0.05; // 5% base
    const lukBonus = attacker.luk * 0.005; // 0.5% por ponto de LUK
    return Math.min(0.3, baseChance + lukBonus); // Máximo de 30%
  }

  // Calcular chance de acerto
  static calculateHitChance(attacker, target) {
    const baseChance = 0.8; // 80% base
    const dexBonus = attacker.dex * 0.01; // 1% por ponto de DEX
    return Math.min(0.95, baseChance + dexBonus); // Máximo de 95%
  }

  // Ataque a um monstro
  static async attackMonster(characterId, monsterId) {
    try {
      const character = await Character.findById(characterId);
      const monster = await Monster.findById(monsterId);
      
      if (!character || !monster) {
        throw new Error('Personagem ou monstro não encontrado');
      }
      
      // Verificar se o monstro está vivo
      if (monster.hp <= 0) {
        throw new Error('Monstro já está morto');
      }
      
      // Calcular chance de acerto
      const hitChance = this.calculateHitChance(character, monster);
      const didHit = Math.random() <= hitChance;
      
      if (!didHit) {
        return { 
          success: true, 
          result: 'miss', 
          damage: 0, 
          monsterHp: monster.hp 
        };
      }
      
      // Calcular chance de crítico
      const criticalChance = this.calculateCriticalChance(character);
      const isCritical = Math.random() <= criticalChance;
      
      // Calcular dano
      const damage = this.calculateDamage(character, monster, isCritical);
      
      // Aplicar dano ao monstro
      const newHp = Math.max(0, monster.hp - damage);
      await Monster.updateHp(monsterId, newHp);
      
      let result = 'hit';
      if (isCritical) result = 'critical';
      if (newHp <= 0) result = 'kill';
      
      // Se o monstro morreu, dar recompensas
      if (newHp <= 0) {
        await this.giveRewards(characterId, monster);
      }
      
      return { 
        success: true, 
        result, 
        damage, 
        monsterHp: newHp,
        isCritical 
      };
    } catch (error) {
      logger.error('Erro no ataque:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Dar recompensas por matar monstro
  static async giveRewards(characterId, monster) {
    try {
      // Dar experiência
      const leveledUp = await Character.addExperience(characterId, monster.exp);
      
      // Dar itens (drop)
      // Implementar lógica de drop aqui
      
      return { success: true, leveledUp };
    } catch (error) {
      logger.error('Erro ao dar recompensas:', error.message);
      throw error;
    }
  }
}

module.exports = CombatController;