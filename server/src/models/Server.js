const db = require("../config/database");
const logger = require("../utils/logger");

class Server {
  // Buscar todos os servidores
  static async findAll() {
    try {
      const rows = await db.query("SELECT * FROM servers ORDER BY id");
      return rows;
    } catch (error) {
      logger.error("Erro ao buscar servidores:", error.message);
      throw error;
    }
  }

  // Buscar servidor por ID
  static async findById(serverId) {
    try {
      const rows = await db.query(
        "SELECT * FROM servers WHERE id = ?",
        [serverId]
      );
      return rows[0] || null;
    } catch (error) {
      logger.error("Erro ao buscar servidor por ID:", error.message);
      throw error;
    }
  }

  // Atualizar status do servidor
  static async updateStatus(serverId, status, playerCount) {
    try {
      await db.query(
        "UPDATE servers SET status = ?, player_count = ?, last_update = NOW() WHERE id = ?",
        [status, playerCount, serverId]
      );
    } catch (error) {
      logger.error("Erro ao atualizar status do servidor:", error.message);
      throw error;
    }
  }

  // Incrementar contagem de jogadores
  static async incrementPlayerCount(serverId) {
    try {
      await db.query(
        "UPDATE servers SET player_count = player_count + 1, last_update = NOW() WHERE id = ?",
        [serverId]
      );
    } catch (error) {
      logger.error("Erro ao incrementar contagem de jogadores:", error.message);
      throw error;
    }
  }

  // Decrementar contagem de jogadores
  static async decrementPlayerCount(serverId) {
    try {
      await db.query(
        "UPDATE servers SET player_count = GREATEST(0, player_count - 1), last_update = NOW() WHERE id = ?",
        [serverId]
      );
    } catch (error) {
      logger.error("Erro ao decrementar contagem de jogadores:", error.message);
      throw error;
    }
  }

  // Criar novo servidor
  static async create(name, maxPlayers, status = "online") {
    try {
      const result = await db.query(
        "INSERT INTO servers (name, max_players, status, player_count) VALUES (?, ?, ?, 0)",
        [name, maxPlayers, status]
      );
      return result.insertId;
    } catch (error) {
      logger.error("Erro ao criar servidor:", error.message);
      throw error;
    }
  }

  // Verificar se servidor está online
  static async isOnline(serverId) {
    try {
      const server = await this.findById(serverId);
      return server && server.status === "online";
    } catch (error) {
      logger.error("Erro ao verificar status do servidor:", error.message);
      return false;
    }
  }

  // Obter servidores com informações em tempo real
  static async getServersWithRealTimeInfo(io) {
    try {
      const servers = await this.findAll();
      
      // Para cada servidor, obter a contagem real de jogadores conectados
      const serversWithRealTimeInfo = servers.map(server => {
        // Contar clientes conectados no Socket.IO
        const connectedClients = io.engine.clientsCount;
        
        return {
          id: server.id,
          name: server.name,
          status: server.status,
          playerCount: connectedClients, // Contagem real de jogadores conectados
          maxPlayers: server.max_players,
          lastUpdate: server.last_update
        };
      });
      
      return serversWithRealTimeInfo;
    } catch (error) {
      logger.error("Erro ao obter servidores com informações em tempo real:", error.message);
      throw error;
    }
  }
}

module.exports = Server;
