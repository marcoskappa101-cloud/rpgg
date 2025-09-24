const Character = require('../models/Character');
const logger = require('../utils/logger');

class CharacterController {
  // Criar personagem
  static async createCharacter(accountId, name, characterClass, race) {
    try {
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

      // Criar personagem
      const characterId = await Character.create(accountId, name, characterClass, race);
      console.log('Personagem criado com ID:', characterId);
      
      return { success: true, characterId: characterId.toString() };
    } catch (error) {
      logger.error('Erro ao criar personagem:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Buscar personagens de uma conta
  static async getCharacters(accountId) {
    try {
      const characters = await Character.findByAccountId(accountId);
      console.log('Personagens encontrados no banco:', characters);
      
      // Mapear os campos para Unity
      const mappedCharacters = characters.map(c => {
        const mapped = {
          id: c.id ? c.id.toString() : null, // Garantir que o ID seja string
          name: c.name,
          classe: c.class, // ⚠ renomeado
          race: c.race,
          level: c.level || 1,
          exp: c.exp || 0,
          str: c.str || 10,
          dex: c.dex || 10,
          vit: c.vit || 10,
          int: c.int || 10,
          luk: c.luk || 10,
          hp: c.hp || 100,
          max_hp: c.max_hp || 100,
          mp: c.mp || 50,
          max_mp: c.max_mp || 50,
          pos_x: c.pos_x || 0,
          pos_y: c.pos_y || 0,
          pos_z: c.pos_z || 0,
          map: c.map || 'town'
        };
        
        console.log('Personagem mapeado:', mapped);
        return mapped;
      });

      return { success: true, characters: mappedCharacters };
    } catch (error) {
      logger.error('Erro ao buscar personagens:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Selecionar personagem para jogar
  static async selectCharacter(characterId) {
    try {
      console.log('Procurando personagem com ID:', characterId, 'Tipo:', typeof characterId);
      
      const character = await Character.findById(characterId);
      console.log('Personagem encontrado no banco:', character);
      
      if (!character) {
        throw new Error('Personagem não encontrado');
      }

      // Atualizar último acesso
      await Character.updateLastPlayed(characterId);

      // Mapear o retorno para Unity
      const mappedCharacter = {
        id: character.id ? character.id.toString() : null,
        name: character.name,
        classe: character.class, // ⚠ renomeado
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
        pos_x: character.pos_x || 0,
        pos_y: character.pos_y || 0,
        pos_z: character.pos_z || 0,
        map: character.map || 'town'
      };

      console.log('Personagem mapeado para Unity:', mappedCharacter);
      return { success: true, character: mappedCharacter };
    } catch (error) {
      logger.error('Erro ao selecionar personagem:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = CharacterController;