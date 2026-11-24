import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsOutboxWorker } from "./notifications.worker.js";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsOutboxWorker],
  exports: [NotificationsOutboxWorker],
})
export class NotificationsModule {}
