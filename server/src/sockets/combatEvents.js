const CombatController = require('../controllers/combatController');
const logger = require('../utils/logger');

module.exports = (io, socket) => {
  // Selecionar alvo
  socket.on('select_target', async (data, callback) => {
    try {
      if (!socket.characterId) {
        return callback({ success: false, error: 'Personagem não selecionado' });
      }
      
      const { targetId, targetType } = data; // targetType: 'player' or 'monster'
      
      if (!targetId || !targetType) {
        return callback({ success: false, error: 'ID e tipo do alvo são obrigatórios' });
      }
      
      // Armazenar alvo selecionado
      socket.targetId = targetId;
      socket.targetType = targetType;
      
      callback({ success: true });
    } catch (error) {
      logger.error('Erro no evento select_target:', error.message);
      callback({ success: false, error: 'Erro interno do servidor' });
    }
  });

  // Atacar alvo
  socket.on('attack', async (data, callback) => {
    try {
      if (!socket.characterId) {
        return callback({ success: false, error: 'Personagem não selecionado' });
      }
      
      if (!socket.targetId || !socket.targetType) {
        return callback({ success: false, error: 'Nenhum alvo selecionado' });
      }
      
      let result;
      
      if (socket.targetType === 'monster') {
        result = await CombatController.attackMonster(socket.characterId, socket.targetId);
        
        if (result.success) {
          // Notificar outros jogadores no mesmo mapa
          socket.to(socket.character.map).emit('combat_update', {
            attackerId: socket.characterId,
            targetId: socket.targetId,
            targetType: socket.targetType,
            result: result.result,
            damage: result.damage,
            isCritical: result.isCritical,
            monsterHp: result.monsterHp
          });
          
          // Se o monstro morreu, agendar respawn
          if (result.result === 'kill') {
            // Implementar lógica de respawn aqui
          }
        }
      } else if (socket.targetType === 'player') {
        // Implementar PVP aqui
        callback({ success: false, error: 'PVP ainda não implementado' });
        return;
      }
      
      callback(result);
    } catch (error) {
      logger.error('Erro no evento attack:', error.message);
      callback({ success: false, error: 'Erro interno do servidor' });
    }
  });
};