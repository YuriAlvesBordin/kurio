| Página | Dispositivo | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| inicio | mobile | 62 | 100 | 100 | 92 | 4107 ms | 0.000 | 731 ms |
| inicio | desktop | 98 | 97 | 100 | 92 | 902 ms | 0.000 | 98 ms |
| detalhe | mobile | 66 | 100 | 100 | 92 | 4261 ms | 0.000 | 482 ms |
| detalhe | desktop | 98 | 100 | 100 | 92 | 997 ms | 0.000 | 46 ms |

## Ambiente e condições de execução

- Lighthouse 12.8.2 (axe-core 4.14.0), Chrome/158.0.0.0 headless, Node v26.13.1
- Sistema: Linux 6.17.0-35-generic x64, 4x Intel(R) Core(TM) i5-2410M CPU @ 2.30GHz, 8 GB de RAM, benchmarkIndex 972
- Alvo: build de produção (npm run build) servido por vite preview em 127.0.0.1, cenário padrão dos mocks, sem simplificações de imagem, fonte ou funcionalidade
- Throttling simulate: mobile com RTT 150 ms, 1638 kbps e CPU 4x mais lenta, desktop com o perfil padrão do Lighthouse
- 3 medições por página e perfil, mediana por categoria. Medido em 2026-11-13T22:48:31.095Z
- Metas: performance >= 90, accessibility >= 95, best-practices >= 95, seo >= 90
