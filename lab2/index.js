import { encryptFile, decryptFile } from'./cipher.js';

const args = process.argv.slice(2);
if (args.length < 1) {
    console.error('[!] ENTER MODE (encrypt/decrypt).');
    process.exit(1);
}

const mode = args[0];

if (mode === 'encrypt') {
    const data = encryptFile('plain.txt', 'encryption.txt');
    console.log('Text successfully encrypted');
    console.log(data);
} else if (mode === 'decrypt') {
    const data = decryptFile('encryption.txt', 'decryption.txt');
    console.log('Text was successfully decrypted');
    console.log(data);
} else {
    console.error('[!] WRONG MODE');
}