const db = require('../config/database');
const logger = require('../utils/logger');

class InventoryController {
  // Buscar inventário do personagem
  static async getInventory(characterId) {
    try {
      const rows = await db.query(`
        SELECT i.*, inv.quantity, inv.equipped, inv.slot 
        FROM inventory inv 
        JOIN items i ON inv.item_id = i.id 
        WHERE inv.character_id = ?
      `, [characterId]);
      
      return { success: true, inventory: rows };
    } catch (error) {
      logger.error('Erro ao buscar inventário:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Adicionar item ao inventário
  static async addItem(characterId, itemId, quantity = 1) {
    try {
      // Verificar se o item já existe no inventário
      const existingItem = await db.query(
        'SELECT * FROM inventory WHERE character_id = ? AND item_id = ?',
        [characterId, itemId]
      );
      
      if (existingItem.length > 0) {
        // Atualizar quantidade
        await db.query(
          'UPDATE inventory SET quantity = quantity + ? WHERE character_id = ? AND item_id = ?',
          [quantity, characterId, itemId]
        );
      } else {
        // Adicionar novo item
        await db.query(
          'INSERT INTO inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
          [characterId, itemId, quantity]
        );
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Erro ao adicionar item:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Remover item do inventário
  static async removeItem(characterId, itemId, quantity = 1) {
    try {
      // Verificar se o item existe
      const existingItem = await db.query(
        'SELECT * FROM inventory WHERE character_id = ? AND item_id = ?',
        [characterId, itemId]
      );
      
      if (existingItem.length === 0) {
        throw new Error('Item não encontrado no inventário');
      }
      
      if (existingItem[0].quantity <= quantity) {
        // Remover completamente o item
        await db.query(
          'DELETE FROM inventory WHERE character_id = ? AND item_id = ?',
          [characterId, itemId]
        );
      } else {
        // Reduzir quantidade
        await db.query(
          'UPDATE inventory SET quantity = quantity - ? WHERE character_id = ? AND item_id = ?',
          [quantity, characterId, itemId]
        );
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Erro ao remover item:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Equipar item
  static async equipItem(characterId, itemId, slot) {
    try {
      // Verificar se o item existe
      const existingItem = await db.query(
        'SELECT * FROM inventory WHERE character_id = ? AND item_id = ?',
        [characterId, itemId]
      );
      
      if (existingItem.length === 0) {
        throw new Error('Item não encontrado no inventário');
      }
      
      // Verificar se é um item equipável
      const item = await db.query(
        'SELECT * FROM items WHERE id = ?',
        [itemId]
      );
      
      if (item.length === 0 || (item[0].type !== 'weapon' && item[0].type !== 'armor')) {
        throw new Error('Item não é equipável');
      }
      
      // Dessequipar qualquer item no mesmo slot
      await db.query(
        'UPDATE inventory SET equipped = FALSE WHERE character_id = ? AND slot = ?',
        [characterId, slot]
      );
      
      // Equipar o novo item
      await db.query(
        'UPDATE inventory SET equipped = TRUE, slot = ? WHERE character_id = ? AND item_id = ?',
        [slot, characterId, itemId]
      );
      
      return { success: true };
    } catch (error) {
      logger.error('Erro ao equipar item:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Desequipar item
  static async unequipItem(characterId, itemId) {
    try {
      await db.query(
        'UPDATE inventory SET equipped = FALSE, slot = -1 WHERE character_id = ? AND item_id = ?',
        [characterId, itemId]
      );
      
      return { success: true };
    } catch (error) {
      logger.error('Erro ao desequipar item:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = InventoryController;