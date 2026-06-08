import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { BUILD_SCRIPT, PROJECT_ROOT, hasWorkspace, getMgPath } from '../config.js';
import { resolveManifestPath } from '../utils/manifest.js';

interface BuildResult {
  success: boolean;
  stdout: string;
  stderr: string;
  outputFiles: Array<{ path: string; format: string; size: number }>;
  duration: number;
}

export async function buildDocument(
  manifestPath?: string,
  format?: 'pdf' | 'docx',
): Promise<BuildResult> {
  const resolved = resolveManifestPath(manifestPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`マニフェストが見つかりません: ${resolved}`);
  }

  const args = [BUILD_SCRIPT, resolved];
  if (format === 'pdf') args.push('--pdf');
  if (format === 'docx') args.push('--docx');

  // 出力先: ワークスペースがあれば mg_output/pdf/ or mg_output/docx/、なければ report-build-system/output/
  const outputDir = hasWorkspace()
    ? getMgPath(format || '')
    : path.join(PROJECT_ROOT, 'output');

  const start = Date.now();

  return new Promise((resolve) => {
    execFile('python3', args, {
      cwd: PROJECT_ROOT,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
    }, (error, stdout, stderr) => {
      const duration = Date.now() - start;

      // 生成ファイルを収集
      const outputFiles: BuildResult['outputFiles'] = [];
      if (fs.existsSync(outputDir)) {
        const manifestStem = path.basename(resolved, path.extname(resolved));
        for (const file of fs.readdirSync(outputDir)) {
          if (file.startsWith(manifestStem)) {
            const filePath = path.join(outputDir, file);
            const stat = fs.statSync(filePath);
            outputFiles.push({
              path: filePath,
              format: path.extname(file).slice(1),
              size: stat.size,
            });
          }
        }
      }

      resolve({
        success: !error,
        stdout: stdout || '',
        stderr: stderr || '',
        outputFiles,
        duration,
      });
    });
  });
}
