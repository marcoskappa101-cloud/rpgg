const Account = require('../models/Account');
const logger = require('../utils/logger');

class AuthController {
  // Registrar nova conta
  static async register(username, password) {
    try {
      // Verificar se o usuário já existe
      const existingAccount = await Account.findByUsername(username);
      if (existingAccount) {
        throw new Error('Nome de usuário já existe');
      }

      // Criar nova conta
      const accountId = await Account.create(username, password);
      return { success: true, accountId };
    } catch (error) {
      logger.error('Erro no registro:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Login
  static async login(username, password) {
    try {
      // Buscar conta
      const account = await Account.findByUsername(username);
      if (!account) {
        throw new Error('Credenciais inválidas');
      }

      // Verificar senha
      const isValidPassword = await Account.verifyPassword(password, account.password);
      if (!isValidPassword) {
        throw new Error('Credenciais inválidas');
      }

      // Atualizar último login
      await Account.updateLastLogin(account.id);

      return { 
        success: true, 
        account: {
          id: account.id,
          username: account.username,
          created_at: account.created_at
        }
      };
    } catch (error) {
      logger.error('Erro no login:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = AuthController;