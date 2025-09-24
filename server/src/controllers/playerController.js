const Character = require('../models/Character');
const logger = require('../utils/logger');

class PlayerController {
  // Mover jogador
  static async movePlayer(characterId, posX, posY, posZ, map) {
    try {
      await Character.updatePosition(characterId, posX, posY, posZ, map);
      return { success: true };
    } catch (error) {
      logger.error('Erro ao mover jogador:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Atualizar status do jogador
  static async updatePlayerStats(characterId, stats) {
    try {
      await Character.updateStats(characterId, stats);
      return { success: true };
    } catch (error) {
      logger.error('Erro ao atualizar stats do jogador:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Buscar jogador por ID - MÉTODO ADICIONADO
  static async getPlayer(characterId) {
    try {
      const character = await Character.findById(characterId);
      if (!character) {
        throw new Error('Jogador não encontrado');
      }

      // Mapear para Unity (igual ao characterController)
      const mappedCharacter = {
        id: character.id ? character.id.toString() : null,
        name: character.name,
        classe: character.class, // DB usa 'class', Unity usa 'classe'
        race: character.race,
        level: character.level || 1,
        exp: character.exp || 0,
        str: character.str || 10,
        dex: character.dex || 10,
        vit: character.vit || 10,
        int: character.int || 10,
        luk: character.luk || 10,
        hp: character.hp || 100,
        max_hp: character.max_hp || 100,
        mp: character.mp || 50,
        max_mp: character.max_mp || 50,
        pos_x: character.pos_x || 2,
        pos_y: character.pos_y || 1,
        pos_z: character.pos_z || 2,
        map: character.map || 'village_of_gludin'
      };

      return { success: true, character: mappedCharacter };
    } catch (error) {
      logger.error('Erro ao buscar jogador:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = PlayerController;