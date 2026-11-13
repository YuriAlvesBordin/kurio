# Arquitetura

Este documento descreve os contratos REST e de tempo real, a sessão, o carrinho, o checkout, a política de cache, a reconciliação entre REST e Socket.IO, as limitações conhecidas e os desvios em relação ao Figma.

## Visão geral

A aplicação é uma SPA em React. Toda a comunicação passa por duas portas: o cliente Axios (`src/api/http.ts`) para REST e o `socket.io-client` (`src/realtime/controller.ts`) para eventos. Nenhum componente chama `fetch` ou escreve direto no cache do TanStack Query a partir de um evento simulado.

O back-end não existe. O MSW intercepta as requisições HTTP e a conexão WebSocket no próprio navegador (`src/mocks`). A UI não sabe que há um mock: ela fala com `/api` e com `/realtime/`, e o MSW responde com um banco persistente em `localStorage`. Trocar o mock por uma API real exige apenas desligar `VITE_ENABLE_MOCKS`.

Ordem de inicialização: o módulo de mocks começa a carregar em paralelo ao bundle do app. Enquanto o worker não está pronto, as requisições Axios aguardam o portão de rede (`src/api/gate.ts`) e o `socket.io-client` só é importado depois que o portão abre, porque o MSW precisa ter instrumentado o `WebSocket` antes da primeira conexão.

## Contratos REST

Todos os corpos são JSON e todas as respostas são validadas com zod (`src/api/contracts.ts`) antes de chegarem à UI. Erros seguem o formato `{ code, message, fields?, quote? }` e viram `ClientError` com a flag `retryable`.

| Método e rota | Auth | Descrição |
| --- | --- | --- |
| `GET /nfts` | não | Catálogo. Parâmetros `q`, `collections`, `networks`, `min`, `max`, `sort`, `tab`, `page`. Responde itens, facetas, total e páginas |
| `GET /nfts/:id` | não | Detalhe com galeria, edições, estoque, preço e `version` |
| `POST /auth/register` | não | Cria conta. 409 com `fields` em caso de conflito |
| `POST /auth/login` | não | Devolve `{ token, user }`. 401 em credenciais inválidas |
| `POST /auth/logout` | token | Invalida o token |
| `GET /session` | sim | Recupera o usuário a partir do token. 401 se expirou |
| `PATCH /profile` | sim | Edita dados do perfil |
| `POST /profile/password` | sim | Troca a senha exigindo a atual |
| `PUT /profile/avatar` | sim | Define ou remove o avatar |
| `GET /favorites`, `PUT` e `DELETE /favorites/:nftId` | sim | Favoritos por usuário |
| `GET /cart` | opcional | Carrinho do usuário ou do convidado (`X-Guest-Id`) |
| `POST /cart/items` | opcional | Adiciona item `{ nftId, editionId, quantity }` |
| `PATCH` e `DELETE /cart/items/:itemId` | opcional | Altera a quantidade ou remove |
| `POST` e `DELETE /cart/coupon` | opcional | Aplica ou remove cupom. 422 para inválido e 410 para expirado |
| `POST /cart/merge` | sim | Mescla o carrinho do convidado no do usuário após o login |
| `GET /cart/quote` | opcional | Cotação com `subtotalEth`, `discountEth`, `networkFeeEth`, `totalEth`, `revision` e `issues` |
| `GET /wallets`, `PUT /wallets/:slot`, `DELETE /wallets/secondary` | sim | Carteiras principal e secundária |
| `GET`, `POST` e `DELETE /wallet-connection` | sim | Conexão simulada com MetaMask, WalletConnect ou Coinbase |
| `POST /orders` | sim | Cria pedido. Exige o cabeçalho `Idempotency-Key` |
| `GET /orders` e `GET /orders/:id` | sim | Lista e detalhe. Um pedido de outro usuário responde 404 |

Valores em ETH são sempre strings decimais, e a aritmética usa inteiros em unidades mínimas (`src/lib/eth.ts`), sem `number` de ponto flutuante. Quantidades são inteiros.

### Idempotência na criação de pedido

