"use client";

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import { useEffect, useMemo, useState } from "react";

globalThis.Buffer = Buffer;

const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const MEMO_PROGRAM = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);
const MAX_MESSAGE = 280;

type WalletProvider = {
  isPhantom?: boolean;
  publicKey?: PublicKey;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect?: () => Promise<void>;
  signAndSendTransaction: (
    transaction: Transaction,
  ) => Promise<{ signature: string }>;
};

type MuralMessage = {
  text: string;
  wallet: string;
  signature: string;
  createdAt: string;
};

declare global {
  interface Window {
    solana?: WalletProvider;
    phantom?: { solana?: WalletProvider };
  }
}

const seedMessages: MuralMessage[] = [
  {
    text: "Bora construir o futuro aberto.",
    wallet: "7xDk...a9F2",
    signature: "",
    createdAt: "Mensagem da comunidade",
  },
  {
    text: "Floripa está on-chain 🌊",
    wallet: "H3mN...kL8q",
    signature: "",
    createdAt: "TDC Floripa 2026",
  },
  {
    text: "TDC + Solana = energia pura.",
    wallet: "9pQr...Zt7b",
    signature: "",
    createdAt: "Superteam Brasil",
  },
];

function shortAddress(value: string) {
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function findWalletProvider() {
  return window.phantom?.solana ?? window.solana ?? null;
}

async function waitForWalletProvider(timeoutMs = 2500) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const detected = findWalletProvider();
    if (detected) return detected;
    await new Promise((resolve) => window.setTimeout(resolve, 150));
  }
  return null;
}

async function waitForBackendValidation(signature: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch(
      `/api/validate?signature=${encodeURIComponent(signature)}`,
      { cache: "no-store" },
    );
    if (response.ok) return true;
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
  }
  return false;
}

