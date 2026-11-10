# Origem e isolamento

Origem: `codi-solutionss/wms-crm.frontend`, branch `feat/demo-frontend`.
Referência funcional corrigida: `327b7804a2b522397aaea1690ec1199b8ab4d685`.

A separação preserva as doze correções da auditoria e o comportamento de Aplicar/Cancelar nos filtros de data. Os ajustes próprios deste repositório tratam entrada exclusiva da demo, caminhos, armazenamento, service worker e testes para hospedagem estática.

Não há dependência de execução no repositório original ou em seu backend. Não foram mantidos arquivos de ambiente, infraestrutura de produção ou módulos sem dependência na demo e em seus testes. Alguns componentes compartilhados continuam presentes como dependências, mas não liberam módulos fora do escopo.

Os repositórios operacionais não foram modificados pela separação. O Pages publica somente os arquivos estáticos compilados. O workflow permanente tem acesso de leitura ao código; o job de publicação recebe apenas as permissões necessárias para Pages e identidade OIDC. Não grava commits nem altera a visibilidade do repositório.

## Repositório pessoal

Destino: `tiagodevss/teste-crm`. Snapshot importado de `codi-solutionss/teste-crm` no commit `85ea32bb0ed371d984d428c418fc80f8980cab46`, sem o histórico Git privado. A migração altera apenas os endereços de hospedagem e a documentação; a aplicação e seus contratos são preservados. Os repositórios de origem não são modificados.
