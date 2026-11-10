# Operação da demonstração

Este repositório executa exclusivamente o frontend demonstrativo. A configuração de hospedagem e os comandos completos estão no `README.md` da raiz.

## Pacote local para apresentação

Node.js 22 deve estar instalado. Gere `npm run build && npm run package:demo`, copie todos os arquivos de `dist-demo/` e execute `INICIAR.cmd` no Windows ou `node serve.mjs` no macOS/Linux. Abra `http://127.0.0.1:4174/#/login` e mantenha o terminal aberto. Não abra o HTML diretamente. O pacote local pronto não exige npm install, backend ou internet para apresentar.

## Roteiro

Entre em **Entrar na demonstração**, percorra os indicadores e abra **Oportunidade do roteiro**. Registre um atendimento, agende um retorno, conclua a atividade, converta a oportunidade e confira Clientes e Indicadores. O botão Roteiro mostra as etapas dentro da aplicação.

**Restaurar demo** apaga somente alterações e filtros demonstrativos deste navegador. Atualizar a página preserva os dados. Feche outras abas antes de restaurar. Os dados são fictícios e não são sincronizados entre dispositivos.

## GitHub Pages

O endereço previsto é `https://tiagodevss.github.io/teste-crm/`, após ativação inicial em **Settings > Pages > Source: GitHub Actions** e o primeiro deploy bem-sucedido. A publicação automática acontece somente pela `main`, depois dos testes.

O build do Pages utiliza `/teste-crm/`, com rotas `#/...`. O build local utiliza `/`. Não misture os dois pacotes. Para testar o build Pages localmente use `DEMO_BASE_PATH=/teste-crm/ node scripts/serve-demo.mjs` e abra `http://127.0.0.1:4174/teste-crm/`.

## Limites

Indicadores, CRM, Clientes e Atividades estão disponíveis. Crédito/Repasse especializados, portais, administração, prospecção e integrações reais não fazem parte desta versão. WhatsApp, e-mail e chamadas externas são bloqueados. Não informe dados reais. Pages pode tornar o site acessível publicamente mesmo com código em repositório privado.
