import winston from "winston"

//Logs for warnings or errors
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
})

//Check if the environment is not production
if (process.env.NODE_ENV !== "production") { 
    //If not production, add a console transport
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),  //Colorize the logs
        winston.format.simple()  //Simple format
      ),
    })
  )
}

export { logger }
