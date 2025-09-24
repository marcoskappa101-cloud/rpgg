const db = require('../config/database');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const Helpers = require('../utils/helpers');

class Account {
  // Criar nova conta
  static async create(username, password) {
    try {
      // Validar entrada
      if (!Helpers.isValidUsername(username)) {
        throw new Error('Nome de usuário inválido. Use apenas letras, números e underscore (3-20 caracteres)');
      }

      if (password.length < 6) {
        throw new Error('Senha deve ter pelo menos 6 caracteres');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await db.query(
        'INSERT INTO accounts (username, password) VALUES (?, ?)',
        [Helpers.sanitizeInput(username), hashedPassword]
      );
      return result.insertId;
    } catch (error) {
      logger.error('Erro ao criar conta:', error.message);
      throw error;
    }
  }

  // Buscar conta por nome de usuário
  static async findByUsername(username) {
    try {
      const rows = await db.query(
        'SELECT * FROM accounts WHERE username = ?',
        [Helpers.sanitizeInput(username)]
      );
      return rows[0] || null;
    } catch (error) {
      logger.error('Erro ao buscar conta:', error.message);
      throw error;
    }
  }

  // Buscar conta por ID
  static async findById(id) {
    try {
      const rows = await db.query(
        'SELECT id, username, created_at, last_login FROM accounts WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      logger.error('Erro ao buscar conta por ID:', error.message);
      throw error;
    }
  }

  // Verificar senha
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Atualizar último login
  static async updateLastLogin(accountId) {
    try {
      await db.query(
        'UPDATE accounts SET last_login = NOW() WHERE id = ?',
        [accountId]
      );
    } catch (error) {
      logger.error('Erro ao atualizar último login:', error.message);
      throw error;
    }
  }
}

module.exports = Account;