import { 
    KEY,
    SYNC,
    H_BOX
} from './constants.js';
import fs from 'fs';


function encryptFile(srcFileName, dstFileName, key=KEY, sync=SYNC) {
    const data = fs.readFileSync(srcFileName);
    const encryptedData = encrypt(data, sync, key);
    fs.writeFileSync(dstFileName, encryptedData);
    return encryptedData;
}

function decryptFile(srcFileName, dstFileName, key=KEY, sync=SYNC) {
    const data = fs.readFileSync(srcFileName);
    const decryptedData = encrypt(data, sync, key);
    fs.writeFileSync(dstFileName, decryptedData);
    return decryptedData;
}

function encrypt(x, s, keyParts, decrypt=false) {
    const result = Buffer.alloc(x.length);
    if (decrypt) {
        let Y = decryptBlock(s, keyParts);
        for (let i = 0; i < x.length; i += 16) {
            const es = encryptBlock(Y, keyParts);
            Y = es ^ x;
            for (let j = 0; j < 16 && i + j < x.length; j++) {
                const pos = i + j;
                result.writeUInt8(x[pos] ^ (Number(es[Math.ceil(j / 4)]) >> ((3 - j % 4) * 8) & (2 ** 8 - 1)), pos);
            }
        }
    
        return result;
    }
    let Y = encryptBlock(s, keyParts);

    for (let i = 0; i < x.length; i += 16) {
        const es = encryptBlock(Y, keyParts);
        Y = es;
        for (let j = 0; j < 16 && i + j < x.length; j++) {
            const pos = i + j;
            result.writeUInt8(x[pos] ^ (Number(es[Math.ceil(j / 4)]) >> ((3 - j % 4) * 8) & (2 ** 8 - 1)), pos);
        }
    }

    return result;
}

function reverseBytesOrder(a) {
    let c = 0n;
    for (let i = 0n; i < 4n; i++) {
        c |= (a & 0xFFn) << (3n - i) * 8n;
        a >>= 8n;
    }
    return c;
}

function modAdd(a, b) {
    const aReversed = reverseBytesOrder(a);
    const bReversed = reverseBytesOrder(b);

    return reverseBytesOrder((aReversed + bReversed) & (2n ** 32n - 1n));
}

function modSub(a, b) {
    const aReversed = reverseBytesOrder(a);
    const bReversed = reverseBytesOrder(b);

    return reverseBytesOrder((aReversed - bReversed) & (2n ** 32n - 1n));
}

function rotHi(value, k) {
    return (value >> (32n - k)) ^ ((value << k) % (2n ** 32n));
}

function hTransform(value) {
    const i = value >> 4n;
    const j = value & 0b1111n;

    return BigInt(H_BOX[Number(i)][Number(j)]);
}

function gTransform(value, rot) {
    const v1 = (value >> 24n) & 0xFFn;
    const v2 = (value >> 16n) & 0xFFn;
    const v3 = (value >> 8n) & 0xFFn;
    const v4 = value & 0xFFn;

    const hTransformed = (hTransform(v1) << 24n) |
        (hTransform(v2) << 16n) |
        (hTransform(v3) << 8n) |
        hTransform(v4);

    const hTransformedReversed = reverseBytesOrder(hTransformed);

    return reverseBytesOrder(rotHi(hTransformedReversed, BigInt(rot)));
}

function getKeyPart(keyParts, index) {
    return keyParts[(Number(index) - 1) % 8];
}

function encryptBlock(block, keyParts) {

    let [a, b, c, d] = block;

    for (let i = 1; i <= 8; i++) {
        b = b ^ gTransform(modAdd(a, getKeyPart(keyParts, 7 * i - 6)), 5);
        c = c ^ gTransform(modAdd(d, getKeyPart(keyParts, 7 * i - 5)), 21);
        a = modSub(a, gTransform(modAdd(b, getKeyPart(keyParts, 7 * i - 4)), 13));
        const e = gTransform(modAdd(modAdd(b, c), getKeyPart(keyParts, 7 * i - 3)), 21) ^ BigInt(i << 24);
        b = modAdd(b, e);
        c = modSub(c, e);
        d = modAdd(d, gTransform(modAdd(c, getKeyPart(keyParts, 7 * i - 2)), 13));
        b = b ^ gTransform(modAdd(a, getKeyPart(keyParts, 7 * i - 1)), 21);
        c = c ^ gTransform(modAdd(d, getKeyPart(keyParts, 7 * i)), 5);
        [a, b] = [b, a];
        [c, d] = [d, c];
        [b, c] = [c, b];
    }

    return [b, d, a, c];
}

function decryptBlock(block, keyParts) {

    let [a, b, c, d] = block;
    
    for (let i = 1; i <= 8; i++) {
        b = b ^ gTransform(modAdd(a, getKeyPart(keyParts, 7 * i)), 5);
        c = c ^ gTransform(modAdd(d, getKeyPart(keyParts, 7 * i - 1)), 21);
        a = modSub(a, gTransform(modAdd(b, getKeyPart(keyParts, 7 * i - 2)), 13));
        const e = gTransform(modAdd(modAdd(b, c), getKeyPart(keyParts, 7 * i - 3)), 21) ^ BigInt(i << 24);
        b = modAdd(b, e);
        c = modSub(c, e);
        d = modAdd(d, gTransform(modAdd(c, getKeyPart(keyParts, 7 * i - 4)), 13));
        b = b ^ gTransform(modAdd(a, getKeyPart(keyParts, 7 * i - 5)), 21);
        c = c ^ gTransform(modAdd(d, getKeyPart(keyParts, 7 * i - 6)), 5);
        [a, b] = [b, a];
        [c, d] = [d, c];
        [a, d] = [d, a];
    }

    return [c, a, d, b];
}

export {encryptFile, decryptFile};