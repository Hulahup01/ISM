import {
    S_BOX,
    KEY,
    SYNC,
    C1,
    C2, 
} from './constants.js';
import fs from 'fs';


function encryptFile(srcFileName, dstFileName, key=KEY, sync=SYNC) {
    const data = fs.readFileSync(srcFileName);
    const encryptedData = encrypt(data);
    fs.writeFileSync(dstFileName, encryptedData);
    return encryptedData;
}

function encrypt(data, key=KEY, sync=SYNC) {;
    const gamma = generateGamma(sync, Math.ceil(data.length * 8 / key.length), key);
    let encryptedData = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) {
        encryptedData[i] = data[i] ^ (gamma[Math.floor(i / 8)] >> (i % 8 * 8)) & 0xFF;
    }
    return encryptedData;
}

function decryptFile(srcFileName, dstFileName, key=KEY, sync=SYNC) {
    const data = fs.readFileSync(srcFileName);
    const decryptedData = decrypt(data);
    fs.writeFileSync(dstFileName, decryptedData);
    return decryptedData;
}

function decrypt(data, key=KEY, sync=SYNC) {
    const gamma = generateGamma(sync, Math.ceil(data.length * 8 / key.length), key);
    let decryptedData = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) {
        decryptedData[i] = data[i] ^ (gamma[Math.floor(i / 8)] >> (i % 8 * 8)) & 0xFF;
    }
    return decryptedData;
}

function generateGamma(S, m, key) {
    const gamma = new Array(m);
    let N3 = combineBytesToUInt32(S[0], S[1], S[2], S[3]);
    let N4 = combineBytesToUInt32(S[4], S[5], S[6], S[7]);

    for (let i = 0; i < m; i++) {
        let tmp = encodeBlock(N3, key, false);
        N3 = N3 + C2;
        N4 = (N4 + C1 - 1);
        gamma[i] = tmp;
    }

    return gamma;
}

function encodeBlock(block, key, isDecrypt) {
    let N3 = block >> 16;
    let N4 = block;
    const keys = scheduleKeys(key, isDecrypt);

    for (let i = 0; i < 32; i++) {
        const newRightPart = N3 ^ calculateF(N4, keys[i]);
        N3 = N4;
        N4 = newRightPart;
    }

    return (N4 << 16) | N3;
}

function calculateF(rightPart, key) {
    rightPart = rightPart + key;

    for (let i = 0; i < 8; i++) {
        let value = (rightPart >> (4 * (7 - i))) & 0xF;
        value = S_BOX[i][value];
        rightPart = (rightPart & ~(0xF << (4 * (7 - i)))) | (value << (4 * (7 - i)));
    }

    return circularLeftShift(rightPart, 11);
}

function circularLeftShift(value, shiftValue) {
    return (value << shiftValue) | (value >>> (32 - shiftValue));
}

function scheduleKeys(sourceKey, isDecrypt = false) {
    const sourceKeys = combineByteKeyToUInt32Key(sourceKey);
    const resultKeys = new Array(32);

    for (let i = 0; i < 24; i++) {
        resultKeys[i] = sourceKeys[i % 8];
    }

    for (let i = 0; i < 8; i++) {
        resultKeys[31 - i] = sourceKeys[i];
    }

    if (isDecrypt) resultKeys.reverse();

    return resultKeys;
}

function combineByteKeyToUInt32Key(key) {
    const newKey = new Array(key.length / 4);
    for (let i = 0; i < newKey.length; i++) {
        newKey[i] = combineBytesToUInt32(
            key[i * 4], key[i * 4 + 1], key[i * 4 + 2], key[i * 4 + 3]
        );
    }
    return newKey;
}

function combineBytesToUInt32(first, second, third, fourth) {
    return (first << 24) | (second << 16) | (third << 8) | fourth;
}

export {encryptFile, decryptFile};