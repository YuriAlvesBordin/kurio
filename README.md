# KURIO, marketplace de NFTs

Implementação do desafio frontend "Marketplace de NFTs" seguindo o design do Figma. Todo o back-end é simulado na camada de rede com MSW, incluindo o tempo real via Socket.IO, então o projeto roda sem nenhum servidor.

## Stack

React 19, TypeScript, TanStack Router (rotas, search params e proteção de rotas privadas), TanStack Query, Axios (todo o REST), Socket.IO client (tempo real), Tailwind, componentes no estilo shadcn/ui sobre Radix, MSW com `@mswjs/socket.io-binding`, Playwright (E2E e regressão visual) e Lighthouse.

## Como rodar

Requisitos: Node 22 ou superior e npm.

```
npm install
npm run dev:mocks
```

A aplicação abre em `http://127.0.0.1:5173`. O arquivo `.env` já traz `VITE_ENABLE_MOCKS=true`, então o `npm run dev` comum também usa os mocks.

### Variáveis de ambiente

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | Liga a camada MSW. Sem ela as chamadas vão para `VITE_API_URL` |
| `VITE_API_URL` | `/api` | Base de todas as chamadas REST |
| `VITE_HTTP_TIMEOUT_MS` | `8000` | Timeout do Axios |
| `VITE_DEFAULT_SCENARIO` | `default` | Cenário inicial dos mocks |
| `VITE_MOCK_LATENCY_SCALE` | `1` | Multiplicador da latência simulada (usado pelo modo E2E) |
| `VITE_MOCK_ORDER_SETTLE_MS` | `1800` | Tempo até um pedido pendente ser liquidado |
| `VITE_MOCK_ORDER_HANG_MS` | `15000` | Tempo de espera do cenário de timeout após criar pedido |

O modo `e2e` usa `.env.e2e`, com timeouts e latências menores para a suíte ficar rápida.

### Credenciais fictícias

| Usuário | E-mail | Senha |
| --- | --- | --- |
| Ana | `ana@kurio.test` | `Kurio@123` |
| Bruno | `bruno@kurio.test` | `Kurio@456` |

Cupons de teste: `KURIO10` (10%), `WELCOME5` (5%) e `VELHO20` (expirado). As senhas nunca ficam em texto puro, o mock guarda apenas o hash SHA-256 com sal.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev:mocks` | Servidor de desenvolvimento com mocks |
| `npm run build` | Typecheck e build de produção em `dist` |
| `npm run preview` | Serve o build em `http://127.0.0.1:4173` |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | ESLint e verificação de estilo do projeto (sem comentários inline, sem travessões, sem ponto e vírgula em texto) |
| `npm run test:e2e` | Suíte Playwright em Chromium, desktop e mobile |
| `npm run test:e2e:update` | Regenera os baselines de regressão visual |
| `npm run test:e2e:report` | Abre o relatório HTML |
| `npm run lighthouse` | Roda o Lighthouse (veja abaixo) |

Se o Playwright não achar o navegador no ambiente, aponte para um Chrome instalado com `PLAYWRIGHT_CHROME_PATH=/usr/bin/google-chrome`.

## Cenários e reset

Os cenários são determinísticos e reproduzíveis. Existem três formas de escolher um:

1. Pela URL: `http://127.0.0.1:5173/?scenario=slow`. O valor fica salvo e vale nas próximas navegações e recargas.
2. Pelo console do navegador: `window.__kurioMock.setScenario('offline')`.
3. Pela variável `VITE_DEFAULT_SCENARIO` no build.

O estado dos mocks (usuários, carrinhos, favoritos, carteiras e pedidos) persiste em `localStorage` na chave `kurio.mock.db` e o cenário ativo em `kurio.mock.scenario`. Para voltar ao estado inicial use `await window.__kurioMock.reset()` ou limpe o armazenamento do site.

| Cenário | Efeito |
| --- | --- |
| `default` | Sucesso com latência baixa e determinística |
| `empty` | Catálogo vazio |
| `slow` | Respostas em cerca de 2 s |
| `jitter` | Latência entre 50 ms e 1,5 s, com respostas fora de ordem |
| `offline` | Toda chamada REST falha por erro de rede |
| `server-errors` | As três primeiras consultas ao catálogo falham com 503 |
| `session-expired` | A sessão expira após três chamadas autenticadas |
| `unauthorized` | A atualização de perfil responde 403 |
| `register-conflict` | O cadastro responde 409 com campos em conflito |
| `coupon-invalid` | Todo cupom é recusado como inválido |
| `coupon-expired` | Todo cupom é recusado como expirado |
| `price-change` | O preço do primeiro item sobe durante a compra |
| `sold-out` | A edição do primeiro item esgota durante a compra |
| `order-timeout` | O pedido é criado mas a primeira resposta nunca chega |
| `order-rejected` | O pedido é criado e depois recusado |
| `wallet-rejected` | A conexão da carteira é recusada |

O objeto `window.__kurioMock` também expõe controles para reproduzir falhas de tempo real e liquidação: `updateNft`, `replayLastEvent`, `emitStaleNftEvent`, `settleOrder`, `setManualSettlement`, `dropConnections`, `blockConnections`, `expireSessions` e `peerCount`.

### Reproduzindo falhas

