const ServerController = require("../controllers/serverController");
const logger = require("../utils/logger");

class ServerManager {
  constructor(io, serverId = 1) {
    this.io = io;
    this.serverId = serverId;
    this.isRunning = false;
    this.updateInterval = null;
    
    // 🔹 CORRIGIDO: Usar Map para armazenar dados completos dos jogadores
    this.connectedSockets = new Map(); // socketId -> { connected: timestamp }
    this.authenticatedPlayers = new Map(); // socketId -> { accountId, username, timestamp }
    this.playersInGame = new Map(); // socketId -> { characterId, characterName, timestamp }
  }

  // Iniciar monitoramento do servidor
  start() {
    if (this.isRunning) {
      logger.warn("ServerManager já está rodando");
      return;
    }

    this.isRunning = true;
    logger.info(`Iniciando monitoramento do servidor ${this.serverId}`);

    // Atualizar status do servidor a cada 15 segundos (mais frequente)
    this.updateInterval = setInterval(() => {
      this.updateServerStatus();
    }, 15000);

    // Atualizar status inicial
    this.updateServerStatus();
  }

  // Parar monitoramento do servidor
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info(`Parando monitoramento do servidor ${this.serverId}`);

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // 🔹 NOVO: Registrar conexão de socket
  socketConnected(socketId) {
    this.connectedSockets.set(socketId, {
      connected: Date.now()
    });
    
    logger.info(`Socket conectado: ${socketId}. Total sockets: ${this.connectedSockets.size}`);
  }

  // 🔹 NOVO: Registrar desconexão de socket
  socketDisconnected(socketId) {
    // Remover de todas as listas
    this.connectedSockets.delete(socketId);
    this.authenticatedPlayers.delete(socketId);
    this.playersInGame.delete(socketId);
    
    const stats = this.getServerStats();
    logger.info(`Socket desconectado: ${socketId}. Stats: ${JSON.stringify(stats)}`);
  }

  // 🔹 CORRIGIDO: Método para notificar que um jogador fez login
  playerAuthenticated(socketId, accountId, username) {
    this.authenticatedPlayers.set(socketId, {
      accountId,
      username,
      timestamp: Date.now()
    });
    
    logger.info(`Jogador autenticado: ${username} (${socketId}). Total autenticados: ${this.authenticatedPlayers.size}`);
  }

  // 🔹 CORRIGIDO: Método para notificar que um jogador entrou no mundo
  playerEnteredWorld(socketId, characterId, characterName) {
    // Só contar se realmente estiver autenticado
    if (!this.authenticatedPlayers.has(socketId)) {
      logger.warn(`Tentativa de entrar no mundo sem autenticação: ${socketId}`);
      return;
    }

    this.playersInGame.set(socketId, {
      characterId,
      characterName,
      timestamp: Date.now()
    });
    
    logger.info(`Jogador entrou no mundo: ${characterName} (${socketId}). Total no mundo: ${this.playersInGame.size}`);
  }

  // 🔹 CORRIGIDO: Método para notificar que um jogador saiu do mundo
  playerLeftWorld(socketId) {
    const playerData = this.playersInGame.get(socketId);
    this.playersInGame.delete(socketId);
    
    if (playerData) {
      logger.info(`Jogador saiu do mundo: ${playerData.characterName} (${socketId}). Total no mundo: ${this.playersInGame.size}`);
    }
  }

  // Atualizar status do servidor no banco de dados
  async updateServerStatus() {
    try {
      const currentPlayerCount = this.getCurrentPlayerCount();
      await ServerController.updateServerStatus(this.serverId, "online", currentPlayerCount);
      
      const stats = this.getServerStats();
      logger.info(`Status atualizado - Servidor ${this.serverId}: ${JSON.stringify(stats)}`);
    } catch (error) {
      logger.error("Erro ao atualizar status do servidor:", error.message);
    }
  }

  // 🔹 PRINCIPAL: Contar apenas jogadores que estão realmente jogando
  getCurrentPlayerCount() {
    try {
      // Limpar sockets mortos primeiro
      this.cleanupDeadSockets();
      
      // Retornar apenas jogadores que estão no mundo do jogo
      return this.playersInGame.size;
    } catch (error) {
      logger.error("Erro ao obter contagem de jogadores:", error.message);
      return 0;
    }
  }

  // 🔹 Contar jogadores autenticados (logados mas não necessariamente no jogo)
  getAuthenticatedPlayerCount() {
    this.cleanupDeadSockets();
    return this.authenticatedPlayers.size;
  }

  // 🔹 NOVO: Limpar sockets que não existem mais
  cleanupDeadSockets() {
    try {
      const activeSockets = new Set();
      
      // Obter sockets realmente conectados
      this.io.of("/").sockets.forEach((socket, socketId) => {
        activeSockets.add(socketId);
      });

      // Remover sockets mortos de todas as listas
      for (const socketId of this.connectedSockets.keys()) {
        if (!activeSockets.has(socketId)) {
          this.connectedSockets.delete(socketId);
          this.authenticatedPlayers.delete(socketId);
          this.playersInGame.delete(socketId);
        }
      }
    } catch (error) {
      logger.error("Erro ao limpar sockets mortos:", error.message);
    }
  }

  // 🔹 NOVO: Obter estatísticas completas do servidor
  getServerStats() {
    this.cleanupDeadSockets();
    
    return {
      totalSockets: this.connectedSockets.size,
      authenticatedPlayers: this.authenticatedPlayers.size,
      playersInGame: this.playersInGame.size,
      realSocketCount: this.io.of("/").sockets.size
    };
  }

  // Verificar se o servidor está ativo
  isActive() {
    return this.isRunning;
  }

  // 🔹 MELHORADO: Método para debug
  debugInfo() {
    try {
      const stats = this.getServerStats();
      
      logger.info("=== SERVER MANAGER DEBUG ===");
      logger.info(`Stats: ${JSON.stringify(stats, null, 2)}`);
      
      // Listar jogadores no jogo
      logger.info("Jogadores no mundo:");
      for (const [socketId, data] of this.playersInGame) {
        logger.info(`  - ${data.characterName} (${socketId})`);
      }
      
      // Listar jogadores autenticados
      logger.info("Jogadores autenticados:");
      for (const [socketId, data] of this.authenticatedPlayers) {
        logger.info(`  - ${data.username} (${socketId})`);
      }
      
      return stats;
    } catch (error) {
      logger.error("Erro no debug:", error.message);
      return null;
    }
  }
}

module.exports = ServerManager;