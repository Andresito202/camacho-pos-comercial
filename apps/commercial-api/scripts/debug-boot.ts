import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { AppModule } from "../src/app.module.js";

async function main() {
  try {
    const app = await NestFactory.create(AppModule, new FastifyAdapter({ logger: true }), {
      logger: ["error", "warn", "debug", "log"],
      abortOnError: false,
    });
    console.log("APP_OK");
    await app.close();
  } catch (error) {
    console.error("APP_FAIL");
    console.error(error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
