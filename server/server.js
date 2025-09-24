const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const config = require('./src/config/config');
const database = require('./src/config/database');
const logger = require('./src/utils/logger');
const ServerManager = require('./src/utils/serverManager');

// Importar handlers de eventos
const authEvents = require('./src/sockets/authEvents');
const characterEvents = require('./src/sockets/characterEvents');
const playerEvents = require('./src/sockets/playerEvents');
const combatEvents = require('./src/sockets/combatEvents');
const inventoryEvents = require('./src/sockets/inventoryEvents');

// Importar rotas
const serverRoutes = require('./src/routes/serverRoutes');

const app = express();

app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 🔹 Inicializar gerenciador de servidor e torná-lo global
const serverManager = new ServerManager(io, 1);
global.serverManager = serverManager;

// Middleware para disponibilizar io e serverManager nas rotas
app.use((req, res, next) => {
  req.io = io;
  req.serverManager = serverManager;
  next();
});

// Configurar rotas da API
app.use('/api', serverRoutes);

// 🔹 CORRIGIDO: Configurar eventos do Socket.IO
io.on('connection', (socket) => {
  logger.info(`🔌 Novo cliente conectado: ${socket.id}`);
  
  // 🔹 IMPORTANTE: Notificar ServerManager sobre nova conexão
  serverManager.socketConnected(socket.id);
  
  // Configurar eventos de autenticação
  authEvents(io, socket);
  
  // Configurar eventos de personagem
  characterEvents(io, socket);
  
  // Configurar eventos do jogador
  playerEvents(io, socket);
  
  // Configurar eventos de combate
  combatEvents(io, socket);
  
  // Configurar eventos de inventário
  inventoryEvents(io, socket);
  
  // 🔹 CORRIGIDO: Evento de desconexão
  socket.on('disconnect', (reason) => {
    logger.info(`🔌 Cliente desconectado: ${socket.id} - Motivo: ${reason}`);
    
    // 🔹 IMPORTANTE: Notificar ServerManager sobre desconexão
    serverManager.socketDisconnected(socket.id);
    
    // Notificar outros jogadores se este socket tinha um personagem selecionado
    if (socket.characterId && socket.character) {
      socket.to(socket.character.map).emit('player_left', {
        characterId: socket.characterId,
        name: socket.character.name
      });
    }
  });
  
  // 🔹 NOVO: Evento de debug para testar contadores
  socket.on('debug_server_stats', (callback) => {
    try {
      const stats = serverManager.getServerStats();
      const debugInfo = serverManager.debugInfo();
      
      if (callback && typeof callback === 'function') {
        callback({
          success: true,
          stats: stats,
          debug: debugInfo
        });
      }
    } catch (error) {
      if (callback && typeof callback === 'function') {
        callback({
          success: false,
          error: error.message
        });
      }
    }
  });
});

// Rota de health check
app.get('/health', (req, res) => {
  const stats = serverManager.getServerStats();
  
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    server: config.server.name,
    version: '1.0.0',
    playerStats: stats
  });
});

// 🔹 MELHORADO: Rota para obter informações do servidor
app.get('/server-info', (req, res) => {
  const stats = serverManager.getServerStats();
  
  res.status(200).json({
    name: config.server.name,
    version: '1.0.0',
    maxPlayers: config.server.maxPlayers,
    onlinePlayers: stats.playersInGame,
    authenticatedPlayers: stats.authenticatedPlayers,
    totalConnections: stats.totalSockets,
    isActive: serverManager.isActive(),
    detailedStats: stats
  });
});

// 🔹 NOVA: Rota de debug para monitorar contadores
app.get('/debug/players', (req, res) => {
  try {
    const debugInfo = serverManager.debugInfo();
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: debugInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manipulador de erros
app.use((err, req, res, next) => {
  logger.error('Erro na aplicação:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Rota não encontrada
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Função principal de inicialização
async function startServer() {
  try {
    // Conectar ao banco de dados ANTES de iniciar o servidor
    await database.connect();

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      logger.info(`🚀 Servidor rodando na porta ${PORT}`);
      logger.info(`📊 Servidor: ${config.server.name}`);
      logger.info(`👥 Máximo de jogadores: ${config.server.maxPlayers}`);
      logger.info(`🔧 Debug endpoint: http://localhost:${PORT}/debug/players`);

      // 🔹 Iniciar monitoramento do servidor depois que tudo estiver OK
      serverManager.start();
    });
  } catch (err) {
    logger.error("❌ Erro ao iniciar servidor:", err);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('🔄 Recebido SIGINT. Encerrando servidor...');
  
  // Parar monitoramento do servidor
  serverManager.stop();
  
  server.close(() => {
    database.end().then(() => {
      logger.info('✅ Servidor encerrado.');
      process.exit(0);
    }).catch(err => {
      logger.error('❌ Erro ao encerrar conexão com banco:', err);
      process.exit(1);
    });
  });
});

module.exports = { app, io };