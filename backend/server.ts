import app from "./app.ts";
import { connect, mongoose } from "./db/mongoose.ts";
import { secret } from "./auth.ts";
secret();
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT doit être un port TCP valide.");
connect()
  .then(() => {
    const server = app.listen(port, () => console.log("API courses prête."));
    for (const signal of ["SIGINT", "SIGTERM"])
      process.on(signal, () =>
        server.close(async () => {
          await mongoose.disconnect();
          process.exit(0);
        }),
      );
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
