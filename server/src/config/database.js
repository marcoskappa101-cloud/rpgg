const mysql = require('mysql2/promise');
const config = require('./config');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.connection = null;
    this.config = {
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database
    };
  }

  async connect() {
    try {
      this.connection = await mysql.createConnection(this.config);
      logger.info('Conectado ao banco de dados MySQL');
      
      // Inicializar tabelas
      await this.initializeTables();
      
    } catch (error) {
      logger.error('Erro ao conectar ao banco de dados:', error.message);
      console.error('Detalhes do erro de conexão:', error);
      
      // Tentar reconectar após 5 segundos
      setTimeout(() => {
        logger.info('Tentando reconectar ao banco de dados...');
        this.connect();
      }, 5000);
    }
  }

  async initializeTables() {
    try {
      // Tabela de contas
      await this.connection.execute(`
        CREATE TABLE IF NOT EXISTS accounts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP NULL,
          INDEX idx_username (username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Tabela de servidores - CORRIGIDA com last_update
      await this.connection.execute(`
        CREATE TABLE IF NOT EXISTS servers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(50) NOT NULL,
          status ENUM('online', 'offline', 'maintenance') DEFAULT 'online',
          player_count INT DEFAULT 0,
          max_players INT DEFAULT 1000,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Verificar e adicionar coluna last_update se não existir
      await this.addLastUpdateColumnIfNotExists();

      // Tabela de personagens - CORRIGIDA: usando crases para palavras reservadas
      await this.connection.execute(`
        CREATE TABLE IF NOT EXISTS characters (
          id INT AUTO_INCREMENT PRIMARY KEY,
          account_id INT NOT NULL,
          name VARCHAR(50) UNIQUE NOT NULL,
          class ENUM('warrior', 'mage', 'archer', 'rogue', 'cleric') NOT NULL,
          race ENUM('human', 'elf', 'dark_elf', 'orc', 'dwarf') NOT NULL,
          level INT DEFAULT 1,
          exp BIGINT DEFAULT 0,
          str INT DEFAULT 10,
          dex INT DEFAULT 10,
          vit INT DEFAULT 10,
          \`int\` INT DEFAULT 10,  -- INT é palavra reservada, precisa de crases
          luk INT DEFAULT 10,
          hp INT DEFAULT 100,
          max_hp INT DEFAULT 100,
          mp INT DEFAULT 50,
          max_mp INT DEFAULT 50,
          pos_x FLOAT DEFAULT 0,
          pos_y FLOAT DEFAULT 0,
          pos_z FLOAT DEFAULT 0,
          map VARCHAR(50) DEFAULT 'village_of_gludin',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_played TIMESTAMP NULL,
          INDEX idx_account_id (account_id),
          INDEX idx_name (name),
          INDEX idx_map (map),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Tabela de monstros
      await this.connection.execute(`
        CREATE TABLE IF NOT EXISTS monsters (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(50) NOT NULL,
          level INT DEFAULT 1,
          hp INT DEFAULT 50,
          max_hp INT DEFAULT 50,
          atk INT DEFAULT 10,
          def INT DEFAULT 5,
          exp INT DEFAULT 10,
          pos_x FLOAT DEFAULT 0,
          pos_y FLOAT DEFAULT 0,
          pos_z FLOAT DEFAULT 0,
          map VARCHAR(50) DEFAULT 'village_of_gludin',
          respawn_time INT DEFAULT 30,
          INDEX idx_map (map)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Tabela de itens
      await this.connection.execute(`
        CREATE TABLE IF NOT EXISTS items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(50) NOT NULL,
          type ENUM('weapon', 'armor', 'consumable', 'material') NOT NULL,
          sub_type VARCHAR(50) NOT NULL,
          stats JSON,
          effect VARCHAR(255) NULL,
          price INT DEFAULT 0,
          weight FLOAT DEFAULT 0,
          INDEX idx_type (type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Tabela de inventário
      await this.connection.execute(`
        CREATE TABLE IF NOT EXISTS inventory (
          id INT AUTO_INCREMENT PRIMARY KEY,
          character_id INT NOT NULL,
          item_id INT NOT NULL,
          quantity INT DEFAULT 1,
          equipped BOOLEAN DEFAULT FALSE,
          slot INT DEFAULT -1,
          INDEX idx_character_id (character_id),
          INDEX idx_equipped (equipped),
          FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
          FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Inserir dados iniciais
      await this.insertInitialData();
      
      logger.info('Tabelas inicializadas com sucesso');
    } catch (error) {
      logger.error('Erro ao inicializar tabelas:', error.message);
      console.error('Detalhes do erro de tabelas:', error);
    }
  }

  // Método para verificar e adicionar coluna last_update se não existir
  async addLastUpdateColumnIfNotExists() {
    try {
      const [columns] = await this.connection.execute(`
        SELECT COUNT(*) as column_exists 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'servers' 
        AND COLUMN_NAME = 'last_update' 
        AND TABLE_SCHEMA = ?
      `, [this.config.database]);

      if (columns[0].column_exists === 0) {
        logger.info('Adicionando coluna last_update à tabela servers...');
        await this.connection.execute(`
          ALTER TABLE servers 
          ADD COLUMN last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        `);
        logger.info('Coluna last_update adicionada com sucesso');
      }
    } catch (error) {
      logger.error('Erro ao verificar/adicionar coluna last_update:', error.message);
    }
  }

  async insertInitialData() {
    try {
      // Verificar se já existem servidores
      const [servers] = await this.connection.execute('SELECT COUNT(*) as count FROM servers');
      if (servers[0].count === 0) {
        await this.connection.execute(`
          INSERT INTO servers (name, status, player_count, max_players) VALUES
          ('Server 1 - Gludin', 'online', 0, 1000),
          ('Server 2 - Giran', 'online', 0, 1000),
          ('Server 3 - Dion', 'maintenance', 0, 1000)
        `);
      }

      // Verificar se já existem monstros
      const [monsters] = await this.connection.execute('SELECT COUNT(*) as count FROM monsters');
      if (monsters[0].count === 0) {
        await this.connection.execute(`
          INSERT INTO monsters (name, level, hp, max_hp, atk, def, exp, pos_x, pos_y, pos_z, map, respawn_time) VALUES
          ('Goblin', 1, 30, 30, 8, 3, 5, 10.5, 0, 15.2, 'village_of_gludin', 30),
          ('Wolf', 3, 50, 50, 12, 5, 10, -5.3, 0, 20.1, 'village_of_gludin', 45),
          ('Orc Warrior', 5, 80, 80, 18, 8, 20, 15.7, 0, -12.4, 'village_of_gludin', 60)
        `);
      }

      // Verificar se já existem itens
      const [items] = await this.connection.execute('SELECT COUNT(*) as count FROM items');
      if (items[0].count === 0) {
        await this.connection.execute(`
          INSERT INTO items (name, type, sub_type, stats, effect, price, weight) VALUES
          ('Short Sword', 'weapon', 'sword', '{"atk": 5, "str": 1}', NULL, 50, 2.5),
          ('Wooden Bow', 'weapon', 'bow', '{"atk": 4, "dex": 1}', NULL, 45, 2.0),
          ('Apprentice Robe', 'armor', 'cloth', '{"def": 3, "int": 1}', NULL, 30, 1.5),
          ('Health Potion', 'consumable', 'potion', '{}', 'restore_hp:20', 10, 0.5),
          ('Mana Potion', 'consumable', 'potion', '{}', 'restore_mp:15', 10, 0.5),
          ('Wolf Fang', 'material', 'quest', '{}', NULL, 5, 0.1)
        `);
      }
    } catch (error) {
      logger.error('Erro ao inserir dados iniciais:', error.message);
      console.error('Detalhes do erro ao inserir dados:', error);
    }
  }

  async query(sql, params) {
    try {
      const [rows] = await this.connection.execute(sql, params);
      return rows;
    } catch (error) {
      logger.error('Erro na consulta SQL:', error.message);
      console.error('SQL Error Details:', error);
      throw error;
    }
  }

  async end() {
    if (this.connection) {
      await this.connection.end();
      logger.info('Conexão com o banco de dados encerrada');
    }
  }
}

module.exports = new Database();