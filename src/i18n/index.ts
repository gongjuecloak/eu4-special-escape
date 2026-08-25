import * as vscode from 'vscode';

interface Message {
    [key: string]: string | Message;
}

const messages: Record<string, Message> = {
    'en': {
        'error': {
            'noEditor': 'Please open a file',
            'noSelection': 'Please select text to escape',
            'escape': 'Escape failed',
            'decode': 'Decode failed',
            'batch': 'Batch processing failed'
        },
        'success': {
            'escape': 'Escape completed! Processed {count} characters',
            'decode': 'Decode completed!',
            'cacheCleared': 'Cache cleared successfully'
        },
        'info': {
            'autoDetected': 'Auto-detected: {preset}'
        },
        'confirm': {
            'clearCache': 'Clear cache?'
        },
        'button': {
            'yes': 'Yes',
            'no': 'No'
        }
    },
    'zh-cn': {
        'error': {
            'noEditor': '请打开一个文件',
            'noSelection': '请选中需要转义的文本',
            'escape': '转义失败',
            'decode': '解码失败',
            'batch': '批量处理失败'
        },
        'success': {
            'escape': '转义完成！共处理 {count} 个字符',
            'decode': '解码完成！',
            'cacheCleared': '缓存已清除'
        },
        'info': {
            'autoDetected': '自动检测：{preset}'
        },
        'confirm': {
            'clearCache': '是否清除缓存？'
        },
        'button': {
            'yes': '是',
            'no': '否'
        }
    }
};

export function t(key: string, params?: Record<string, string>): string {
    const lang = vscode.env.language;
    const dict = messages[lang] || messages['en'];
    
    const keys = key.split('.');
    let result: any = dict;
    for (const k of keys) {
        if (result && typeof result === 'object') {
            result = result[k];
        } else {
            return key;
        }
    }
    
    if (typeof result !== 'string') return key;
    
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            result = result.replace(`{${k}}`, v);
        }
    }
    
    return result;
}