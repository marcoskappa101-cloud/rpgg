const PlayerController = require('../controllers/playerController');
const logger = require('../utils/logger');

module.exports = (io, socket) => {
  // 🔹 CORRIGIDO: Mover jogador - sem callback obrigatório
  socket.on('move', async (data, callback) => {
    try {
      if (!socket.characterId) {
        const error = { success: false, error: 'Personagem não selecionado' };
        logger.warning(`Tentativa de movimento sem personagem selecionado: ${socket.id}`);
        
        if (callback && typeof callback === 'function') {
          return callback(error);
        }
        return;
      }
      
      const { posX, posY, posZ, map } = data;
      
      if (posX === undefined || posY === undefined || posZ === undefined) {
        const error = { success: false, error: 'Posição inválida' };
        logger.warning(`Posição inválida recebida de ${socket.characterId}: ${JSON.stringify(data)}`);
        
        if (callback && typeof callback === 'function') {
          return callback(error);
        }
        return;
      }
      
      // 🔹 ADICIONAR: Log de movimento para debug
      logger.info(`Jogador ${socket.characterId} movendo para: (${posX}, ${posY}, ${posZ})`);
      
      const result = await PlayerController.movePlayer(socket.characterId, posX, posY, posZ, map);
      
      if (result.success) {
        // 🔹 CORRIGIDO: Verificar se socket tem character e map
        if (!socket.character) {
          logger.warning(`Socket ${socket.id} não tem dados de personagem`);
          return;
        }
        
        // 🔹 Preparar dados do movimento
        const moveData = {
          characterId: socket.characterId,
          posX: parseFloat(posX),
          posY: parseFloat(posY),
          posZ: parseFloat(posZ),
          map: map || socket.character.map
        };
        
        // 🔹 IMPORTANTE: Notificar outros jogadores no mesmo mapa
        const playersNotified = socket.to(socket.character.map).emit('player_moved', moveData);
        
        logger.info(`Movimento propagado para sala ${socket.character.map}: ${JSON.stringify(moveData)}`);
        
        // 🔹 Atualizar mapa do personagem se mudou
        if (map && map !== socket.character.map) {
          logger.info(`Jogador ${socket.characterId} mudou de mapa: ${socket.character.map} -> ${map}`);
          
          socket.leave(socket.character.map);
          socket.join(map);
          socket.character.map = map;
          
          // 🔹 Notificar saída do mapa anterior
          socket.to(socket.character.map).emit('player_left', {
            characterId: socket.characterId,
            name: socket.character.name
          });
          
          // 🔹 Notificar entrada no novo mapa
          socket.to(map).emit('player_joined', {
            characterId: socket.characterId,
            name: socket.character.name,
            classe: socket.character.classe,
            race: socket.character.race,
            level: socket.character.level,
            posX: posX,
            posY: posY,
            posZ: posZ
          });
        }
      } else {
        logger.error(`Erro ao mover jogador ${socket.characterId}: ${result.error}`);
      }
      
      // 🔹 Responder apenas se callback existir
      if (callback && typeof callback === 'function') {
        callback(result);
      }
    } catch (error) {
      logger.error('Erro no evento move:', error.message);
      const errorResponse = { success: false, error: 'Erro interno do servidor' };
      
      if (callback && typeof callback === 'function') {
        callback(errorResponse);
      }
    }
  });

  // 🔹 CORRIGIDO: Atualizar status do jogador
  socket.on('player_update', async (data, callback) => {
    try {
      if (!socket.characterId) {
        const error = { success: false, error: 'Personagem não selecionado' };
        if (callback && typeof callback === 'function') {
          return callback(error);
        }
        return;
      }
      
      const { stats } = data;
      
      if (!stats) {
        const error = { success: false, error: 'Stats são obrigatórios' };
        if (callback && typeof callback === 'function') {
          return callback(error);
        }
        return;
      }
      
      const result = await PlayerController.updatePlayerStats(socket.characterId, stats);
      
      if (result.success) {
        // 🔹 Notificar outros jogadores sobre mudanças relevantes (HP, etc.)
        if (stats.hp !== undefined && socket.character) {
          socket.to(socket.character.map).emit('player_stats_updated', {
            characterId: socket.characterId,
            stats: stats
          });
        }
      }
      
      if (callback && typeof callback === 'function') {
        callback(result);
      }
    } catch (error) {
      logger.error('Erro no evento player_update:', error.message);
      const errorResponse = { success: false, error: 'Erro interno do servidor' };
      
      if (callback && typeof callback === 'function') {
        callback(errorResponse);
      }
    }
  });
  
  // 🔹 NOVO: Evento de debug para listar jogadores na sala
  socket.on('debug_room_info', (callback) => {
    try {
      if (!socket.character) {
        return callback({ error: 'Sem personagem' });
      }
      
      const roomName = socket.character.map;
      const socketsInRoom = io.sockets.adapter.rooms.get(roomName);
      
      const roomInfo = {
        map: roomName,
        playersInRoom: socketsInRoom ? socketsInRoom.size : 0,
        socketIds: socketsInRoom ? Array.from(socketsInRoom) : []
      };
      
      logger.info(`Debug sala ${roomName}: ${JSON.stringify(roomInfo)}`);
      callback(roomInfo);
    } catch (error) {
      callback({ error: error.message });
    }
  });
};