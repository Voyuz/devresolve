/** Git must not inherit application/service credentials or prompt for login. */
export function gitEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { GIT_TERMINAL_PROMPT: "0", NODE_ENV: "production" };
  for (const [name, value] of Object.entries(process.env)) {
    if (/^(path|home|userprofile|systemroot|windir|temp|tmp|appdata|localappdata|programfiles(?:\(x86\))?|pathext|https?_proxy|no_proxy|all_proxy)$/i.test(name)) env[name] = value;
  }
  return env;
}
