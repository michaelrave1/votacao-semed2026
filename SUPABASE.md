# Configuracao do Supabase

A aplicacao usa uma linha da tabela `public.urna_state` para sincronizar cadastros, sessoes e votos em tempo real.

## Ativacao

1. Crie um projeto no Supabase.
2. Abra `SQL Editor > New query`, cole o conteudo de `supabase.sql` e execute.
3. Em `Project Settings > API`, copie a URL do projeto e a chave publica (`publishable` ou a chave legada `anon`).
4. Preencha esses dois valores em `supabase-config.js`.
5. Sirva a aplicacao por HTTP(S). Abrir `index.html` diretamente pelo protocolo `file://` nao e suportado.

Sempre que `supabase.sql` receber novas funcoes, execute novamente o arquivo completo no SQL Editor. O script e idempotente e atualiza as funcoes existentes sem apagar dados.

Nunca coloque a chave `service_role` ou uma chave secreta no frontend.

## Concorrencia e tempo real

As gravacoes usam a funcao `compare_and_set_urna_state`, que so aceita a versao mais recente da linha. Se duas urnas gravarem juntas, o cliente recarrega o estado e repete a operacao, evitando sobrescrever um voto concorrente. O script tambem adiciona a tabela a publicacao `supabase_realtime`.

A aba administrativa `Limpar votacao` chama a funcao protegida `reset_urna_voting_data`. Ela remove votos, sessoes, tokens e liberacoes, mas preserva unidades, acessos e chapas.

## Seguranca

O modelo atual preserva o comportamento anterior: o login da aplicacao continua armazenado nos dados da urna, e a chave publica consegue chamar as funcoes de gravacao. Isso e adequado apenas para homologacao/prototipo. Antes de uma eleicao real, migre os usuarios para Supabase Auth e restrinja as funcoes a perfis autenticados com politicas RLS apropriadas.
