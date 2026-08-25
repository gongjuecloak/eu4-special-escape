import * as vscode from 'vscode';

export class ErrorHandler {
    static handle(error: any, context: string): void {
        const messages: Record<string, string> = {
            'EACCES': '权限不足，请检查文件是否被其他程序占用',
            'ENOENT': '文件不存在或路径错误',
            'EISDIR': '不能处理文件夹，请选择文件',
            'EPERM': '操作被拒绝，请检查文件权限'
        };

        let message = messages[error.code] || error.message || '未知错误';
        
        vscode.window.showErrorMessage(
            `❌ ${context}：${message}`,
            '查看详情'
        ).then(selection => {
            if (selection === '查看详情' && error.stack) {
                vscode.window.showErrorMessage(error.stack);
            }
        });
    }
}