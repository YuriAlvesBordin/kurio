| Página | Dispositivo | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| inicio | mobile | 61 | 100 | 100 | 92 | 4152 ms | 0.000 | 741 ms |
| inicio | desktop | 98 | 97 | 100 | 92 | 893 ms | 0.000 | 69 ms |
| detalhe | mobile | 66 | 100 | 100 | 92 | 4278 ms | 0.000 | 451 ms |
| detalhe | desktop | 98 | 100 | 100 | 92 | 1022 ms | 0.000 | 50 ms |

## Ambiente e condições de execução

- Lighthouse 12.8.2 (axe-core 4.14.0), Chrome/158.0.0.0 headless, Node v26.13.1
- Sistema: Linux 6.17.0-35-generic x64, 4x Intel(R) Core(TM) i5-2410M CPU @ 2.30GHz, 8 GB de RAM, benchmarkIndex 957
- Alvo: build de produção (npm run build) servido por vite preview em 127.0.0.1, cenário padrão dos mocks, sem simplificações de imagem, fonte ou funcionalidade
- Throttling simulate: mobile com RTT 150 ms, 1638 kbps e CPU 4x mais lenta, desktop com o perfil padrão do Lighthouse
- 3 medições por página e perfil, mediana por categoria. Medido em 2026-11-13T23:16:46.020Z
- Metas: performance >= 90, accessibility >= 95, best-practices >= 95, seo >= 90
