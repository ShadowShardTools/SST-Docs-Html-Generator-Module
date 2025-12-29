import { resolve } from "node:path";
import { cwd, env } from "node:process";

import appRoot from "app-root-path";

let cachedRoot: string | undefined;

const resolveHostRoot = () => {
  const candidate = env.APP_ROOT_PATH ?? env.INIT_CWD ?? cwd();
  return resolve(candidate);
};

export const ensureAppRootPath = () => {
  if (cachedRoot) return cachedRoot;

  const hostRoot = resolveHostRoot();

  if (!env.APP_ROOT_PATH) {
    env.APP_ROOT_PATH = hostRoot;
  }

  appRoot.setPath(hostRoot);
  cachedRoot = appRoot.path;

  return cachedRoot;
};

ensureAppRootPath();
