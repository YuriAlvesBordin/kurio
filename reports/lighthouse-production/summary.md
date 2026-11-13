| Página | Dispositivo | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| inicio | mobile | 72 | 100 | 100 | 92 | 3083 ms | 0.000 | 683 ms |
| inicio | desktop | 99 | 97 | 100 | 92 | 711 ms | 0.000 | 62 ms |
| detalhe | mobile | 69 | 100 | 100 | 92 | 3291 ms | 0.000 | 780 ms |
| detalhe | desktop | 99 | 100 | 100 | 92 | 743 ms | 0.000 | 34 ms |

## Ambiente e condições de execução

- Lighthouse 12.8.2 (axe-core 4.14.0), Chrome/158.0.0.0 headless, Node v26.13.1
- Sistema: Linux 6.17.0-35-generic x64, 4x Intel(R) Core(TM) i5-2410M CPU @ 2.30GHz, 8 GB de RAM, benchmarkIndex 1030
- Alvo: site publicado em https://kurio-woad.vercel.app (Vercel, Brotli e HTTP/2), cenário padrão dos mocks, sem simplificações de imagem, fonte ou funcionalidade
- Throttling simulate: mobile com RTT 150 ms, 1638 kbps e CPU 4x mais lenta, desktop com o perfil padrão do Lighthouse
- 3 medições por página e perfil, mediana por categoria. Medido em 2026-11-13T23:22:53.738Z
- Metas: performance >= 90, accessibility >= 95, best-practices >= 95, seo >= 90
