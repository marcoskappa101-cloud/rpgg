const AuthController = require('../controllers/authController');
const logger = require('../utils/logger');

module.exports = (io, socket) => {
  // Registrar nova conta
  socket.on('register', async (data) => {
    try {
      console.log('Recebido register - dados completos:', data);
      
      const { username, password } = data;
      
      if (!username || !password) {
        console.log('Username ou password faltando');
        return socket.emit('register_response', [{ 
          success: false, 
          error: 'Usuário e senha são obrigatórios' 
        }]);
      }
      
      const result = await AuthController.register(username, password);
      console.log('Resultado do registro:', result);
      
      // Enviar como array para compatibilidade com SocketIOUnity
      socket.emit('register_response', [result]);
      
    } catch (error) {
      logger.error('Erro no evento register:', error.message);
      socket.emit('register_response', [{ 
        success: false, 
        error: 'Erro interno do servidor' 
      }]);
    }
  });

  // 🔹 CORRIGIDO: Login com notificação adequada ao ServerManager
  socket.on('login', async (data) => {
    try {
      console.log('Recebido login - dados completos:', data);
      
      const { username, password } = data;
      
      if (!username || !password) {
        console.log('Username ou password faltando');
        return socket.emit('login_response', [{ 
          success: false, 
          error: 'Usuário e senha são obrigatórios' 
        }]);
      }
      
      const result = await AuthController.login(username, password);
      console.log('Resultado do login:', result);
      
      if (result.success) {
        // 🔹 Associar dados ao socket
        socket.accountId = result.account.id;
        socket.username = result.account.username;
        
        // 🔹 CORRIGIDO: Notificar ServerManager com dados completos
        if (global.serverManager) {
          global.serverManager.playerAuthenticated(
            socket.id, 
            result.account.id, 
            result.account.username
          );
        }
        
        logger.info(`Login bem-sucedido: ${username} (${socket.id})`);
      }
      
      // Enviar como array para compatibilidade com SocketIOUnity
      socket.emit('login_response', [result]);
      
    } catch (error) {
      logger.error('Erro no evento login:', error.message);
      socket.emit('login_response', [{ 
        success: false, 
        error: 'Erro interno do servidor' 
      }]);
    }
  });
};