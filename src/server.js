import * as dotenv from "dotenv";

import { runTelegramBot } from "./telegram.js";
import { runTwitterBot } from "./twitter.js";

dotenv.config();
runTwitterBot(process.env);
runTelegramBot(process.env);
