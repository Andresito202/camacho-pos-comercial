import { Inject, Controller, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../../common/auth/admin.guard.js";
import { NotificationsOutboxWorker } from "./notifications.worker.js";

@Controller("notifications")
export class NotificationsController {
  constructor(@Inject(NotificationsOutboxWorker) private readonly worker: NotificationsOutboxWorker) {}

  @Post("worker/run")
  @UseGuards(AdminGuard)
  run() {
    return this.worker.processDue();
  }
}
