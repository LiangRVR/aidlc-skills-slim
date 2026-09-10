import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { EngineError } from './errors.js';
import { deleteRepositoryFile, MAX_TRANSACTION_BYTES, parseJson, readTextIfExists, repositoryPath, TXN_RELATIVE_PATH, writeTextAtomic } from './storage.js';
import { ENGINE_VERSION } from './types.js';
function validateTransaction(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new EngineError('INVALID_TRANSACTION', 'Transaction record must be an object');
    const tx = value;
    if (tx.transaction_version !== 1 || typeof tx.engine_version !== 'string' || typeof tx.id !== 'string' || typeof tx.operation !== 'string' || typeof tx.started_at !== 'string' || !Array.isArray(tx.files)) {
        throw new EngineError('INVALID_TRANSACTION', 'Transaction record is malformed');
    }
    for (const file of tx.files) {
        if (!file || typeof file !== 'object' || typeof file.path !== 'string')
            throw new EngineError('INVALID_TRANSACTION', 'Transaction file entry is malformed');
        const before = file.before;
        const after = file.after;
        if (!(typeof before === 'string' || before === null) || !(typeof after === 'string' || after === null))
            throw new EngineError('INVALID_TRANSACTION', 'Transaction file contents must be string or null');
    }
    return tx;
}
export function pendingTransactionExists(root) {
    return existsSync(repositoryPath(root, TXN_RELATIVE_PATH));
}
export function readPendingTransaction(root) {
    const raw = readTextIfExists(root, TXN_RELATIVE_PATH, MAX_TRANSACTION_BYTES);
    if (raw === null)
        return null;
    return validateTransaction(parseJson(raw, TXN_RELATIVE_PATH));
}
export function ensureNoPendingTransaction(root) {
    if (pendingTransactionExists(root))
        throw new EngineError('RECOVERY_REQUIRED', `Pending transaction exists at ${TXN_RELATIVE_PATH}; run doctor --repair`);
}
function applyContent(root, path, content) {
    if (content === null)
        deleteRepositoryFile(root, path);
    else
        writeTextAtomic(root, path, content);
}
export function commitTransaction(root, operation, mutations) {
    ensureNoPendingTransaction(root);
    const unique = new Set();
    const files = mutations.map((mutation) => {
        repositoryPath(root, mutation.path);
        if (unique.has(mutation.path))
            throw new EngineError('INVALID_TRANSACTION', `Duplicate transaction path: ${mutation.path}`);
        unique.add(mutation.path);
        return { path: mutation.path, before: readTextIfExists(root, mutation.path), after: mutation.after };
    });
    const tx = {
        transaction_version: 1,
        engine_version: ENGINE_VERSION,
        id: randomUUID(),
        operation,
        started_at: new Date().toISOString(),
        files,
    };
    const body = `${JSON.stringify(tx, null, 2)}\n`;
    if (Buffer.byteLength(body, 'utf8') > MAX_TRANSACTION_BYTES) {
        throw new EngineError('TRANSACTION_TOO_LARGE', `Transaction exceeds ${MAX_TRANSACTION_BYTES} bytes`);
    }
    writeTextAtomic(root, TXN_RELATIVE_PATH, body);
    const applied = [];
    try {
        for (const file of files) {
            applyContent(root, file.path, file.after);
            applied.push(file);
        }
        deleteRepositoryFile(root, TXN_RELATIVE_PATH);
    }
    catch (error) {
        let rollbackFailed = false;
        for (const file of [...applied].reverse()) {
            try {
                applyContent(root, file.path, file.before);
            }
            catch {
                rollbackFailed = true;
            }
        }
        if (!rollbackFailed) {
            try {
                deleteRepositoryFile(root, TXN_RELATIVE_PATH);
            }
            catch {
                rollbackFailed = true;
            }
        }
        if (rollbackFailed)
            throw new EngineError('TRANSACTION_RECOVERY_REQUIRED', `Mutation failed and rollback was incomplete: ${error.message}`);
        throw error;
    }
}
export function recoverPendingTransaction(root) {
    const tx = readPendingTransaction(root);
    if (!tx)
        return null;
    for (const file of tx.files) {
        const current = readTextIfExists(root, file.path);
        if (current !== file.before && current !== file.after)
            throw new EngineError('RECOVERY_CONFLICT', `Cannot recover transaction ${tx.id}; ${file.path} differs from both before and after images`);
    }
    for (const file of tx.files)
        applyContent(root, file.path, file.after);
    deleteRepositoryFile(root, TXN_RELATIVE_PATH);
    return tx.operation;
}
