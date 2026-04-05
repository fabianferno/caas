import { MongoClient } from "mongodb";

declare global {
  var _mongoClient: MongoClient | undefined; // eslint-disable-line no-var
}

export function getMongoClient(): MongoClient {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI environment variable is not set");

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClient) {
      global._mongoClient = new MongoClient(uri);
    }
    return global._mongoClient;
  }

  return new MongoClient(uri);
}
