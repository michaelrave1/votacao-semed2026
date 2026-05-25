# Configuracao do Firebase

## Cloud Firestore

A aplicacao usa o Cloud Firestore para sincronizar a votacao em tempo real.

Os dados agora ficam separados em dois documentos:

```text
urnaState/chapas
urnaState/votacao
```

O documento `urnaState/chapas` guarda os dados de configuracao, unidades, acessos e chapas. O documento `urnaState/votacao` guarda sessoes, liberacoes e votos.

O caminho antigo `urnaState/current` pode continuar existindo apenas para leitura e migracao inicial. A aplicacao nao grava mais nele.

Publique as regras abaixo em:

```text
Firebase Console > Firestore Database > Rules
```

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /urnaState/chapas {
      allow read, write: if true;
    }

    match /urnaState/votacao {
      allow read, write: if true;
    }

    match /urnaState/current {
      allow read: if true;
      allow write: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Essas regras liberam apenas os documentos usados pela aplicacao e bloqueiam todo o restante do banco.

Observacao: o login atual e controlado pela propria aplicacao, nao pelo Firebase Auth. Por isso, neste modelo, o Firestore precisa permitir leitura e escrita nos documentos `urnaState/chapas` e `urnaState/votacao` para que mesarios e administradores consigam sincronizar os dados.
