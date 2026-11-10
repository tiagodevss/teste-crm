# CRM WMS — demonstração independente

Versão exclusivamente frontend com dados fictícios para apresentações. Os comandos deste repositório executam somente a demo. Não existe configuração para selecionar o backend operacional.

## Desenvolvimento

Requer Node.js 22:

```sh
npm ci
npm run dev
```

Para apresentar um build local sem internet ou backend:

```sh
npm run build
npm run package:demo
node scripts/serve-demo.mjs
```

Abra `http://127.0.0.1:4174/#/login`. Não abra `index.html` diretamente. O pacote fica em `dist-demo/`; execute `INICIAR.cmd` ou `node serve.mjs` na pasta empacotada. O computador precisa ter Node.js instalado previamente. Use **Restaurar demo** para começar uma nova apresentação.

## Deploy automático no GitHub Pages

O workflow `.github/workflows/pages.yml` valida código, build e navegação antes de publicar. Somente pushes na `main` e execuções manuais na `main` fazem deploy. Pull requests apenas validam.

**Ativação inicial necessária:** em **Settings > Pages > Build and deployment**, selecione **Source: GitHub Actions**. Depois execute o workflow manualmente na `main`, ou envie um novo commit. O workflow não altera a visibilidade do repositório. Este repositório pessoal é público e pode usar o GitHub Pages no plano gratuito. A ativação inicial continua necessária.

Endereço previsto após ativação e deploy: `https://tiagodevss.github.io/teste-crm/`.

As rotas usam hash, por exemplo `/teste-crm/#/crm/contabilidade-demo`, para permitir abrir links e recarregar telas sem fallback do servidor. JavaScript, CSS, imagens, API simulada e service worker usam `/teste-crm/`. O worker controla somente esse caminho. A base e as preferências demonstrativas usam o namespace `teste-crm:`.

Para reproduzir a hospedagem localmente:

```sh
npm run build:pages
DEMO_BASE_PATH=/teste-crm/ node scripts/serve-demo.mjs
```

O servidor estático estrito não faz fallback de rotas. A demo exige HTTPS ou localhost para seu service worker. Não execute o build Pages como se estivesse hospedado na raiz `/`; use o comando anterior ou gere `npm run build` para o pacote local.

## Validação

```sh
npm run typecheck
npm test
npm run build:pages
python -m pip install playwright==1.57.0
python -m playwright install chromium
DEMO_BASE_PATH=/teste-crm/ npm run test:demo:browser
DEMO_BASE_PATH=/teste-crm/ npm run test:demo:audit
npm run test:pages
```

As suítes usam o build compilado, os componentes reais e o service worker real. Os testes de hospedagem verificam o prefixo, o escopo do worker, a atualização de rotas e o bloqueio de APIs externas. Relatórios e capturas são preservados nos artefatos do workflow. A publicação só usa `dist-demo`, não o código-fonte ou os testes.

## Escopo e cuidados

Inclui Indicadores Geral/Contabilidade/Financeira, CRM, oportunidades, atendimento, agenda, clientes e restauração do cenário. A Financeira é ilustrativa; não implementa a jornada especializada Crédito/Repasse. Módulos fora do roteiro não são liberados.

Não use dados pessoais, credenciais ou documentos reais. A demo não faz autenticação real, não envia mensagens e não sincroniza dados entre dispositivos. O código deste repositório e o site Pages são públicos. O aviso de dados fictícios permanece visível.

As vulnerabilidades herdadas das dependências não foram corrigidas por esta separação. Aprovação funcional não substitui auditoria de segurança.

## Origem

Extraído da demonstração corrigida de `codi-solutionss/wms-crm.frontend`, incluindo os ajustes da auditoria e do commit `327b7804a2b522397aaea1690ec1199b8ab4d685`. A separação não modifica nem publica nos repositórios operacionais. O histórico passa a ser independente; mudanças futuras não são sincronizadas automaticamente com o CRM original.