`POST /orders` recebe `Idempotency-Key`. O servidor guarda `usuário + chave` junto com uma impressão digital do corpo.

- Mesma chave e mesmo conteúdo: devolve o pedido já criado com status 200, sem criar outro.
- Mesma chave e conteúdo diferente: responde 409 `IDEMPOTENCY_KEY_REUSED`.
- Chave ausente: 422.

No cliente, a chave fica em `sessionStorage` por usuário e é derivada da impressão digital do payload (`src/features/checkout/idempotency.ts`). Se a resposta se perdeu por timeout ou queda de rede, `retryWithSameKey` repete a chamada com a mesma chave e recupera o mesmo pedido. A chave só é descartada quando o pedido é criado com sucesso.

### Tempo real

O Socket.IO usa o caminho `/realtime/` e o transporte WebSocket. A autenticação vai em `auth: { token }` no handshake.

Eventos, ambos com a mesma forma:

```
{
  eventId: string,
  type: 'nft.updated' | 'order.updated',
  resource: { type: 'nft' | 'order', id: string },
  version: number,
  occurredAt: string,
  payload: { ... }
}
```

- `nft.updated`: `priceEth`, `compareAtPriceEth` e a disponibilidade por edição. É transmitido para todos.
- `order.updated`: `status`, `txHash`, `rejectionReason` e `updatedAt`. É entregue só ao dono do pedido.

## Sessão

- O token fica em `localStorage` (`kurio.token`) e é anexado a toda requisição pelo interceptor do Axios. O estado da sessão está em `src/features/auth/authStore.ts`.
- Ao abrir o app, `bootstrap()` chama `GET /session`. Sem token a sessão é de convidado, com token válido o usuário é restaurado e com token expirado a sessão é encerrada.
- Senhas nunca são guardadas em texto puro. O mock salva `SHA-256(sal:senha)`.
- O modal de login é controlado pelos search params `auth`, `reason` e `redirect`, então abre sobre qualquer página e preserva o contexto.
- Rotas privadas (`/pagamento`, `/pedido/:id`, `/perfil`, `/perfil/carteiras`) passam por `beforeLoad` e por `RequireAuth`. Sem sessão o usuário vai para o modal de login com o destino em `redirect`.
- Expiração no meio da navegação ou do checkout: o interceptor de resposta detecta 401 e notifica o `authStore`. A raiz abre o modal com `reason=expired` na mesma rota, sem recarregar. O formulário do pagamento e o carrinho continuam intactos, e após entrar o usuário volta ao ponto onde estava.
- Logout ou troca de usuário: o cache privado (`['private', userId, ...]`) é removido, o controlador do socket é destruído e um novo é criado para a nova identidade. Nenhum dado de um usuário aparece para o outro.

## Carrinho

- O carrinho de convidado fica no servidor, identificado por `X-Guest-Id` (gerado e guardado em `localStorage`). Por isso sobrevive à recarga.
- No login, `POST /cart/merge` soma os itens do convidado ao carrinho do usuário, respeitando o estoque.
- Preço e estoque são sempre os atuais. Cada linha traz um `state` (`ok`, `sold_out` ou `insufficient`) e o resumo bloqueia o avanço enquanto houver linha inválida.
- A cotação (`/cart/quote`) é a única fonte dos totais. Ela inclui a taxa de rede e um `revision` que muda sempre que qualquer valor relevante muda.

## Checkout

1. Os dados do colecionador são validados com zod e salvos como rascunho por usuário, então sobrevivem à recarga.
2. A carteira é conectada (simulação com o provedor e a rede escolhidos). O pedido só é aceito com a conexão válida.
3. Ao confirmar, o cliente busca uma cotação nova. Se o `revision` difere do que o usuário aceitou, nada é enviado, a tela mostra o que mudou e exige "Aceitar novos valores".
4. O servidor revalida e responde 409 `QUOTE_STALE` com a cotação nova se algo mudou entre a busca e a criação.
5. O pedido nasce `pending` e é liquidado depois para `confirmed` ou `rejected`. A tela de confirmação só aparece para pedidos `confirmed`. Enquanto pendente, a tela de pedido acompanha o status e se recupera após recarga ou reconexão.
6. Em falha ou recusa os itens permanecem no carrinho. Em sucesso só os itens e quantidades comprados são removidos.
7. O recibo é um instantâneo imutável: guarda itens, preços e totais do momento da compra, e não muda mesmo que o catálogo mude depois.
8. A duplicidade de pedido é evitada pela chave de idempotência e pelo botão desabilitado durante o envio.

