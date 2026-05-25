# Configuração do Firebase

## Cloud Firestore

A aplicação usa o Cloud Firestore para sincronizar a votação em tempo real.

O caminho usado pela aplicação é:

```text
urnaState/current
```

Publique as regras abaixo em:

```text
Firebase Console > Firestore Database > Rules
```

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /urnaState/current {
      allow read, write: if true;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Essas regras liberam apenas o documento usado pela aplicação e bloqueiam todo o restante do banco.

Observação: o login atual é controlado pela própria aplicação, não pelo Firebase Auth. Por isso, neste modelo, o Firestore precisa permitir leitura e escrita nesse documento para que mesários e administradores consigam sincronizar os dados.
