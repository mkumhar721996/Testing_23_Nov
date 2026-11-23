import { createApp } from "./app.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const host = arg("host") ?? process.env.HOST ?? "127.0.0.1";
const port = Number(arg("port") ?? process.env.PORT ?? 3000);

createApp().listen(port, host, () => {
  console.log(`background-worker listening on ${host}:${port}`);
});
