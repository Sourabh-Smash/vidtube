// import mongoose from "mongoose";
// import logger from "../utils/logger.ts";
// const connectDB = async () => {
//   try {
//     const connectionInstance = await mongoose.connect(
//       `${process.env.MANGODB_URI}`
//     );
//     logger.info(`MangoDB connected ! ${connectionInstance.connection.host}`);
//   } catch (error) {
//     logger.error("MangoDB connection error ", error);
//     process.exit(1);
//   }
// };
// export default connectDB;

import mongoose from "mongoose";
import logger from "../utils/logger.ts";

const connectDB = async (): Promise<void> => {
  try {
    // if (!process.env.MONGODB_URI) {
    //   throw new Error("MONGODB_URI is not defined in the environment variables");
    // }

    const connectionInstance = await mongoose.connect(
      `mongodb+srv://sourabhmanawat:peOZ2lcQDiTqvMiT@vidtube-cluster.ur0zy.mongodb.net/?retryWrites=true&w=majority&appName=vidtube-cluster`,
    );

    logger.info(
      `MongoDB connected! DB Host: ${connectionInstance.connection.host}`,
    );
  } catch (error) {
    logger.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;
