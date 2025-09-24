const db = require('../config/database');
const logger = require('../utils/logger');

class Monster {
  // Buscar todos os monstros
  static async findAll() {
    try {
      const rows = await db.query('SELECT * FROM monsters');
      return rows;
    } catch (error) {
      logger.error('Erro ao buscar monstros:', error.message);
      throw error;
    }
  }

  // Buscar monstro por ID
  static async findById(monsterId) {
    try {
      const rows = await db.query(
        'SELECT * FROM monsters WHERE id = ?',
        [monsterId]
      );
      return rows[0] || null;
    } catch (error) {
      logger.error('Erro ao buscar monstro por ID:', error.message);
      throw error;
    }
  }

  // Buscar monstros por mapa
  static async findByMap(map) {
    try {
      const rows = await db.query(
        'SELECT * FROM monsters WHERE map = ?',
        [map]
      );
      return rows;
    } catch (error) {
      logger.error('Erro ao buscar monstros por mapa:', error.message);
      throw error;
    }
  }

  // Atualizar HP do monstro
  static async updateHp(monsterId, hp) {
    try {
      await db.query(
        'UPDATE monsters SET hp = ? WHERE id = ?',
        [hp, monsterId]
      );
    } catch (error) {
      logger.error('Erro ao atualizar HP do monstro:', error.message);
      throw error;
    }
  }

  // Resetar monstro (após respawn)
  static async reset(monsterId) {
    try {
      const monster = await this.findById(monsterId);
      await db.query(
        'UPDATE monsters SET hp = max_hp WHERE id = ?',
        [monsterId]
      );
      return monster;
    } catch (error) {
      logger.error('Erro ao resetar monstro:', error.message);
      throw error;
    }
  }
}

module.exports = Monster;