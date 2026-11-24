import "reflect-metadata";
import { config as loadDotenv } from "dotenv";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { loadEnv } from "@camacho-pos-comercial/configuration";
import { AppModule } from "./app.module.js";

loadDotenv({ path: new URL("../../../.env", import.meta.url).pathname });

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: env.NODE_ENV !== "test" }),
  );

  app.enableCors({
    origin: [env.PUBLIC_SITE_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  });
  app.setGlobalPrefix("v1", { exclude: ["health"] });

  await app.listen(env.PORT, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`commercial-api listening on :${env.PORT} (${env.NODE_ENV})`);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
