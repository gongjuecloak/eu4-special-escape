"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
function cp1252ToUtf8(char) {
    const map = {
        0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E,
        0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6,
        0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039, 0x8C: 0x0152,
        0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C,
        0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
        0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A,
        0x9C: 0x0153, 0x9E: 0x017E, 0x9F: 0x0178
    };
    return map[char] || char;
}
function specialEscape(char, toUtf8, newVersion) {
    if (char.codePointAt(0) < 256) {
        return char;
    }
    const hex = char.codePointAt(0).toString(16);
    let low = parseInt(hex.slice(-2), 16);
    let high = parseInt(hex.slice(0, 2), 16);
    let lowByteOffset = newVersion ? 14 : 15;
    const highByteOffset = -9;
    const internalChars = [
        0x00, 0x0A, 0x0D, 0x20, 0x22, 0x24,
        0x40, 0x5B, 0x5C, 0x7B, 0x7D, 0x7E, 0x80,
        0xA3, 0xA4, 0xA7, 0xBD, 0x3B, 0x5D, 0x5F, 0x3D, 0x23
    ];
    if (toUtf8) {
        internalChars.push(0x2F);
        if (!newVersion) {
            const index = internalChars.indexOf(0x20);
            if (index > -1) {
                internalChars.splice(index, 1);
            }
        }
    }
    let escapeChr = 0x10;
    if (internalChars.includes(high))
        escapeChr += 2;
    if (internalChars.includes(low))
        escapeChr++;
    switch (escapeChr) {
        case 0x11:
            low += lowByteOffset;
            break;
        case 0x12:
            high += highByteOffset;
            break;
        case 0x13:
            low += lowByteOffset;
            high += highByteOffset;
            break;
    }
    if (toUtf8) {
        low = cp1252ToUtf8(low);
        high = cp1252ToUtf8(high);
    }
    return [escapeChr, low, high].map(c => String.fromCodePoint(c)).join('');
}
function encodeText(text, options) {
    return [...text].map(ch => specialEscape(ch, options.utf8, options.newVersion)).join('');
}
function activate(context) {
    console.log('EU4 Special Escape 已激活');
    let disposable = vscode.commands.registerCommand('eu4-special-escape.escape', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('❌ 请打开一个文件');
            return;
        }
        const selection = editor.selection;
        const text = editor.document.getText(selection);
        if (!text) {
            vscode.window.showErrorMessage('❌ 请选中需要转义的文本');
            return;
        }
        const config = vscode.workspace.getConfiguration('eu4SpecialEscape');
        const utf8 = config.get('utf8', true);
        const newVersion = config.get('newVersion', true);
        try {
            const escaped = encodeText(text, { utf8, newVersion });
            await editor.edit(editBuilder => {
                editBuilder.replace(selection, escaped);
            });
            vscode.window.showInformationMessage(`✅ 转义完成！共处理 ${[...text].length} 个字符`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`❌ 转义失败：${error}`);
        }
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map