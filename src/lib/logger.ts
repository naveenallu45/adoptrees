import winston from 'winston';

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'adoptrees-app' },
  transports: [
    // Write all logs to console in development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Security event logger
export const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'adoptrees-security' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Add security log file in production
if (process.env.NODE_ENV === 'production') {
  securityLogger.add(
    new winston.transports.File({
      filename: 'logs/security.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    })
  );
}

// Payment logger for financial transactions
export const paymentLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'adoptrees-payments' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Add payment log file in production
if (process.env.NODE_ENV === 'production') {
  paymentLogger.add(
    new winston.transports.File({
      filename: 'logs/payments.log',
      maxsize: 5242880, // 5MB
      maxFiles: 20, // Keep more payment logs for audit
    })
  );
}

// Structured logging functions
export const logInfo = (message: string, meta?: Record<string, unknown>) => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error, meta?: Record<string, unknown>) => {
  logger.error(message, { error: error?.stack, ...meta });
};

export const logWarning = (message: string, meta?: Record<string, unknown>) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: Record<string, unknown>) => {
  logger.debug(message, meta);
};

// Security logging
export const logSecurityEvent = (event: string, details: Record<string, unknown>, ip: string) => {
  securityLogger.info('Security Event', {
    event,
    ip,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

// Payment logging
export const logPaymentEvent = (event: string, details: Record<string, unknown>) => {
  paymentLogger.info('Payment Event', {
    event,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

// Performance logging
export const logPerformance = (operation: string, duration: number, meta?: Record<string, unknown>) => {
  logger.info('Performance Metric', {
    operation,
    duration,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

export default logger;