## Cache, retentativa e sincronização

| Item | Política |
| --- | --- |
| `staleTime` | 30 s |
| `gcTime` | 5 min |
| Retentativas | No máximo 2, com atraso exponencial de 300 ms a 3 s, somente para erros transitórios (rede, timeout e 5xx). Nunca para 4xx |
| Mutações | Sem retentativa automática. A criação de pedido repete manualmente com a mesma chave de idempotência |
| Foco da janela | Não refaz a busca |

Chaves: `['catalog', params]`, `['nft', id]`, `['cart', owner]` e `['private', userId, ...]` para tudo que é privado.

Catálogo: busca, filtros, ordenação e página vivem nos search params, validados em `src/routes/search.ts`. Parâmetros inválidos são ignorados. Mudar um filtro volta para a página 1. Cada consulta usa `AbortSignal`, e a chave da consulta inclui os parâmetros, então respostas antigas ou fora de ordem nunca sobrescrevem a visão mais nova.

Favoritos: atualização otimista com reversão. O coração muda na hora, e se a chamada falha o estado volta e o usuário é avisado. Os favoritos são por usuário.

### Reconciliação entre REST e Socket.IO

O `RealtimeController` aplica eventos ao cache e é a única parte que o faz.

- Validação: todo evento passa por zod, e o que for inválido é descartado.
- Duplicados: o `eventId` já visto é ignorado (janela com limite).
- Versões: por recurso, guarda-se a maior versão aplicada, e eventos com versão menor ou igual são ignorados.
- Reconexão: o cliente tenta reconectar com atraso de 300 ms a 2 s e tempo limite de conexão de 3 s. Ao reconectar, invalida catálogo, detalhes, carrinho e dados privados, porque eventos podem ter sido perdidos.
- Isolamento: um controlador por identidade. Ao trocar de usuário ou sair, `stop()` remove todos os ouvintes, fecha o socket e o próximo usuário nunca recebe eventos de pedido do anterior.
- Banner: durante a reconexão uma faixa avisa que os preços podem estar desatualizados.

## Mocks

- MSW só atua na camada de rede (`src/mocks`). Não há atalhos que alterem o cache ou emitam eventos direto na UI. Os eventos de tempo real saem do handler WebSocket do MSW (`@mswjs/socket.io-binding`) e chegam pelo `socket.io-client` real.
- O banco é persistente em `localStorage`, é consistente entre telas e pode ser zerado com `reset()`.
- Cenários configuráveis e reproduzíveis (latência com semente fixa, timeouts, offline, erros HTTP, expiração de sessão, conflitos, validação, cupom, mudança de preço, esgotamento, timeout após criar pedido, pagamento confirmado e recusado). Veja a tabela no README.
- Dois usuários fictícios com dados distintos (carteiras, favoritos e pedidos).

## Acessibilidade e assets

Ajustes de acessibilidade feitos em relação ao layout do Figma:

