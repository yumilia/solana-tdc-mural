# Solana TDC Mural

Mural full stack criado para o desafio da Superteam Brasil no TDC Floripa
2026. A aplicação conecta uma carteira compatível com Solana, grava mensagens
no Memo Program da Solana devnet e valida a confirmação da transação por uma
rota de backend.

## Funcionalidades

- Conexão com Phantom ou outra carteira que injete o provider Solana.
- Publicação de mensagens de até 280 caracteres no Memo Program.
- Confirmação da transação na Solana devnet.
- Validação server-side da assinatura via JSON-RPC.
- Link direto da transação para o Solana Explorer.
- Histórico local das mensagens publicadas no dispositivo.
- Interface responsiva e acessível.

## Tecnologias

- Next.js + React + TypeScript
- `@solana/web3.js`
- Solana Memo Program
- API route serverless
- Vercel / Next.js

## Executar localmente

Requisitos: Node.js 22.13 ou superior e uma carteira com SOL de devnet.

```bash
npm install
npm run dev
```

Abra a aplicação, conecte sua carteira em **Devnet**, escreva uma mensagem e
confirme a transação.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` se quiser usar um RPC próprio.

```env
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_RPC_URL=https://api.devnet.solana.com
```

`NEXT_PUBLIC_SOLANA_RPC_URL` é usado no navegador. `SOLANA_RPC_URL` é usado
pela rota `/api/validate` e pode apontar para um RPC privado.

## Como a interação on-chain funciona

1. A carteira assina uma transação contendo uma instrução para o Memo Program.
2. A transação é enviada e confirmada na devnet.
3. O backend consulta `getSignatureStatuses` para validar a assinatura.
4. A interface mostra o link público da transação no Explorer.

Memo Program:
`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`

## Testes

```bash
npm test
```

O build de produção é executado com `next build`. O fluxo on-chain deve ser testado com uma carteira configurada para a Solana devnet.

## Demonstração e evidência on-chain

- Aplicação publicada: [Solana TDC Mural](https://solana-tdc-mural.akimarcelo.chatgpt.site)
- Transação de demonstração na Solana Devnet: [ver no Explorer](https://explorer.solana.com/tx/4V9DxbPivLJyisZhfVqyffyY4ut1J7jixp5xdT26HD8HZV834itEQkT88wE1XmWhqFXuEP5r7zmNGLmHbvtj4K6c?cluster=devnet)

A transação usa o Memo Program e contém uma mensagem criada pelo app.

## Deploy na Vercel

1. Acesse [Vercel](https://vercel.com/new) e entre com a sua conta GitHub.
2. Importe o repositório `yumilia/solana-tdc-mural`.
3. Mantenha o framework como **Next.js** e clique em **Deploy**.
4. Após publicar, adicione a URL da Vercel neste README e na submissão.
