import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import users from "./routes/utilisateur.ts";
import lists from "./routes/liste.ts";
import { HttpError } from "./contracts.ts";
const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "16kb" }));
app.use((req, res, next) => {
  if (
    process.env.CLIENT_ORIGIN &&
    req.headers.origin === process.env.CLIENT_ORIGIN
  ) {
    res.set("Access-Control-Allow-Origin", process.env.CLIENT_ORIGIN);
    res.vary("Origin");
    res.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, DELETE, OPTIONS",
    );
    res.set(
      "Access-Control-Allow-Headers",
      "Content-Type, x-access-token, x-refresh-token, _id, Idempotency-Key",
    );
    res.set("Access-Control-Expose-Headers", "x-access-token, x-refresh-token");
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use(
  "/utilisateurs",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    message: { message: "Trop de demandes. Réessayez dans quelques minutes." },
  }),
);
app.use("/", users);
app.use("/listes", lists);
app.use((_req, res) =>
  res.status(404).json({ message: "Ressource introuvable." }),
);
const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  const duplicate =
    error instanceof Error && "code" in error && error.code === 11000;
  const invalid =
    error instanceof TypeError ||
    (error instanceof Error &&
      ["ValidationError", "CastError"].includes(error.name));
  const status = duplicate
    ? 409
    : invalid
      ? 400
      : error instanceof HttpError
        ? error.status
        : error instanceof Error &&
            "status" in error &&
            typeof error.status === "number"
          ? error.status
          : 500;
  res.status(status).json({
    message: duplicate
      ? "Cette adresse email est déjà utilisée."
      : status === 400
        ? "Vérifiez les informations saisies."
        : error instanceof HttpError
          ? error.message
          : "Une erreur est survenue. Réessayez.",
  });
};
app.use(errors);
export default app;
