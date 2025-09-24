const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

// Criar diretório de logs se não existir
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Formato de log personalizado
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Transportes (saídas) para os logs
const transports = [
  // Arquivo de log de erros
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),
  // Arquivo de log combinado
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 5
  })
];

// Em desenvolvimento, também logar para o console
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  );
}

// Criar o logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'lineage2-server' },
  transports
});

// Stream para Morgan (logging HTTP)
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

module.exports = logger;