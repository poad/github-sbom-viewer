import * as childProcess from 'child_process';
import * as fs from 'fs';

export function buildFrontend(clintId: string) {
  [`${process.cwd()}/../app/dist`].forEach(
    (dir) => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, {
          recursive: true,
        });
      }
    },
  );

  ['pnpm build'].forEach((cmd) => {
    childProcess.execSync(cmd, {
      cwd: `${process.cwd()}/../app`,
      stdio: ['ignore', 'inherit', 'inherit'],
      env: { ...process.env, VITE_GITHUB_APPS_CLIENT_ID: clintId },
      shell: 'bash',
    });
  });
};
