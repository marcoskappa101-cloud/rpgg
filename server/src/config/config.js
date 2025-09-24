require('dotenv').config();

module.exports = {
  // Configurações do servidor
  server: {
    port: process.env.PORT || 3000,
    name: process.env.SERVER_NAME || 'Lineage2 Server',
    maxPlayers: parseInt(process.env.MAX_PLAYERS) || 1000
  },
  
  // Configurações do banco de dados
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lineage2_db'
  },
  
  // Configurações do jogo
  game: {
    expRate: parseFloat(process.env.EXP_RATE) || 1,
    dropRate: parseFloat(process.env.DROP_RATE) || 1,
    startingLevel: parseInt(process.env.STARTING_LEVEL) || 1,
    startingZone: process.env.STARTING_ZONE || 'village_of_gludin'
  }
};
