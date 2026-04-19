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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connection = void 0;
exports.getOracleKeypair = getOracleKeypair;
exports.validateSolanaEnv = validateSolanaEnv;
exports.getProgramId = getProgramId;
exports.getProvider = getProvider;
exports.getCreditProfilePda = getCreditProfilePda;
exports.getLoanPda = getLoanPda;
exports.getVaultPda = getVaultPda;
const web3_js_1 = require("@solana/web3.js");
const anchor = __importStar(require("@coral-xyz/anchor"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// ── Connection ─────────────────────────────────────────────────────────────
exports.connection = new web3_js_1.Connection(process.env.SOLANA_RPC_URL || (0, web3_js_1.clusterApiUrl)("devnet"), "confirmed");
// ── Oracle Keypair ─────────────────────────────────────────────────────────
// Loaded from ORACLE_KEYPAIR env variable (the JSON array from oracle-keypair.json)
function getOracleKeypair() {
    const raw = process.env.ORACLE_KEYPAIR;
    if (!raw)
        throw new Error("ORACLE_KEYPAIR env variable not set");
    const bytes = JSON.parse(raw);
    return web3_js_1.Keypair.fromSecretKey(Uint8Array.from(bytes));
}
function validateSolanaEnv() {
    const missing = [];
    if (!process.env.PROGRAM_ID)
        missing.push("PROGRAM_ID");
    if (!process.env.ORACLE_KEYPAIR)
        missing.push("ORACLE_KEYPAIR");
    if (missing.length > 0) {
        throw new Error(`Missing required env vars: ${missing.join(", ")}`);
    }
    // Validate values eagerly to fail fast on malformed settings.
    getProgramId();
    getOracleKeypair();
}
// ── Program ID ────────────────────────────────────────────────────────────
function getProgramId() {
    const id = process.env.PROGRAM_ID;
    if (!id)
        throw new Error("PROGRAM_ID env variable not set");
    return new web3_js_1.PublicKey(id);
}
// ── Anchor Provider ───────────────────────────────────────────────────────
function getProvider() {
    const oracle = getOracleKeypair();
    const wallet = new anchor.Wallet(oracle);
    return new anchor.AnchorProvider(exports.connection, wallet, {
        commitment: "confirmed",
    });
}
// ── PDA helpers ───────────────────────────────────────────────────────────
function getCreditProfilePda(borrower) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("credit"), borrower.toBuffer()], getProgramId());
}
function getLoanPda(borrower, loanId) {
    const idBuffer = Buffer.alloc(8);
    idBuffer.writeBigUInt64LE(BigInt(loanId));
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("loan"), borrower.toBuffer(), idBuffer], getProgramId());
}
function getVaultPda(loanPda) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("vault"), loanPda.toBuffer()], getProgramId());
}
