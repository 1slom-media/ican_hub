import { WinstonModule, utilities } from 'nest-winston';
import * as winston from 'winston';

export const winstonLogger = WinstonModule.createLogger({
  transports: [
    // new winston.transports.Console({
    //   format: winston.format.combine(
    //     winston.format.timestamp(),
    //     utilities.format.nestLike(), // NestJS uslubidagi log
    //   ),
    // }),
    new winston.transports.File({
      filename: 'logs/app.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, message }) => {
          return `{\n[${timestamp}]\n${message}},\n`;
        }),
      ),
    }),
  ],
});