| Falha | Como reproduzir |
| --- | --- |
| Respostas fora de ordem no catálogo | `?scenario=jitter` e digite rápido na busca |
| Erro 5xx com retentativa | `?scenario=server-errors` e abra o catálogo |
| Sem conexão | `?scenario=offline`, depois `?scenario=default` e use "Tentar novamente" |
| Sessão expirada no meio do checkout | `?scenario=session-expired`, entre e navegue até o pagamento |
| Preço mudou ou esgotou | `?scenario=price-change` ou `?scenario=sold-out` e confirme a compra |
| Timeout após criar pedido | `?scenario=order-timeout`, confirme a compra e tente de novo. A mesma chave de idempotência recupera o mesmo pedido |
| Pagamento recusado | `?scenario=order-rejected` |
| Queda do socket | `window.__kurioMock.blockConnections(true)`, altere um preço com `updateNft` e depois `blockConnections(false)` |

## Testes E2E

São 12 áreas em `e2e/`: autenticação e sessão, catálogo e URL, resiliência do catálogo, detalhe do NFT, favoritos, carrinho, checkout, cenários de checkout, tempo real, expiração de sessão, carteiras e avatar, e responsividade com acessibilidade. Todas rodam em Chromium nos projetos `desktop` (1440) e `mobile` (390).

A regressão visual (`e2e/visual.spec.ts`) cobre Início, Detalhe, Carrinho e Pagamento nos dois viewports, com baselines em `e2e/__screenshots__`. O relatório HTML da última execução está versionado em `playwright-report` e o Playwright grava os traces das falhas em `test-results` (`retain-on-failure`). Os cenários sensíveis a tempo usam o relógio controlado do Playwright (`page.clock`), como o teste de pedido pendente em `e2e/checkout-scenarios.spec.ts`.

```
npm run test:e2e
npm run test:e2e:report
```

## Lighthouse

```
npm run build
npm run lighthouse
```

O script `scripts/lighthouse.mjs` sobe o `vite preview`, roda 3 auditorias por página (Início e Detalhe) e por dispositivo (mobile e desktop), calcula a mediana e grava os relatórios HTML e JSON em `reports/lighthouse`, além de `summary.md` e `summary.json`. A configuração versionada está em `lighthouse/config.json`. Defina `CHROME_PATH` se o Chrome não estiver em `/usr/bin/google-chrome`.

Medianas da última execução (Lighthouse 12.8.2, Chrome 153 headless, throttling simulado padrão). O ambiente completo, as versões e as condições da medição estão em `reports/lighthouse/summary.md`.

| Página | Dispositivo | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | mobile | 61 | 100 | 100 | 92 | 4152 ms | 0 | 741 ms |
| Início | desktop | 98 | 97 | 100 | 92 | 893 ms | 0 | 69 ms |
| Detalhe | mobile | 66 | 100 | 100 | 92 | 4278 ms | 0 | 451 ms |
| Detalhe | desktop | 98 | 100 | 100 | 92 | 1022 ms | 0 | 50 ms |

Todas as metas foram atingidas, exceto a Performance no mobile, que ficou abaixo de 90. O motivo é o JavaScript do caminho crítico: o bundle do app soma cerca de 185 kB gzip e o MSW roda no navegador e soma cerca de 54 kB gzip (eram 110 kB antes de trocar o cookie jar do MSW por um módulo mínimo, veja `ARCHITECTURE.md`), e o Lighthouse mobile avalia com CPU 4 vezes mais lenta. Isso eleva o TBT (450 a 740 ms) e atrasa o LCP (cerca de 4 s). Um perfil de CPU com throttling 4x mostrou o custo espalhado entre o app, o MSW e o TanStack, sem um ponto quente único. O CLS é zero. As mitigações já aplicadas foram: rotas em chunks separados, Socket.IO e o diálogo de autenticação carregados sob demanda, carregamento do MSW em paralelo ao app (as requisições esperam um portão de rede), preload do módulo de mocks e skeletons com altura estável. Uma API real dispensaria o MSW e eliminaria essa diferença, mas a auditoria usa o cenário padrão dos mocks, sem simplificações. Os números variam com a carga da máquina (esta é uma CPU antiga de 4 núcleos): execuções anteriores do mobile variaram entre 58 e 70, e execuções sobrepostas a outros processos chegam a resultados inválidos, por isso a auditoria deve rodar com a máquina ociosa.

## Deploy

O projeto é uma SPA estática. Os arquivos `vercel.json`, `netlify.toml` e `public/_redirects` já trazem o fallback de rotas para `index.html` e o cache dos assets. Em qualquer uma das plataformas basta importar o repositório com o comando de build `npm run build` e o diretório de saída `dist`. O `.env` versionado (sem segredos, igual ao `.env.example`) mantém `VITE_ENABLE_MOCKS=true`, então o site publicado funciona sem back-end.

URL pública: https://kurio-woad.vercel.app (Vercel, com mocks e tempo real via Socket.IO ativos, acesso direto e refresh de rotas funcionando).

## Estrutura

```
src/
  api/         cliente Axios, contratos zod, chaves de cache, erros e portão de rede
  components/  layout, UI base (shadcn/ui), cartões de NFT e componentes compartilhados
  features/    auth, catalog, detail, cart, checkout, account
  hooks/       hooks do TanStack Query
  mocks/       MSW: handlers REST, banco persistente, cenários, tempo real
  realtime/    controlador do Socket.IO
  routes/      rotas, guarda de rotas privadas e validação dos search params
e2e/           testes Playwright e baselines visuais
scripts/       lighthouse.mjs e check-style.mjs
```

Veja `ARCHITECTURE.md` para contratos, sessão, carrinho, cache, sincronização e limitações.
