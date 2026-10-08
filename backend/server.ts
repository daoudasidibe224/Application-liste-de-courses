import app from './app.ts';
import { connect, mongoose } from './db/mongoose.ts';
import { secret } from './auth.ts';
secret();
connect().then(() => {
 const server = app.listen(process.env.PORT || 3000, () => console.log('API courses prête.'));
 for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => { await mongoose.disconnect(); process.exit(0); }));
}).catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