export default function Home() {
  const [provider, setProvider] = useState<WalletProvider | null>(null);
  const [wallet, setWallet] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("Pronto para conectar");
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastSignature, setLastSignature] = useState("");
  const [messages, setMessages] = useState<MuralMessage[]>(seedMessages);

  const connection = useMemo(
    () => new Connection(RPC_ENDPOINT, "confirmed"),
    [],
  );

  useEffect(() => {
    const refreshProvider = () => {
      const detected = findWalletProvider();
      if (detected) {
        setProvider(detected);
        setStatus((current) =>
          current === "Carteira não detectada neste navegador"
            ? "Phantom detectada — pronta para conectar"
            : current,
        );
      }
    };
    refreshProvider();
    const detectionTimer = window.setInterval(refreshProvider, 500);
    window.addEventListener("load", refreshProvider);

    const saved = window.localStorage.getItem("solana-tdc-mural");
    if (saved) {
      try {
        setMessages([...JSON.parse(saved), ...seedMessages]);
      } catch {
        window.localStorage.removeItem("solana-tdc-mural");
      }
    }
    return () => {
      window.clearInterval(detectionTimer);
      window.removeEventListener("load", refreshProvider);
    };
  }, []);

  async function connectWallet() {
    setStatus("Procurando a Phantom neste navegador...");
    const activeProvider = provider ?? (await waitForWalletProvider());
    if (!activeProvider) {
      setStatus("Carteira não detectada neste navegador");
      return;
    }

    try {
      setProvider(activeProvider);
      setStatus("Aguardando autorização...");
      const result = await activeProvider.connect();
      setWallet(result.publicKey.toBase58());
      setStatus("Carteira conectada à devnet");
    } catch {
      setStatus("Conexão cancelada");
    }
  }

  async function publishMessage() {
    const cleanMessage = message.trim();
    if (!provider || !wallet || !cleanMessage || isPublishing) return;
    let submittedSignature = "";

    try {
      setIsPublishing(true);
      setLastSignature("");
      setStatus("Preparando transação...");

      const latest = await connection.getLatestBlockhash("confirmed");
      const transaction = new Transaction({
        feePayer: new PublicKey(wallet),
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      }).add(
        new TransactionInstruction({
          keys: [],
          programId: MEMO_PROGRAM,
          data: new TextEncoder().encode(`[Solana TDC Mural] ${cleanMessage}`),
        }),
      );

      setStatus("Confirme a transação na carteira");
      const { signature } = await provider.signAndSendTransaction(transaction);
      submittedSignature = signature;
      setLastSignature(signature);
      setStatus("Confirmando na Solana devnet...");
      try {
        await connection.confirmTransaction(
          {
            signature,
            blockhash: latest.blockhash,
            lastValidBlockHeight: latest.lastValidBlockHeight,
          },
          "confirmed",
        );
      } catch {
        // A carteira pode transmitir por outro RPC. O backend abaixo consulta o
        // histórico da devnet antes de considerar a transação pendente.
      }

      const isValidated = await waitForBackendValidation(signature);

      const entry: MuralMessage = {
        text: cleanMessage,
        wallet: shortAddress(wallet),
        signature,
        createdAt: "Agora mesmo",
      };
      const saved = [entry, ...messages.filter((item) => item.signature)].slice(0, 8);
      window.localStorage.setItem("solana-tdc-mural", JSON.stringify(saved));
      setMessages([entry, ...messages]);
      setMessage("");
      setStatus(
        isValidated
          ? "Mensagem confirmada on-chain!"
          : "Transação enviada! A confirmação ainda está propagando.",
      );
    } catch (error) {
      setStatus(
        error instanceof Error && error.message.includes("User rejected")
          ? "Transação cancelada"
          : submittedSignature
            ? "Transação enviada. Abra o comprovante para verificar."
            : "Não foi possível enviar. Verifique seu SOL de devnet.",
      );
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#" aria-label="Solana TDC Mural — início">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
          </span>
          <span>SOLANA TDC MURAL</span>
        </a>
        <a className="how" href="#como-funciona">
          <span>›</span> Como funciona
        </a>
        <div className="top-actions">
          <span className="network-pill"><i /> DEVNET</span>
          <button className="wallet-button" onClick={connectWallet}>
            <span aria-hidden="true">▣</span>
            {wallet ? shortAddress(wallet) : "Conectar carteira"}
          </button>
        </div>
      </header>

      <section className="workspace">
        <div className="composer-column">
          <p className="eyebrow">MURAL ON-CHAIN • TDC FLORIPA 2026</p>
          <h1>Deixe sua mensagem na Solana<span>.</span></h1>
          <p className="subtitle">
            Publique uma mensagem permanente na devnet e acompanhe tudo pelo Explorer.
          </p>

          <section className="panel composer" id="como-funciona">
            <div className="steps" aria-label="Etapas da publicação">
              <div className={wallet ? "done" : "active"}><b>01</b><span>CONECTE</span></div>
              <div className={wallet ? "active" : ""}><b>02</b><span>ESCREVA</span></div>
              <div className={lastSignature ? "done" : ""}><b>03</b><span>PUBLIQUE</span></div>
            </div>

            <div className="connect-row">
              <span className="wallet-icon" aria-hidden="true">▣</span>
              <div>
                <strong>{wallet ? "Carteira conectada" : "Conectar carteira"}</strong>
                <p>{wallet ? shortAddress(wallet) : "Conecte sua carteira para publicar na devnet."}</p>
              </div>
              <button className="wallet-button compact" onClick={connectWallet}>
                {wallet ? "Conectada ✓" : "Conectar carteira"}
              </button>
            </div>

            <label htmlFor="message">Sua mensagem</label>
            <div className="textarea-wrap">
              <textarea
                id="message"
                maxLength={MAX_MESSAGE}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Escreva algo para a comunidade..."
                disabled={!wallet || isPublishing}
              />
              <span>{message.length} / {MAX_MESSAGE}</span>
            </div>

            <div className="publish-row">
              <div className="fee">
                <span aria-hidden="true">≋</span>
                <span>Taxa estimada: <b>&lt; 0,001 SOL</b></span>
              </div>
              <button
                className="publish-button"
                onClick={publishMessage}
                disabled={!wallet || !message.trim() || isPublishing}
              >
                <span aria-hidden="true">⇧</span>
                {isPublishing ? "Publicando..." : "Publicar on-chain"}
              </button>
            </div>
            <div className="status-line" role="status">
              <span className={status.includes("confirmada") ? "success-dot" : ""} />
              {status}
              {lastSignature && (
                <a
                  href={`https://explorer.solana.com/tx/${lastSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver comprovante ↗
                </a>
              )}
            </div>
            {!provider && status === "Carteira não detectada neste navegador" && (
              <div className="wallet-help">
                <strong>A Phantom está instalada como extensão?</strong>
                <p>
                  Abra este site diretamente no Chrome ou Edge em que a extensão
                  foi instalada, desbloqueie a Phantom e recarregue a página.
                  Navegadores internos de aplicativos não carregam extensões.
                </p>
                <a
                  href="https://phantom.com/download"
                  target="_blank"
                  rel="noreferrer"
                >
                  Conferir extensão oficial ↗
                </a>
              </div>
            )}
          </section>
        </div>

        <aside className="panel feed">
          <div className="feed-heading">
            <h2>TRANSAÇÕES RECENTES</h2>
            <span aria-hidden="true">⌗</span>
          </div>
          <div className="message-list">
            {messages.slice(0, 3).map((item, index) => (
              <article key={`${item.signature}-${index}`} className="message-card">
                <span className="message-icon" aria-hidden="true">▢</span>
                <div>
                  <h3>{item.text}</h3>
                  <p className="wallet-meta">{item.wallet} <b>◆</b></p>
                  <p className="time">{item.createdAt}</p>
                </div>
                <div className="verified">
                  <span>VERIFICADO ●</span>
                  {item.signature ? (
                    <a
                      href={`https://explorer.solana.com/tx/${item.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver no Explorer ↗
                    </a>
                  ) : (
                    <span className="demo-label">EXEMPLO</span>
                  )}
                </div>
              </article>
            ))}
          </div>
          <a className="all-transactions" href="https://explorer.solana.com/?cluster=devnet" target="_blank" rel="noreferrer">
            Abrir Solana Explorer <span>›</span>
          </a>
        </aside>
      </section>

      <footer className="telemetry">
        <div><span className="telemetry-icon">▥</span><p>Rede operacional<b>Solana Devnet</b></p></div>
        <div><span className="telemetry-icon">‹›</span><p>Programa: Memo<b>MemoSq4g...fcHr</b></p></div>
        <div><span className="telemetry-icon">◇</span><p>Interação<b>100% on-chain</b></p></div>
        <div><span className="telemetry-icon">◷</span><p>Confirmação<b>Explorer verificável</b></p></div>
        <div className="connected"><i /> Conectado</div>
      </footer>
    </main>
  );
}
