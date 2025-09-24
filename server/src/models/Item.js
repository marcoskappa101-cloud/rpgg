const db = require('../config/database');
const logger = require('../utils/logger');

class Item {
  // Buscar todos os itens
  static async findAll() {
    try {
      const rows = await db.query('SELECT * FROM items');
      return rows;
    } catch (error) {
      logger.error('Erro ao buscar itens:', error.message);
      throw error;
    }
  }

  // Buscar item por ID
  static async findById(itemId) {
    try {
      const rows = await db.query(
        'SELECT * FROM items WHERE id = ?',
        [itemId]
      );
      return rows[0] || null;
    } catch (error) {
      logger.error('Erro ao buscar item por ID:', error.message);
      throw error;
    }
  }

  // Buscar itens por tipo
  static async findByType(type) {
    try {
      const rows = await db.query(
        'SELECT * FROM items WHERE type = ?',
        [type]
      );
      return rows;
    } catch (error) {
      logger.error('Erro ao buscar itens por tipo:', error.message);
      throw error;
    }
  }
}

module.exports = Item;