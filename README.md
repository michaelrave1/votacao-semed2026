# Urna Escolar

Aplicação web estática para simular uma votação escolar com login de mesário, geração de token por sessão e urna filtrada pela unidade escolar, com operação simultânea em duas abas.

## Como usar

1. Abra o arquivo `index.html` em um navegador.
2. Entre com um dos acessos de demonstração:
   - Administrador: `admin@urna.local` / `admin123`
   - Mesário: `mesario01@urna.local` / `123456`
3. No acesso do mesário, abra a aba fixa da urna da unidade.
4. Ainda na tela do mesário:
   - selecione o perfil do votante
   - gere o token
   - libere a urna
5. A aba `urna.html` recebe a liberação automaticamente, realiza a votação e volta sozinha para o modo de espera ao final.

## Fluxo implementado

1. Login do mesário
2. Abertura da aba fixa da urna da unidade
3. Seleção do perfil do votante + geração/liberação do token
4. Urna eletrônica em aba separada
5. Retorno automático da urna para o modo de espera

## O que já está implementado

- Login separado para administrador e mesários.
- Mesário vinculado a uma unidade escolar.
- Lista inicial com todas as unidades escolares informadas.
- Filtro de chapas por unidade escolar do mesário logado.
- Geração de token por sessão de votação.
- Urna em aba separada, aguardando liberação do mesário.
- Urna com número de 3 dígitos, `BRANCO`, `CORRIGE` e `CONFIRMA`.
- Registro de votos válidos, nulos e em branco.
- Área administrativa com:
  - gestão de acessos
  - cadastro de chapas
  - monitoramento de tokens gerados
  - painel de resultados

## Persistência

Os dados são salvos no `localStorage` do navegador. Isso significa que:

- os dados ficam vinculados ao navegador usado no teste
- limpar o armazenamento local reinicia a base
- esta versão é ideal como protótipo funcional local

## Próximo passo recomendado

Conectar a interface a um backend e banco de dados reais para autenticação segura, persistência centralizada e auditoria formal das votações.
