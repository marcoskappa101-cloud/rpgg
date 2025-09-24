const Server = require("../models/Server");
const logger = require("../utils/logger");

class ServerController {
  // 🔹 CORRIGIDO: Obter lista de servidores com informações em tempo real
  static async getServers(io, serverManager = null) {
    try {
      // 🔹 Usar ServerManager se disponível
      const realServerManager = serverManager || global.serverManager;
      
      const servers = await Server.getServersWithRealTimeInfo(realServerManager);
      
      logger.info(`Retornando ${servers.length} servidores com contagens atualizadas`);
      
      return { success: true, servers };
    } catch (error) {
      logger.error("Erro ao obter servidores:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Atualizar status de um servidor
  static async updateServerStatus(serverId, status, playerCount) {
    try {
      await Server.updateStatus(serverId, status, playerCount);
      
      logger.info(`Status do servidor ${serverId} atualizado: ${status}, jogadores: ${playerCount}`);
      
      return { success: true };
    } catch (error) {
      logger.error("Erro ao atualizar status do servidor:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Registrar entrada de jogador
  static async playerJoined(serverId) {
    try {
      await Server.incrementPlayerCount(serverId);
      return { success: true };
    } catch (error) {
      logger.error("Erro ao registrar entrada de jogador:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Registrar saída de jogador
  static async playerLeft(serverId) {
    try {
      await Server.decrementPlayerCount(serverId);
      return { success: true };
    } catch (error) {
      logger.error("Erro ao registrar saída de jogador:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Criar novo servidor
  static async createServer(name, maxPlayers, status = "online") {
    try {
      const serverId = await Server.create(name, maxPlayers, status);
      return { success: true, serverId };
    } catch (error) {
      logger.error("Erro ao criar servidor:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Verificar se servidor está disponível
  static async isServerAvailable(serverId) {
    try {
      const isOnline = await Server.isOnline(serverId);
      return { success: true, isOnline };
    } catch (error) {
      logger.error("Erro ao verificar disponibilidade do servidor:", error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ServerController;