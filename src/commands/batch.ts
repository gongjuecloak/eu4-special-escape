import * as vscode from 'vscode';
import * as path from 'path';
import { encodeText } from '../core/encoder';
import { ErrorHandler } from '../utils/errorHandler';

export class BatchProcessor {
    static async execute(): Promise<void> {
        const folder = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            title: '选择需要处理本地化文件的文件夹'
        });

        if (!folder || folder.length === 0) return;

        // 查找所有 .yml 文件
        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(folder[0], '**/*.yml')
        );

        if (files.length === 0) {
            vscode.window.showWarningMessage('未找到 .yml 文件');
            return;
        }

        const confirm = await vscode.window.showInformationMessage(
            `将处理 ${files.length} 个文件，是否继续？`,
            '是',
            '否'
        );

        if (confirm !== '是') return;

        const config = vscode.workspace.getConfiguration('eu4SpecialEscape');
        const utf8 = config.get('utf8', true);
        const newVersion = config.get('newVersion', true);

        let processed = 0;
        let errors = 0;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: '批量转义中',
            cancellable: true
        }, async (progress, token) => {
            for (const file of files) {
                if (token.isCancellationRequested) {
                    break;
                }

                try {
                    const document = await vscode.workspace.openTextDocument(file);
                    const text = document.getText();
                    const escaped = encodeText(text, { utf8, newVersion });
                    
                    await vscode.workspace.fs.writeFile(
                        file,
                        Buffer.from(escaped, 'utf8')
                    );
                    
                    processed++;
                } catch (error) {
                    errors++;
                    ErrorHandler.handle(error, `处理 ${path.basename(file.fsPath)}`);
                }

                progress.report({
                    increment: (processed / files.length) * 100,
                    message: `${processed}/${files.length}: ${path.basename(file.fsPath)}`
                });
            }
        });

        if (errors === 0) {
            vscode.window.showInformationMessage(`✅ 处理完成！共 ${processed} 个文件`);
        } else {
            vscode.window.showWarningMessage(`⚠️ 处理完成！成功 ${processed} 个，失败 ${errors} 个`);
        }
    }
}