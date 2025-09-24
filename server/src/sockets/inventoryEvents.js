const InventoryController = require('../controllers/inventoryController');
const logger = require('../utils/logger');

module.exports = (io, socket) => {
  // Buscar inventário
  socket.on('get_inventory', async (callback) => {
    try {
      if (!socket.characterId) {
        return callback({ success: false, error: 'Personagem não selecionado' });
      }
      
      const result = await InventoryController.getInventory(socket.characterId);
      callback(result);
    } catch (error) {
      logger.error('Erro no evento get_inventory:', error.message);
      callback({ success: false, error: 'Erro interno do servidor' });
    }
  });

  // Equipar item
  socket.on('equip_item', async (data, callback) => {
    try {
      if (!socket.characterId) {
        return callback({ success: false, error: 'Personagem não selecionado' });
      }
      
      const { itemId, slot } = data;
      
      if (!itemId || !slot) {
        return callback({ success: false, error: 'ID do item e slot são obrigatórios' });
      }
      
      const result = await InventoryController.equipItem(socket.characterId, itemId, slot);
      callback(result);
    } catch (error) {
      logger.error('Erro no evento equip_item:', error.message);
      callback({ success: false, error: 'Erro interno do servidor' });
    }
  });

  // Desequipar item
  socket.on('unequip_item', async (data, callback) => {
    try {
      if (!socket.characterId) {
        return callback({ success: false, error: 'Personagem não selecionado' });
      }
      
      const { itemId } = data;
      
      if (!itemId) {
        return callback({ success: false, error: 'ID do item é obrigatório' });
      }
      
      const result = await InventoryController.unequipItem(socket.characterId, itemId);
      callback(result);
    } catch (error) {
      logger.error('Erro no evento unequip_item:', error.message);
      callback({ success: false, error: 'Erro interno do servidor' });
    }
  });

  // Usar item
  socket.on('use_item', async (data, callback) => {
    try {
      if (!socket.characterId) {
        return callback({ success: false, error: 'Personagem não selecionado' });
      }
      
      const { itemId } = data;
      
      if (!itemId) {
        return callback({ success: false, error: 'ID do item é obrigatório' });
      }
      
      // Implementar lógica de uso de item aqui
      // Por exemplo, poções de cura, etc.
      
      callback({ success: false, error: 'Funcionalidade ainda não implementada' });
    } catch (error) {
      logger.error('Erro no evento use_item:', error.message);
      callback({ success: false, error: 'Erro interno do servidor' });
    }
  });
};