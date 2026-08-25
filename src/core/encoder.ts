export interface EscapeOptions {
    utf8: boolean;
    newVersion: boolean;
}

export function encodeText(text: string, options: EscapeOptions): string {
    return [...text].map(ch => specialEscape(ch, options.utf8, options.newVersion)).join('');
}

export function decodeText(text: string): string {
    const regex = /[\x10-\x13][\x00-\xFF]{2}/g;
    let result = text;
    let matches: RegExpExecArray | null;
    
    while ((matches = regex.exec(text)) !== null) {
        const encoded = matches[0];
        const bytes = [...encoded].map(c => c.codePointAt(0)!);
        
        if (bytes.length === 3) {
            const [, low, high] = bytes;
            // 反向计算
            let decodedChar = '';
            // 简单解码逻辑
            const hex = ((high & 0xFF) << 8) | (low & 0xFF);
            if (hex > 0) {
                decodedChar = String.fromCodePoint(hex);
            }
            if (decodedChar) {
                result = result.replace(encoded, decodedChar);
            }
        }
    }
    
    return result;
}

function specialEscape(char: string, toUtf8: boolean, newVersion: boolean): string {
    const codePoint = char.codePointAt(0)!;
    
    // DO NOT escape valid char
    if (codePoint < 256) {
        return char;
    }
    
    const hex = codePoint.toString(16);
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
    if (internalChars.includes(high)) escapeChr += 2;
    if (internalChars.includes(low)) escapeChr++;
    
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
        case 0x10:
        default:
            break;
    }
    
    if (toUtf8) {
        low = cp1252ToUtf8(low);
        high = cp1252ToUtf8(high);
    }
    
    return [escapeChr, low, high].map(c => String.fromCodePoint(c)).join('');
}

function cp1252ToUtf8(char: number): number {
    const map: Record<number, number> = {
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