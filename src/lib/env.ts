/**
 * Centralized env access. Everything is optional so the MVP runs locally with
 * zero configuration (guest mode + mock onchain flows). When real keys are
 * present, the corresponding real flows activate.
 */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",

  solanaNetwork: (process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet") as
    | "devnet"
    | "mainnet-beta",
  solanaRpcUrl:
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com",

  tokenMint: process.env.NEXT_PUBLIC_MEMEARENA_TOKEN_MINT ?? "",
  treasuryWallet: process.env.NEXT_PUBLIC_TREASURY_WALLET ?? "",
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

/** Onchain token transfers require both a mint and a treasury wallet. */
export const isOnchainConfigured = Boolean(env.tokenMint && env.treasuryWallet);
