# Correcoes da auditoria da demonstracao

Escopo: frontend demonstrativo do PR #16. Sem merge, deploy ou alteracoes no backend.

| Auditoria | Correcao | Regressao |
|---|---|---|
| QA-01 / QA-08 | Alias de responsavel sincronizado, validado e decorado com nome/ID do usuario. | Edicao, reload, filtros e carteira por consultor. |
| QA-02 | Atividades sem lead podem ser criadas, editadas, concluidas, canceladas e removidas. Retornos continuam exigindo lead. | Ciclo de vida, vinculo invalido e persistencia. |
| QA-03 | Perda cancela apenas retornos pendentes, preserva reunioes e registra historico. | Perda real pela UI e transacao atomica. |
| QA-04 | Clientes usa ultimo contato como campo padrao do intervalo; CRM preserva criacao. | Atendimento de hoje em cliente antigo. |
| QA-05 | Tres paineis usam datas personalizadas, consultam ambos os periodos e mostram comparacao explicita. | Um intervalo, dois intervalos, valores e responsavel. |
| QA-06 | Filtro e resposta usam a mesma regra de temperatura da interface. | Dois avancos recentes, resumo e contagem. |
| QA-07 | Criacao manual preenche origem e tipo de origem. | Criacao pela tela e filtro Manual. |
| QA-09 | Campos opcionais vazios sao enviados explicitamente apenas na demo; contrato operacional preservado. | Limpeza de email e reload. |
| QA-10 | Preferencias da demo isoladas em wms-demo:preferences:v1, removidas no reset sem apagar preferencias reais. | Reset e sentinelas de sessao/filtro de producao. |
| QA-11 | Busca da agenda respeita ID e limite; ID inexistente retorna vazio. | Contrato e limites. |
| QA-12 | Recuo do cabecalho usa o padding efetivo da demo, sem ocultar controles com overflow global. | Largura de documento em 390, 768, 1366 e 1920 px. |

Comandos:

```
npm run typecheck
npm run test:feedback
npm run test:demo
npm run build
npm run build:demo
npm run package:demo
npm run test:demo:browser
npm run test:demo:audit
```

A auditoria consolidada esta em tests/demo/audit_regression.py e roda contra o
build compilado, com MSW real e navegador Chromium. Gera capturas e report.json
em audit-results/regression. Cenarios negativos deliberados (quota indisponivel,
dados corrompidos e falha do service worker) sao separados dos caminhos validos.

Limites: nao certifica Safari/Firefox, aparelho fisico do apresentador ou areas
fora do escopo da demo. Alertas npm existentes nao foram corrigidos por esta
mudanca. Um teste aprovado nao equivale a uma auditoria completa de seguranca.
