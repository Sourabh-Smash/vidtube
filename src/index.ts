import dotenv from "dotenv";
import logger from "./utils/logger.ts";
import morgan from "morgan";
import { app } from "./app.ts";
import connectDB from "./db/index.ts";
dotenv.config({ path: "./.env" });

const morganFormat = ":method :url :status :response-time ms";
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const logObject = {
          method: message.split(" ")[0],
          url: message.split(" ")[1],
          status: message.split(" ")[2],
          responseTime: message.split(" ")[3],
        };
        logger.info(JSON.stringify(logObject));
      },
    },
  })
);

const PORT = process.env.PORT || 8001;
connectDB()
  .then(() =>
    app.listen(PORT, () => logger.info(`Server is running on port : ${PORT}`))
  )
  .catch((err) => logger.error(`MangoDb connection failed ${err}`));