- Link "Ir para o conteúdo" no início da página, visível só com o foco, e landmarks `banner`, `navigation` e `main`.
- Anel de foco visível (`:focus-visible`) global em todos os controles.
- Diálogos (login, cadastro e zoom da galeria) usam Radix Dialog: foco preso, `Escape` fecha e o foco volta ao elemento que abriu. No mobile a navegação é uma barra inferior fixa, sem drawer.
- Todo campo de formulário tem `label` associado, `aria-invalid` e `aria-describedby` apontando para a mensagem de erro, inclusive para erros devolvidos pela API.
- Imagens de NFT têm texto alternativo com nome e token. Ícones decorativos usam `alt=""` e os ícones que são controles recebem `aria-label` no botão ou link.
- Feedback acessível: toasts do Sonner (região `aria-live`), `role="status"` para o estado do pedido pendente, disponibilidade no detalhe e faixa de reconexão, e `role="alert"` para pedido recusado e erros.
- Erros, esgotado e cotação alterada são comunicados por mensagem de texto, não apenas por cor.
- Skeletons usam shimmer com dimensões fixas para evitar deslocamento de layout e a animação é desligada com `prefers-reduced-motion`.
- O botão de diminuir quantidade fica desabilitado em 1 e os controles de quantidade têm nome acessível ("Aumentar quantidade" e "Diminuir quantidade").

Assets:

- As quatro ilustrações fornecidas (`ape-varsity`, `ape-hoodie`, `ape-blazer` e `ape-headphones`) são servidas localmente em WebP com 320, 640 e 1254 px via `srcset`. As demais fixtures reutilizam essas artes, porque o desafio fornece só quatro. Os ícones são SVGs locais em `public/assets/icons`.
- A fonte Roboto Mono Variable é empacotada pelo `@fontsource-variable/roboto-mono`, sem requisições a CDNs, então o app roda offline e o Lighthouse mede a fonte real.
- Não há assets externos: tudo o que a interface carrega vem do próprio repositório.

## Limitações conhecidas

- O jar de cookies do MSW (`tough-cookie` e sua lista de sufixos públicos, cerca de 150 kB de JavaScript) é substituído por um módulo mínimo em `src/mocks/shims/tough-cookie.ts`, configurado como alias no `vite.config.ts`. A aplicação autentica por cabeçalho `Authorization` e nenhum handler define cookies, então a camada de mocks não oferece suporte a cookies. A troca reduziu o JavaScript do caminho crítico em cerca de 56 kB gzip.
- A Performance no Lighthouse mobile fica abaixo da meta de 90 (veja o README e `reports/lighthouse/summary.md`). A causa é o JavaScript do caminho crítico, com o bundle do app e o MSW rodando no navegador sob CPU 4 vezes mais lenta, que eleva o TBT e o LCP. O desktop atinge todas as metas.
- O estado dos mocks vive no `localStorage` do navegador, então não é compartilhado entre dispositivos.
- O pagamento é simulado. Não há integração com carteiras ou blockchain.
- Provedores de login social, "Esqueceu a senha?", favoritos no menu móvel, escaneamento e menus de contexto fora do escopo mostram o aviso "Em breve" e não fingem sucesso.
- Os comentários dos avaliadores no Detalhe não existem. A aba mostra só a nota média.
- A suíte E2E depende de relógio e de CPU. Sob muita carga alguns testes de tempo real podem oscilar e passam quando rodados isoladamente.

## Desvios em relação ao Figma

O Figma foi seguido por medição direta das telas exportadas, com diferença de até 1 px na maioria das posições verticais. Os desvios conscientes são:

- A pergunta "Usar outra carteira?" do Pagamento não foi implementada, porque seria um controle sem efeito. A lista de provedores usa os três provedores reais do projeto (MetaMask, WalletConnect e Coinbase) em vez da faixa de chips do design.
- O Pagamento ganhou um botão "Conectar carteira", necessário para a conexão simulada, e o formulário do colecionador aparece abaixo da seleção de carteiras no mobile, já que o design mobile só mostra a seleção.
- A tela do carrinho ganhou o link "Continuar explorando" no desktop.
- As contagens das facetas, a ordem das fixtures e as artes dos NFTs seguem os dados do projeto, não os do design.
- As curvas laranja decorativas do fundo não foram reproduzidas.
- O botão de diminuir quantidade aparece desabilitado quando o valor é 1.
- O modal de login no desktop tem o fundo transparente, como no design. No mobile ele ocupa a tela inteira.
- A linha "Rede" do Detalhe foi omitida e os textos das abas seguem o design.
- No mobile, o Perfil, as Carteiras e a Confirmação não têm referência no Figma e foram adaptados a partir dos demais padrões.
