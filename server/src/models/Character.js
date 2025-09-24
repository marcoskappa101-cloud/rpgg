const db = require('../config/database');
const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');

class Character {
  // Criar novo personagem
  static async create(accountId, name, characterClass, race) {
    try {
      // Validar entrada
      if (!Helpers.isValidCharacterName(name)) {
        throw new Error('Nome de personagem inválido. Use apenas letras, números e underscore (3-20 caracteres)');
      }

      // Verificar se o nome já existe
      const existingCharacter = await Character.findByName(name);
      if (existingCharacter) {
        throw new Error('Nome de personagem já existe');
      }

      // Verificar se a classe é válida
      const validClasses = ['warrior', 'mage', 'archer', 'rogue', 'cleric'];
      if (!validClasses.includes(characterClass)) {
        throw new Error('Classe inválida');
      }

      // Verificar se a raça é válida
      const validRaces = ['human', 'elf', 'dark_elf', 'orc', 'dwarf'];
      if (!validRaces.includes(race)) {
        throw new Error('Raça inválida');
      }

      // Definir stats iniciais baseados na classe e raça
      const baseStats = this.getBaseStats(characterClass, race);
      
      const result = await db.query(
        `INSERT INTO characters 
        (account_id, name, class, race, str, dex, vit, \`int\`, luk, hp, max_hp, mp, max_mp) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [accountId, Helpers.sanitizeInput(name), characterClass, race, 
         baseStats.str, baseStats.dex, baseStats.vit, baseStats.int, baseStats.luk,
         baseStats.hp, baseStats.hp, baseStats.mp, baseStats.mp]
      );
      
      return result.insertId;
    } catch (error) {
      logger.error('Erro ao criar personagem:', error.message);
      throw error;
    }
  }

  // Buscar personagens por conta
  static async findByAccountId(accountId) {
    try {
      const rows = await db.query(
        'SELECT * FROM characters WHERE account_id = ?',
        [accountId]
      );
      return rows;
    } catch (error) {
      logger.error('Erro ao buscar personagens:', error.message);
      throw error;
    }
  }

  // Buscar personagem por ID
  static async findById(characterId) {
    try {
      const rows = await db.query(
        'SELECT * FROM characters WHERE id = ?',
        [characterId]
      );
      return rows[0] || null;
    } catch (error) {
      logger.error('Erro ao buscar personagem por ID:', error.message);
      throw error;
    }
  }

  // Buscar personagem por nome
  static async findByName(name) {
    try {
      const rows = await db.query(
        'SELECT * FROM characters WHERE name = ?',
        [Helpers.sanitizeInput(name)]
      );
      return rows[0] || null;
    } catch (error) {
      logger.error('Erro ao buscar personagem por nome:', error.message);
      throw error;
    }
  }

  // Atualizar posição do personagem
  static async updatePosition(characterId, posX, posY, posZ, map) {
    try {
      await db.query(
        'UPDATE characters SET pos_x = ?, pos_y = ?, pos_z = ?, map = ? WHERE id = ?',
        [posX, posY, posZ, map, characterId]
      );
    } catch (error) {
      logger.error('Erro ao atualizar posição:', error.message);
      throw error;
    }
  }

  // Atualizar status do personagem (HP, MP, etc.)
  static async updateStats(characterId, stats) {
    try {
      const updates = [];
      const values = [];
      
      for (const [key, value] of Object.entries(stats)) {
        // Se for a coluna 'int', usar crases
        const columnName = key === 'int' ? '`int`' : key;
        updates.push(`${columnName} = ?`);
        values.push(value);
      }
      
      values.push(characterId);
      
      await db.query(
        `UPDATE characters SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    } catch (error) {
      logger.error('Erro ao atualizar stats:', error.message);
      throw error;
    }
  }

  // Atualizar último acesso do personagem
  static async updateLastPlayed(characterId) {
    try {
      await db.query(
        'UPDATE characters SET last_played = NOW() WHERE id = ?',
        [characterId]
      );
    } catch (error) {
      logger.error('Erro ao atualizar último acesso do personagem:', error.message);
      throw error;
    }
  }

  // Adicionar experiência ao personagem
  static async addExperience(characterId, exp) {
    try {
      await db.query(
        'UPDATE characters SET exp = exp + ? WHERE id = ?',
        [exp, characterId]
      );
      
      // Verificar se subiu de nível
      const character = await this.findById(characterId);
      const expForNextLevel = this.calculateExpForLevel(character.level + 1);
      
      if (character.exp >= expForNextLevel) {
        await this.levelUp(characterId);
        return true; // Nível aumentou
      }
      
      return false; // Nível não aumentou
    } catch (error) {
      logger.error('Erro ao adicionar experiência:', error.message);
      throw error;
    }
  }

  // Aumentar nível do personagem
  static async levelUp(characterId) {
    try {
      const character = await this.findById(characterId);
      const newLevel = character.level + 1;
      
      // Calcular aumento de stats baseado na classe
      const statIncrease = this.getStatIncrease(character.class);
      
      await db.query(
        `UPDATE characters SET 
        level = ?, 
        str = str + ?, 
        dex = dex + ?, 
        vit = vit + ?, 
        \`int\` = \`int\` + ?, 
        luk = luk + ?,
        max_hp = max_hp + ?,
        max_mp = max_mp + ?,
        hp = max_hp,
        mp = max_mp
        WHERE id = ?`,
        [
          newLevel,
          statIncrease.str,
          statIncrease.dex,
          statIncrease.vit,
          statIncrease.int,
          statIncrease.luk,
          statIncrease.hp,
          statIncrease.mp,
          characterId
        ]
      );
      
      return newLevel;
    } catch (error) {
      logger.error('Erro ao aumentar nível:', error.message);
      throw error;
    }
  }

  // Calcular experiência necessária para um nível
  static calculateExpForLevel(level) {
    return Math.floor(100 * Math.pow(level, 2));
  }

  // Obter stats base baseados na classe e raça
  static getBaseStats(characterClass, race) {
    const baseStats = {
      warrior: { str: 15, dex: 10, vit: 13, int: 8, luk: 9, hp: 120, mp: 30 },
      mage: { str: 8, dex: 10, vit: 9, int: 15, luk: 13, hp: 80, mp: 100 },
      archer: { str: 10, dex: 15, vit: 10, int: 9, luk: 11, hp: 90, mp: 50 },
      rogue: { str: 11, dex: 15, vit: 10, int: 8, luk: 11, hp: 85, mp: 45 },
      cleric: { str: 10, dex: 9, vit: 12, int: 13, luk: 11, hp: 100, mp: 80 }
    };
    
    const raceModifiers = {
      human: { str: 1, dex: 1, vit: 1, int: 1, luk: 1 },
      elf: { str: 0, dex: 2, vit: 0, int: 2, luk: 1 },
      dark_elf: { str: 1, dex: 2, vit: 0, int: 1, luk: 1 },
      orc: { str: 2, dex: 0, vit: 2, int: -1, luk: 0 },
      dwarf: { str: 2, dex: 0, vit: 2, int: 0, luk: 0 }
    };
    
    const stats = baseStats[characterClass];
    const modifier = raceModifiers[race];
    
    return {
      str: stats.str + modifier.str,
      dex: stats.dex + modifier.dex,
      vit: stats.vit + modifier.vit,
      int: stats.int + modifier.int,
      luk: stats.luk + modifier.luk,
      hp: stats.hp + (modifier.vit * 5),
      mp: stats.mp + (modifier.int * 3)
    };
  }

  // Obter aumento de stats ao subir de nível
  static getStatIncrease(characterClass) {
    const increases = {
      warrior: { str: 3, dex: 1, vit: 2, int: 0, luk: 1, hp: 20, mp: 5 },
      mage: { str: 0, dex: 1, vit: 1, int: 3, luk: 2, hp: 10, mp: 25 },
      archer: { str: 1, dex: 3, vit: 1, int: 1, luk: 1, hp: 15, mp: 10 },
      rogue: { str: 1, dex: 3, vit: 1, int: 0, luk: 2, hp: 12, mp: 8 },
      cleric: { str: 1, dex: 1, vit: 2, int: 2, luk: 1, hp: 18, mp: 15 }
    };
    
    return increases[characterClass];
  }
}

module.exports = Character;